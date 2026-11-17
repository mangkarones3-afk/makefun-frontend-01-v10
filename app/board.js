// board.js — the bounty board: every live bounty with its pot, its entry
// fee, its time left and its entry count, searchable and sortable.
//
// The board reads the same cached path as the shell's rail, so opening
// the board after any other view revalidates one request, not two. The
// soonest deadline on the board drives the signature countdown clock at
// the top of the page, ticking once a second.

import { get, paths } from './api.js';
import { esc, money, count, timeLeft, countdown, accepting, closingSoon } from './format.js';

const state = {
  query: '',
  chip: 'all',       // all | open | closing | closed
  sort: 'deadline',  // deadline | pot | entries | title
  selected: 0,
};

let comps = [];
let visible = [];
let ticker = null;

function feeOf(c) {
  const raw = c.entryFeeUsd ?? c.entryFee?.amount_usd ?? c.entryFee?.usd ?? null;
  const label = money(raw);
  return label && Number(raw) > 0 ? `${label} entry fee` : 'Free entry';
}

function potOf(c) {
  return money(c.potUsd ?? c.rewardAmount) || '—';
}

function matches(c) {
  const now = Date.now();
  if (state.chip === 'open' && !accepting(c, now)) return false;
  if (state.chip === 'closing' && !closingSoon(c, now)) return false;
  if (state.chip === 'closed' && accepting(c, now)) return false;
  if (!state.query) return true;
  const hay = [c.title, c.slug, c.category, c.sponsor?.name, ...(c.skills || [])]
    .join(' ').toLowerCase();
  return hay.includes(state.query.toLowerCase());
}

function sorted(list) {
  const by = {
    deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    pot: (a, b) => Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0),
    entries: (a, b) => Number(b.submissionCount ?? 0) - Number(a.submissionCount ?? 0),
    title: (a, b) => String(a.title).localeCompare(String(b.title)),
  }[state.sort];
  return list.slice().sort(by);
}

function rowHtml(c, i) {
  const open = accepting(c);
  return `
    <li>
      <a class="bounty-row${i === state.selected ? ' is-selected' : ''}" data-row="${i}"
         href="#/bounty/${esc(c.slug)}">
        <span class="bounty-main">
          <span class="bounty-title">${esc(c.title)}</span>
          <span class="bounty-sub">${esc(c.sponsor?.name || 'make.fun')} · ${esc(c.category || '')}</span>
        </span>
        <span class="bounty-facts">
          <span class="fact"><span class="fact-label">Pot</span><strong>${esc(potOf(c))}</strong></span>
          <span class="fact"><span class="fact-label">Fee</span>${esc(feeOf(c))}</span>
          <span class="fact"><span class="fact-label">${open ? 'Time left' : 'Deadline'}</span>${esc(timeLeft(c.deadline))}</span>
          <span class="fact"><span class="fact-label">Entries</span>${esc(count(c.submissionCount))}</span>
        </span>
      </a>
    </li>`;
}

function paint(root) {
  visible = sorted(comps.filter(matches));
  if (state.selected >= visible.length) state.selected = Math.max(0, visible.length - 1);
  const list = root.querySelector('#boardList');
  const tally = root.querySelector('#boardCount');
  if (tally) tally.textContent = `${visible.length} of ${comps.length} shown`;
  if (!list) return;
  list.innerHTML = visible.length
    ? visible.map(rowHtml).join('')
    : `<li class="empty">No bounties match. <button type="button" class="linklike" id="clearFilters">Clear the search and filters</button></li>`;
  const clear = root.querySelector('#clearFilters');
  if (clear) clear.addEventListener('click', () => {
    state.query = '';
    state.chip = 'all';
    const input = root.querySelector('#boardSearch');
    if (input) input.value = '';
    root.querySelectorAll('.chip').forEach((ch) => ch.classList.toggle('is-active', ch.dataset.chip === 'all'));
    paint(root);
  });
}

