// main.js — the shell of the make.fun bounty-board client.
//
// A masthead, a live-status bar and a master–detail layout: on wide
// screens the board rides in a rail beside the bounty, leaderboard and
// profile views, fed by the same cached board read as the board itself,
// so the rail costs no extra request. Views load lazily by route; the
// shell never rebuilds, only the view pane and the rail's active marker
// change as the hash moves.

import { get, paths, onStatus } from './api.js';
import { esc, accepting, timeLeft, clockLabel } from './format.js';

const app = document.getElementById('app');

app.innerHTML = `
  <header class="masthead">
    <a class="wordmark" href="#/">make.fun</a>
    <p class="tagline">The bounty board, read live.</p>
    <nav class="topnav" aria-label="Surfaces">
      <a href="#/" data-nav="board">Board</a>
      <span class="topnav-hint">Pick a bounty for its page, its leaderboard and its people.</span>
    </nav>
  </header>
  <div class="statusbar" role="status">
    <span class="statusbar-label">Live status</span>
    <span class="statusbar-text" id="statusText">Connecting to make.fun…</span>
    <span class="statusbar-clock" id="statusClock"></span>
  </div>
  <div class="layout" id="layout">
    <aside class="rail" id="rail" aria-label="Board rail"></aside>
    <main class="view" id="view" tabindex="-1"></main>
  </div>`;

const view = document.getElementById('view');
const rail = document.getElementById('rail');
const layout = document.getElementById('layout');
const statusText = document.getElementById('statusText');

// --- live status, in words ---------------------------------------------

const STATUS_WORDS = {
  live: 'Live — fresh from make.fun',
  cache: 'Served from cache — revalidated, unchanged',
  error: 'Connection problem — showing the last data we have',
};

onStatus(({ state, at }) => {
  const time = at.toLocaleTimeString('en-GB');
  statusText.textContent = `${STATUS_WORDS[state] || state} · ${time}`;
});

// The status bar's right edge carries a plain live clock, so the bar
// reads as a living part of the product rather than a debug strip.
const statusClock = document.getElementById('statusClock');
setInterval(() => { statusClock.textContent = clockLabel(new Date()); }, 1000);
statusClock.textContent = clockLabel(new Date());

// --- the board rail ------------------------------------------------------

let railSlug = null;

export async function renderRail(activeSlug) {
  railSlug = activeSlug;
  const { data, fromCache } = await get(paths.board);
  const items = (data.items || []).slice(0, 12);
  rail.innerHTML = `
    <h2 class="rail-title">On the board</h2>
    ${fromCache ? '<p class="rail-cache">Board served from cache — revalidated, unchanged.</p>' : ''}
    <ol class="rail-list">
      ${items.map((c) => `
        <li>
          <a class="rail-item${c.slug === activeSlug ? ' is-active' : ''}" href="#/bounty/${esc(c.slug)}">
            <span class="rail-item-title">${esc(c.title)}</span>
            <span class="rail-item-meta">${esc(timeLeft(c.deadline))} · ${esc(String(c.submissionCount ?? 0))} entries</span>
          </a>
        </li>`).join('')}
    </ol>
    <a class="rail-all" href="#/">See the whole board</a>`;
}

// --- routing ---------------------------------------------------------------

function parseRoute() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'board' };
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') {
    return { name: 'leaderboard', slug: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'bounty' && parts[1]) {
    return { name: 'bounty', slug: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'u' && parts[1]) {
    return { name: 'profile', handle: decodeURIComponent(parts[1]) };
  }
  return { name: 'board' };
}

const loaders = {
  board: () => import('./board.js'),
  bounty: () => import('./bounty.js'),
  leaderboard: () => import('./leaderboard.js'),
  profile: () => import('./profile.js'),
};

let navigation = 0;
let focusSearchOnBoard = false;

// "/" is the board's shortcut, and it works from every view: from a
// bounty, a leaderboard or a profile it comes back to the board and
// lands in the search box, ready to type.
document.addEventListener('keydown', (e) => {
  if (e.key !== '/') return;
  const tag = document.activeElement?.tagName || '';
  if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  if (document.getElementById('boardSearch')) return; // board.js handles it there
  e.preventDefault();
  focusSearchOnBoard = true;
  location.hash = '#/';
});

async function navigate() {
  const route = parseRoute();
  const ticket = ++navigation;
  window.__shotReady = false;
  layout.dataset.route = route.name;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.nav === route.name);
  });
  try {
    const mod = await loaders[route.name]();
    if (ticket !== navigation) return;
    await mod.render(view, route);
    if (ticket !== navigation) return;
    window.__shotReady = true;
    if (focusSearchOnBoard) {
      focusSearchOnBoard = false;
      document.getElementById('boardSearch')?.focus();
    }
  } catch (err) {
    if (ticket !== navigation) return;
    view.innerHTML = `
      <section class="notice">
        <h1>That page could not be loaded</h1>
        <p>${esc(err.message || err)}</p>
        <p><a href="#/">Back to the board</a></p>
      </section>`;
    window.__shotReady = true;
  }
  renderRail(route.slug || null).catch(() => {});
}

// An avatar that fails to load (a host the network cannot reach) should
// leave a quiet gap, never a broken-image glyph in the standings.
document.addEventListener('error', (e) => {
  const t = e.target;
  if (t && t.tagName === 'IMG') t.style.visibility = 'hidden';
}, true);

window.addEventListener('hashchange', navigate);
navigate();
