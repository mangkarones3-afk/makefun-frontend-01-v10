// leaderboard.js — a bounty's standings.
//
// Long boards are paged, not dumped: a hundred rows at a time with a
// "Show more" button, so the first paint stays light however many
// entries a bounty draws. Each entrant links to their public profile,
// and a row's prize comes from the bounty's own rewards table.

import { get, paths } from './api.js';
import { esc, money, winRate } from './format.js';

const PAGE = 100;
let shown = PAGE;
let lastSlug = null;

function imgUrl(src) {
  if (!src) return '';
  return src.startsWith('http') ? src : `https://make.fun${src}`;
}

function rowHtml(e, rewards) {
  const prize = e.prize_eligible && e.prize_rank && rewards
    ? money(rewards[String(e.prize_rank)])
    : null;
  return `
    <tr>
      <td class="num rank">${esc(String(e.rank ?? ''))}</td>
      <td>
        <a class="entrant" href="#/u/${esc(e.handle)}">
          ${e.image ? `<img class="avatar" crossorigin="anonymous" src="${esc(imgUrl(e.image))}" alt="" loading="lazy">` : ''}
          <span>@${esc(e.handle)}</span>
        </a>
      </td>
      <td class="entry-title">${esc(e.title || '')}</td>
      <td class="num">${esc(winRate(e.values?.judge))}</td>
      <td class="num">${prize ? esc(prize) : '—'}</td>
    </tr>`;
}

export async function render(root, route) {
  if (route.slug !== lastSlug) { shown = PAGE; lastSlug = route.slug; }
  root.innerHTML = `<section class="standings"><p class="empty">Loading the standings…</p></section>`;
  const [lb, comp] = await Promise.all([
    get(paths.leaderboard(route.slug)),
    get(paths.competition(route.slug)),
  ]);
  const entries = lb.data.entries || [];
  const rewards = comp.data.rewards || null;
  const title = comp.data.title || route.slug;

  const paint = () => {
    const more = root.querySelector('#moreRows');
    const body = root.querySelector('#lbBody');
    if (body) body.innerHTML = entries.slice(0, shown).map((e) => rowHtml(e, rewards)).join('');
    if (more) {
      more.hidden = shown >= entries.length;
      more.textContent = `Show more — ${Math.min(shown, entries.length)} of ${entries.length} shown`;
    }
  };

  root.innerHTML = `
    <section class="standings">
      <p class="crumbs"><a href="#/">Board</a> / <a href="#/bounty/${esc(route.slug)}">${esc(title)}</a> / Leaderboard</p>
      <h1 class="page-title">Leaderboard</h1>
      <p class="page-sub">${esc(title)} — ${entries.length} ranked entries, best first. Win rates are the judge's, as the API reports them.</p>
      <table class="board-table">
        <thead>
          <tr><th class="num">Rank</th><th>Entrant</th><th>Entry</th><th class="num">Win rate</th><th class="num">Prize</th></tr>
        </thead>
        <tbody id="lbBody"></tbody>
      </table>
      <p class="more-row"><button type="button" class="button" id="moreRows"></button></p>
    </section>`;
  paint();
  root.querySelector('#moreRows').addEventListener('click', () => {
    shown += PAGE;
    paint();
  });
}