export async function render(root) {
  if (ticker) clearInterval(ticker);
  root.innerHTML = `
    <section class="board">
      <div class="board-head">
        <div>
          <h1 class="page-title">The board</h1>
          <p class="page-sub">Live bounties on make.fun — reward, fee, time left and entries, straight from the API.</p>
        </div>
        <div class="deadline-clock" id="deadlineClock" hidden>
          <span class="deadline-clock-label">Next deadline</span>
          <span class="deadline-clock-time" id="deadlineClockTime">--:--:--</span>
          <span class="deadline-clock-name" id="deadlineClockName"></span>
        </div>
      </div>
      <div class="toolbar" role="search">
        <label class="search">
          <span class="search-label">Search bounties</span>
          <input id="boardSearch" type="search" autocomplete="off"
                 placeholder="Search title, category, skill…  ( / )" value="${esc(state.query)}">
        </label>
        <div class="chips" role="group" aria-label="Filter by status">
          ${[['all', 'All'], ['open', 'Open'], ['closing', 'Closing soon'], ['closed', 'Closed']]
            .map(([key, label]) => `<button type="button" class="chip${state.chip === key ? ' is-active' : ''}" data-chip="${key}">${label}</button>`).join('')}
        </div>
        <label class="sort">
          <span class="sort-label">Sort</span>
          <select id="boardSort">
            ${[['deadline', 'Deadline first'], ['pot', 'Biggest pot'], ['entries', 'Most entries'], ['title', 'Title A–Z']]
              .map(([key, label]) => `<option value="${key}"${state.sort === key ? ' selected' : ''}>${label}</option>`).join('')}
          </select>
        </label>
        <span class="board-count" id="boardCount" aria-live="polite"></span>
      </div>
      <ol class="board-list" id="boardList">
        <li class="empty">Loading the board…</li>
      </ol>
    </section>`;

  root.querySelector('#boardSearch').addEventListener('input', (e) => {
    state.query = e.target.value;
    state.selected = 0;
    paint(root);
  });
  root.querySelectorAll('.chip').forEach((ch) => ch.addEventListener('click', () => {
    state.chip = ch.dataset.chip;
    state.selected = 0;
    root.querySelectorAll('.chip').forEach((x) => x.classList.toggle('is-active', x === ch));
    paint(root);
  }));
  root.querySelector('#boardSort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    paint(root);
  });

  const { data } = await get(paths.board);
  comps = data.items || [];
  paint(root);

  // The signature clock: the soonest deadline still open, ticking.
  const next = comps.filter((c) => accepting(c))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
  if (next) {
    const box = root.querySelector('#deadlineClock');
    const time = root.querySelector('#deadlineClockTime');
    const name = root.querySelector('#deadlineClockName');
    box.hidden = false;
    name.textContent = next.title;
    const tick = () => { time.textContent = countdown(next.deadline); };
    tick();
    ticker = setInterval(tick, 1000);
  }
}

// Keyboard: "/" jumps to the search, arrows walk the list, Enter opens.
document.addEventListener('keydown', (e) => {
  const list = document.getElementById('boardList');
  if (!list) return;
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  if (e.key === '/' && !typing) {
    e.preventDefault();
    document.getElementById('boardSearch')?.focus();
    return;
  }
  if (typing) return;
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;
  if (!visible.length) return;
  e.preventDefault();
  if (e.key === 'Enter') {
    const c = visible[state.selected];
    if (c) location.hash = `#/bounty/${c.slug}`;
    return;
  }
  state.selected = e.key === 'ArrowDown'
    ? Math.min(visible.length - 1, state.selected + 1)
    : Math.max(0, state.selected - 1);
  list.querySelectorAll('.bounty-row').forEach((row, i) => {
    row.classList.toggle('is-selected', i === state.selected);
    if (i === state.selected) row.scrollIntoView({ block: 'nearest' });
  });
});
