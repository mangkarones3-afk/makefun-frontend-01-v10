// bounty.js — one bounty's page: what it asks, what it pays, when it ends.
//
// The facts a visitor decides on — the live pot, the entry fee, the
// deadline with a ticking countdown, the entry count — sit in one band
// under the title. Below them the rewards table, then the description
// and rules the API returns, rendered from markdown with every character
// escaped first.

import { get, paths } from './api.js';
import { esc, money, count, dayLabel, countdown, accepting } from './format.js';

let ticker = null;

// A deliberately small markdown: headings, paragraphs, lists, bold,
// code and links. Input is escaped before any rule runs.
export function markdown(text) {
  const lines = esc(text || '').split('\n');
  const out = [];
  let list = false;
  const closeList = () => { if (list) { out.push('</ul>'); list = false; } };
  const inline = (s) => s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const level = Math.min(h[1].length + 1, 4);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!list) { out.push('<ul>'); list = true; }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

// The rewards map is {place: usd}; fold runs of equal amounts together.
export function rewardsRows(rewards) {
  if (!rewards) return '';
  const places = Object.keys(rewards).map(Number).sort((a, b) => a - b);
  const rows = [];
  let start = null;
  let prev = null;
  let amount = null;
  const flush = () => {
    if (start === null) return;
    const label = start === prev ? `Place ${start}` : `Places ${start}–${prev}`;
    rows.push(`<tr><td>${label}</td><td class="num">${esc(money(amount) || '')}</td></tr>`);
  };
  for (const place of places) {
    if (amount === null || Number(rewards[place]) !== Number(amount) || place !== prev + 1) {
      flush();
      start = place;
      amount = rewards[place];
    }
    prev = place;
  }
  flush();
  return rows.join('');
}

export async function render(root, route) {
  if (ticker) clearInterval(ticker);
  root.innerHTML = `<section class="bounty"><p class="empty">Loading the bounty…</p></section>`;
  const { data: c } = await get(paths.competition(route.slug));
  const open = accepting(c);
  const fee = money(c.entryFeeUsd);
  const pot = money(c.potUsd ?? c.rewardAmount);

  root.innerHTML = `
    <section class="bounty">
      <p class="crumbs"><a href="#/">Board</a> / ${esc(c.category || 'Bounty')}</p>
      <h1 class="page-title">${esc(c.title)}</h1>
      ${c.summary ? `<p class="page-sub">${esc(c.summary)}</p>` : ''}
      <div class="factband">
        <span class="fact fact-big"><span class="fact-label">Live pot</span><strong>${esc(pot || '—')}</strong></span>
        <span class="fact"><span class="fact-label">Entry fee</span>${fee && Number(c.entryFeeUsd) > 0 ? esc(fee) : 'Free'}</span>
        <span class="fact"><span class="fact-label">Entries</span>${esc(count(c.submissionCount))}</span>
        <span class="fact"><span class="fact-label">Deadline</span>${esc(dayLabel(c.deadline))}</span>
        <span class="fact"><span class="fact-label">${open ? 'Time left' : 'Status'}</span>${
          open
            ? `<span class="tick" id="bountyTick">—</span>`
            : 'Closed to entries'
        }</span>
        <span class="fact"><span class="fact-label">Sponsor</span>${esc(c.sponsor?.name || 'make.fun')}</span>
      </div>
      <p class="bounty-actions">
        <a class="button" href="#/bounty/${esc(c.slug)}/leaderboard">See the leaderboard</a>
      </p>
      ${c.rewards ? `
        <h2 class="section-title">Rewards</h2>
        <table class="rewards">
          <thead><tr><th>Place</th><th class="num">Prize</th></tr></thead>
          <tbody>${rewardsRows(c.rewards)}</tbody>
        </table>` : ''}
      ${c.description ? `<h2 class="section-title">About this bounty</h2><div class="prose">${markdown(c.description)}</div>` : ''}
      ${c.rules ? `<h2 class="section-title">Rules</h2><div class="prose">${markdown(c.rules)}</div>` : ''}
    </section>`;

  if (open) {
    const el = root.querySelector('#bountyTick');
    const tick = () => { if (el) el.textContent = countdown(c.deadline); };
    tick();
    ticker = setInterval(tick, 1000);
  }
}
