// api.js — the make.fun public API behind one ETag-revalidating cache.
//
// Every view asks for data through get(). Answers are kept in memory with
// their ETag; a repeat ask revalidates with If-None-Match and the API's
// tags are bound to the minute, so most revalidations come back 304 and
// cost no body at all. Simultaneous asks for the same path share one
// request. The shell's status bar listens through onStatus() and reports,
// in words, whether the last answer was live or served from cache.

const ORIGIN = 'https://make.fun';

const cache = new Map();    // path -> { etag, data, at }
const inflight = new Map(); // path -> Promise
const listeners = new Set();

export function onStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(state, path) {
  const event = { state, path, at: new Date() };
  for (const fn of listeners) fn(event);
}

export function peek(path) {
  const hit = cache.get(path);
  return hit ? hit.data : undefined;
}

async function request(path) {
  const prior = cache.get(path);
  const headers = {};
  if (prior && prior.etag) headers['If-None-Match'] = prior.etag;
  let res;
  try {
    res = await fetch(ORIGIN + path, { headers });
  } catch (err) {
    if (prior) {
      emit('cache', path);
      return { data: prior.data, fromCache: true };
    }
    emit('error', path);
    throw err;
  }
  if (res.status === 304 && prior) {
    prior.at = Date.now();
    emit('cache', path);
    return { data: prior.data, fromCache: true };
  }
  if (!res.ok) {
    if (prior) {
      emit('cache', path);
      return { data: prior.data, fromCache: true };
    }
    emit('error', path);
    throw new Error(`make.fun answered ${res.status} for ${path}`);
  }
  const data = await res.json();
  cache.set(path, { etag: res.headers.get('etag'), data, at: Date.now() });
  emit('live', path);
  return { data, fromCache: false };
}

export function get(path) {
  const pending = inflight.get(path);
  if (pending) return pending;
  const p = request(path).finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

// The four reads the app is built on.
export const paths = {
  board: '/api/competitions?status=open',
  competition: (slug) => `/api/competitions/${encodeURIComponent(slug)}`,
  leaderboard: (slug) => `/api/competitions/${encodeURIComponent(slug)}/leaderboard`,
  profile: (handle) => `/api/profiles/${encodeURIComponent(handle)}`,
};
