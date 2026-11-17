// profile.js — an account's public profile: who they are, their record
// across every bounty they have entered, what they have won, and the
// entries themselves, each linking back to its bounty.

import { get, paths } from './api.js';
import { esc, money, count, dayLabel } from './format.js';

function imgUrl(src) {
  if (!src) return '';
  return src.startsWith('http') ? src : `https://make.fun${src}`;
}

function stat(label, value) {
  return `<span class="fact"><span class="fact-label">${esc(label)}</span><strong>${esc(value)}</strong></span>`;
}

export async function render(root, route) {
  root.innerHTML = `<section class="profile"><p class="empty">Loading the profile…</p></section>`;
  const { data: p } = await get(paths.profile(route.handle));
  const name = p.display_name || p.handle;
  const avatar = p.avatar?.url || p.image;
  const record = p.record || {};
  const links = [
    p.github_login ? `<a href="https://github.com/${esc(p.github_login)}" rel="noopener">GitHub: ${esc(p.github_login)}</a>` : '',
    p.x ? `<span>X: ${esc(p.x)}</span>` : '',
    p.discord ? `<span>Discord: ${esc(p.discord)}</span>` : '',
  ].filter(Boolean).join(' · ');

  root.innerHTML = `
    <section class="profile">
      <p class="crumbs"><a href="#/">Board</a> / Profiles</p>
      <div class="profile-head">
        ${avatar ? `<img class="avatar avatar-big" crossorigin="anonymous" src="${esc(imgUrl(avatar))}" alt="">` : ''}
        <div>
          <h1 class="page-title">${esc(name)}</h1>
          <p class="page-sub">@${esc(p.handle)} · joined ${esc(dayLabel(p.joined_at))}${links ? ` · ${links}` : ''}</p>
          ${p.bio ? `<p class="profile-bio">${esc(p.bio)}</p>` : ''}
        </div>
      </div>
      <div class="factband">
        ${stat('Entered', count(record.competitions_entered))}
        ${stat('Placed', count(record.competitions_placed))}
        ${stat('Won', count(record.competitions_won))}
        ${stat('Podiums', count(record.podium_finishes))}
        ${stat('Best place', record.best_placement ? `#${record.best_placement}` : '—')}
        ${stat('Prizes won', money(record.prize_usd) || '$0')}
      </div>
      ${Array.isArray(p.solutions) && p.solutions.length ? `
        <h2 class="section-title">Entries</h2>
        <ol class="solution-list">
          ${p.solutions.map((s) => `
            <li>
              <a class="solution" href="#/bounty/${esc(s.competition?.slug || '')}">
                <span class="solution-title">${esc(s.title || '')}</span>
                <span class="solution-meta">
                  ${esc(s.competition?.title || '')}
                  ${s.placement ? ` · placed #${esc(String(s.placement))}` : ''}
                  ${s.prize_usd && Number(s.prize_usd) > 0 ? ` · won ${esc(money(s.prize_usd))}` : ''}
                </span>
              </a>
            </li>`).join('')}
        </ol>` : ''}
      ${Array.isArray(p.payouts) && p.payouts.length ? `
        <h2 class="section-title">Payouts</h2>
        <table class="rewards">
          <thead><tr><th>Bounty</th><th class="num">Place</th><th class="num">Paid</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${p.payouts.map((pay) => `
              <tr>
                <td>${esc(pay.competition?.title || '')}</td>
                <td class="num">${esc(String(pay.place ?? ''))}</td>
                <td class="num">${esc(dayLabel(pay.paid_at))}</td>
                <td class="num">${esc(money(pay.amount_usd) || '')}</td>
              </tr>`).join('')}
          </tbody>
        </table>` : ''}
    </section>`;
}
