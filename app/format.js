// format.js — small presentation helpers shared by every view.
// Nothing here touches the network or the DOM tree beyond building strings.

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Money arrives as numbers ("500"), numeric strings ("190.00") or null.
export function money(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const whole = Number.isInteger(n);
  return '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function count(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '0';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function clockLabel(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

// "3d 4h left", "5h 12m left", "41m 09s left", "Closed".
export function timeLeft(iso, now = Date.now()) {
  const end = new Date(iso).getTime();
  if (!Number.isFinite(end)) return '';
  let s = Math.floor((end - now) / 1000);
  if (s <= 0) return 'Closed';
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const p = (n) => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${p(m)}m left`;
  return `${m}m ${p(s)}s left`;
}

// A ticking "04:12:33" style countdown for the signature clock.
export function countdown(iso, now = Date.now()) {
  const end = new Date(iso).getTime();
  if (!Number.isFinite(end)) return '';
  let s = Math.floor((end - now) / 1000);
  if (s <= 0) return '00:00:00';
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const p = (n) => String(n).padStart(2, '0');
  const tail = `${p(h)}:${p(m)}:${p(s)}`;
  return d > 0 ? `${d}d ${tail}` : tail;
}

// A bounty takes entries only while its status allows and its deadline is ahead.
export function accepting(comp, now = Date.now()) {
  if (!comp) return false;
  if (comp.acceptingSubmissions === false) return false;
  const status = String(comp.status || 'open').toLowerCase();
  if (status !== 'open' && status !== 'live') return false;
  const end = new Date(comp.deadline).getTime();
  return Number.isFinite(end) ? end > now : true;
}

export function closingSoon(comp, now = Date.now()) {
  if (!accepting(comp, now)) return false;
  const end = new Date(comp.deadline).getTime();
  return end - now <= 48 * 3600 * 1000;
}

// Judge win rates arrive as micro values: 956066 means 95.6066%.
export function winRate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return (n / 10000).toFixed(1) + '%';
}
