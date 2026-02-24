/* RoxyScore — home.js v0.4 */
AS.requireAuth();

const session = AS.getSession();
if (session?.email) {
  document.getElementById('drawer-avatar').textContent = session.email[0].toUpperCase();
  document.getElementById('drawer-email').textContent  = session.email;
}

let activeFilter = 'all';
let activeDate   = 'today';
let collapsedLeagues = AS.get('rs_collapsed') || [];

// ── LAYOUT OFFSET ────────────────────────────────
// top + date + pills = 52+68+48 = 168px
const BASE_TOP = 52 + 68 + 48;

function setMatchListTop(favH) {
  const list = document.getElementById('match-list');
  const newTop = BASE_TOP + favH;
  list.style.top    = newTop + 'px';
  list.style.bottom = '72px';
}

/* ── API YÜKLE + RENDER ──────────────────────────
   Önce mock data göster (hızlı başlangıç),
   arka planda API'den gerçek maçları çek.
─────────────────────────────────────────────────── */
let refreshTimer = null;

async function loadAndRender() {
  // 1) Mock data ile anında göster
  buildDateStrip();
  renderFavStrip();
  renderMatches();

  // 2) API'den bugünün maçlarını çek (arka planda)
  try {
    const fixtures = await API.getTodayFixtures();
    if (fixtures && fixtures.length > 0) {
      const loaded = MATCHES.loadFromAPI(fixtures);
      if (loaded) {
        buildDateStrip();
        renderFavStrip();
        renderMatches();
      }
    }
  } catch (e) {
    console.warn('API yüklenemedi, mock data kalıyor:', e);
  }

  // 3) Canlı maç varsa 60sn'de bir yenile
  if (refreshTimer) clearTimeout(refreshTimer);
  const hasLive = MATCHES.getAllMatches().some(m => m.status === 'live');
  if (hasLive && activeDate === 'today') {
    refreshTimer = setTimeout(loadAndRender, 60000);
  }
}

// ── FAV MATCH STRIP ──────────────────────────────
function renderFavStrip() {
  const container = document.getElementById('fav-strip-container');
  const ids   = AS.getFavMatches();
  const items = ids.map(id => MATCHES.getMatch(id)).filter(Boolean);

  if (!items.length) {
    container.innerHTML = '';
    setMatchListTop(0);
    return;
  }

  const cards = items.map(m => {
    const hasScore = m.score.home !== null;
    const scoreText = hasScore ? `${m.score.home}:${m.score.away}` : '--';
    let statusCls = 'upcoming', statusText = m.time;
    if (m.status === 'live')     { statusCls = 'live';     statusText = `● ${m.minute}'`; }
    if (m.status === 'finished') { statusCls = 'finished'; statusText = 'MS'; }
    return `
      <div class="fav-mc ${m.status === 'live' ? 'live' : ''}" data-mid="${m.id}">
        <button class="fav-mc-remove" data-mid="${m.id}" title="Kaldır">
          <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <div class="fav-mc-teams">
          ${buildLogo(m.home.id, 'xs')}
          <span class="fav-mc-name">${m.home.name}</span>
          <span class="fav-mc-score">${scoreText}</span>
          <span class="fav-mc-name" style="text-align:right">${m.away.name}</span>
          ${buildLogo(m.away.id, 'xs')}
        </div>
        <div class="fav-mc-status ${statusCls}">${statusText}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="fav-strip-block" id="fav-strip-block">
      <div class="fav-strip-label">Favori Maçlar</div>
      <div class="fav-strip">${cards}</div>
    </div>`;

  // position
  const block = document.getElementById('fav-strip-block');
  block.style.top = BASE_TOP + 'px';
  const favH = block.offsetHeight;
  setMatchListTop(favH);

  // events
  container.querySelectorAll('.fav-mc').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.fav-mc-remove')) return;
      goTo(`match.html?id=${el.dataset.mid}`);
    });
  });
  container.querySelectorAll('.fav-mc-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      AS.toggleFavMatch(btn.dataset.mid);
      renderFavStrip();
      renderMatches();
    });
  });
}

// ── DATE STRIP ───────────────────────────────────
function buildDateStrip() {
  const strip = document.getElementById('date-strip');
  const now   = new Date();
  const days  = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
  const total = MATCHES.getAllMatches().length;
  let html = '';
  for (let i = -3; i <= 5; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const isToday = i === 0;
    const count   = isToday ? total : (Math.floor(Math.random() * 14) + 2);
    const key     = isToday ? 'today' : `d${i}`;
    html += `<button class="date-item${isToday?' today':''}${activeDate===key?' active':''}" data-key="${key}">
      <span class="day-name">${isToday ? 'BUGÜN' : days[d.getDay()]}</span>
      <span class="day-num">${d.getDate()}</span>
      <span class="match-count">${count}</span>
    </button>`;
  }
  strip.innerHTML = html;
  setTimeout(() => { const a = strip.querySelector('.active'); if (a) a.scrollIntoView({ inline:'center', block:'nearest' }); }, 50);
  strip.querySelectorAll('.date-item').forEach(b => b.addEventListener('click', () => {
    activeDate = b.dataset.key; buildDateStrip(); renderMatches();
  }));
}

// ── RENDER MATCHES ───────────────────────────────
function renderMatches() {
  const list   = document.getElementById('match-list');
  const source = activeDate === 'today' ? MATCHES.leagues : simulateOtherDay();
  const filtered = source.map(lg => ({
    ...lg,
    matches: lg.matches.filter(m => {
      if (activeFilter === 'live')     return m.status === 'live';
      if (activeFilter === 'finished') return m.status === 'finished';
      if (activeFilter === 'upcoming') return m.status === 'upcoming';
      return true;
    })
  })).filter(lg => lg.matches.length > 0);

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/></svg>
      <h3>Maç Bulunamadı</h3><p>Bu filtre için maç yok.</p>
    </div>`;
    return;
  }
  list.innerHTML = filtered.map(buildLeagueGroup).join('');
  bindEvents();
}

function buildLeagueGroup(lg) {
  const collapsed = collapsedLeagues.includes(lg.id);
  return `<div class="league-group${collapsed?' collapsed':''}" data-lid="${lg.id}">
    <div class="league-header">
      <div class="league-flag">${lg.flag}</div>
      <div style="flex:1">
        <div class="league-name">${lg.name}</div>
        <div class="league-country">${lg.country}</div>
      </div>
      <span class="league-count">${lg.matches.length}</span>
      <svg class="league-toggle" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
    </div>
    <div class="league-matches">${lg.matches.map(buildMatchCard).join('')}</div>
  </div>`;
}

function buildMatchCard(m) {
  const hasScore = m.score.home !== null;
  const favMatch = AS.isFavMatch(m.id);
  const favHome  = AS.isFavTeam(m.home.id);
  const favAway  = AS.isFavTeam(m.away.id);

  let statusHtml = '';
  if (m.status === 'live')          statusHtml = `<span class="score-status status-live">● ${m.minute}'</span>`;
  else if (m.status === 'finished') statusHtml = `<span class="score-status status-finished">MS</span>`;
  else                              statusHtml = `<span class="score-status status-upcoming">${m.time}</span>`;

  const sH     = hasScore ? m.score.home : '-';
  const sA     = hasScore ? m.score.away : '-';
  const sColor = hasScore ? 'var(--text)' : 'var(--sub)';

  // Kısa takım adı (kart butonları için)
  const shortHome = m.home.short || m.home.name.split(' ')[0];
  const shortAway = m.away.short || m.away.name.split(' ')[0];

  return `<div class="match-card${m.status === 'live' ? ' live' : ''}" data-mid="${m.id}">
    <!-- HOME -->
    <div class="team home">
      ${buildLogo(m.home.id, 'sm')}
      <div class="team-name-wrap">
        <span class="team-name" data-tid="${m.home.id}">${m.home.name}</span>
      </div>
    </div>

    <!-- SCORE -->
    <div class="score-block">
      <div class="score-nums">
        <span class="score-num" style="color:${sColor}">${sH}</span>
        <span class="score-sep">:</span>
        <span class="score-num" style="color:${sColor}">${sA}</span>
      </div>
      ${statusHtml}
    </div>

    <!-- AWAY -->
    <div class="team away">
      <div class="team-name-wrap">
        <span class="team-name" style="text-align:right" data-tid="${m.away.id}">${m.away.name}</span>
      </div>
      ${buildLogo(m.away.id, 'sm')}
    </div>

    <!-- AKSİYON ŞERIT (favori butonları) -->
    <div class="card-actions">
      <button class="team-star${favHome?' active':''}" data-tid="${m.home.id}" data-tname="${m.home.name}" data-tshort="${m.home.short||m.home.name.substring(0,3).toUpperCase()}" data-tcolor="${m.home.color}" data-tcolor2="${m.home.color2||''}" data-tleague="${m.leagueName}">
        <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        <span>${shortHome}</span>
      </button>
      <button class="match-bell${favMatch?' active':''}" data-mid="${m.id}">
        <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
        <span>${favMatch ? 'Takipte' : 'Takip'}</span>
      </button>
      <button class="team-star${favAway?' active':''}" data-tid="${m.away.id}" data-tname="${m.away.name}" data-tshort="${m.away.short||m.away.name.substring(0,3).toUpperCase()}" data-tcolor="${m.away.color}" data-tcolor2="${m.away.color2||''}" data-tleague="${m.leagueName}">
        <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        <span>${shortAway}</span>
      </button>
    </div>
  </div>`;
}

function bindEvents() {
  // league collapse
  document.querySelectorAll('.league-header').forEach(h => {
    h.addEventListener('click', () => {
      const g = h.closest('.league-group'), lid = g.dataset.lid;
      g.classList.toggle('collapsed');
      collapsedLeagues = g.classList.contains('collapsed')
        ? [...new Set([...collapsedLeagues, lid])]
        : collapsedLeagues.filter(x => x !== lid);
      AS.set('rs_collapsed', collapsedLeagues);
    });
  });

  // match card → match detail
  document.querySelectorAll('.match-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.team-star') || e.target.closest('.match-bell') || e.target.closest('.team-name') || e.target.closest('.card-actions')) return;
      goTo(`match.html?id=${card.dataset.mid}`);
    });
  });

  // team name click → team detail
  document.querySelectorAll('.team-name[data-tid]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      goTo(`team.html?id=${el.dataset.tid}&from=home.html`);
    });
  });

  // team fav star — belirgin pill buton
  document.querySelectorAll('.team-star').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const team = { id:btn.dataset.tid, name:btn.dataset.tname, short:btn.dataset.tshort, color:btn.dataset.tcolor, color2:btn.dataset.tcolor2, league:btn.dataset.tleague };
      const added = AS.toggleFavTeam(team);
      btn.classList.toggle('active', added);
      showToast(added?'⭐':'💔', added?`${team.name} favorilere eklendi`:`${team.name} favorilerden çıkarıldı`, '', added?'goal':'neutral');
    });
  });

  // match bell — maç bildirimi
  document.querySelectorAll('.match-bell').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const added = AS.toggleFavMatch(btn.dataset.mid);
      btn.classList.toggle('active', added);
      const textEl = btn.querySelector('span');
      if (textEl) textEl.textContent = added ? 'Takipte' : 'Takip';
      showToast(added?'🔔':'🔕', added?'Maç takibe alındı — şeritte görünecek':'Maç takibinden çıkarıldı', '', 'neutral');
      renderFavStrip();
    });
  });
}

function simulateOtherDay() {
  return MATCHES.leagues.slice(0,3).map(lg => ({
    ...lg,
    matches: lg.matches.slice(0,2).map(m => ({ ...m, status:'upcoming', score:{home:null,away:null}, time:'20:00', minute:null }))
  }));
}

// ── FILTER PILLS ─────────────────────────────────
document.querySelectorAll('.pill').forEach(b => {
  b.addEventListener('click', () => {
    activeFilter = b.dataset.filter;
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    b.classList.add('active');
    renderMatches();
  });
});

// ── BOTTOM NAV ───────────────────────────────────
document.getElementById('nav-menu').addEventListener('click',  openDrawer);
document.getElementById('nav-search').addEventListener('click', openSearch);
document.getElementById('nav-home').addEventListener('click', () => {
  document.getElementById('match-list').scrollTo({ top:0, behavior:'smooth' });
});
document.getElementById('nav-table').addEventListener('click', () => goTo('table.html'));
document.getElementById('nav-fav').addEventListener('click',   () => goTo('favorites.html'));
document.getElementById('notif-btn').addEventListener('click', () => {
  document.getElementById('notif-dot').classList.add('hidden');
  showToast('🔔','Bildirimler','3 yeni bildirim var','goal');
});

// ── DRAWER ───────────────────────────────────────
function openDrawer()  { document.getElementById('drawer').classList.add('open');  document.getElementById('drawer-overlay').classList.add('open'); }
function closeDrawer() { document.getElementById('drawer').classList.remove('open'); document.getElementById('drawer-overlay').classList.remove('open'); }
document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
document.getElementById('drawer-close').addEventListener('click', closeDrawer);
document.getElementById('drawer-logout').addEventListener('click', () => { AS.logout(); goTo('index.html'); });

// ── SEARCH ───────────────────────────────────────
function openSearch() {
  document.getElementById('search-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('search-input').focus(), 100);
}
document.getElementById('search-close').addEventListener('click', () => {
  document.getElementById('search-overlay').classList.add('hidden');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '<div class="search-hint">Aramak istediğin takım veya ligi yaz...</div>';
});

document.getElementById('search-input').addEventListener('input', e => {
  const q   = e.target.value.trim().toLowerCase();
  const res = document.getElementById('search-results');
  if (!q) { res.innerHTML = '<div class="search-hint">Aramak istediğin takım veya ligi yaz...</div>'; return; }

  // Takımlar: her zaman göster (canlı/bitmis/yaklaşan fark etmez)
  const teamRes = MATCHES.getAllTeams().filter(t => t.name.toLowerCase().includes(q));

  // Maçlar: SADECE CANLI maçları göster
  const matchRes = MATCHES.getAllMatches().filter(m =>
    m.status === 'live' && (
      m.home.name.toLowerCase().includes(q) ||
      m.away.name.toLowerCase().includes(q) ||
      m.leagueName.toLowerCase().includes(q)
    )
  );

  let html = '';
  if (teamRes.length) {
    html += `<div class="search-section-label">Takımlar</div>`;
    html += teamRes.slice(0,6).map(t => `
      <div class="search-result-item" onclick="goTo('team.html?id=${t.id}&from=home.html')">
        ${buildLogo(t.id, 'sm')}
        <div class="sr-info">
          <div class="sr-name">${t.name}</div>
          <div class="sr-sub">${t.league}</div>
        </div>
      </div>`).join('');
  }
  if (matchRes.length) {
    html += `<div class="search-section-label">🔴 Canlı Maçlar</div>`;
    html += matchRes.slice(0,5).map(m => `
      <div class="search-result-item" onclick="goTo('match.html?id=${m.id}')">
        <span style="font-size:18px">${m.leagueFlag}</span>
        <div class="sr-info">
          <div class="sr-name">${m.home.name} — ${m.away.name}</div>
          <div class="sr-sub">${m.leagueName} · ${m.score.home}:${m.score.away}</div>
        </div>
        <span class="sr-badge sr-live">● ${m.minute}'</span>
      </div>`).join('');
  }
  if (!html) html = '<div class="search-hint">Sonuç bulunamadı.</div>';
  res.innerHTML = html;
});

// ── SIMULATED NOTIFICATIONS ──────────────────────
const notifs = [
  { e:'⚽', t:'GOL! Galatasaray 3-1 Fenerbahçe', s:"İcardi, 71'", type:'goal' },
  { e:'🟡', t:'Sarı Kart', s:"De Bruyne (Man City) 56'", type:'yellow-card' },
  { e:'🟥', t:'Kırmızı Kart!', s:"İsmail Yüksek 67'", type:'red-card' },
  { e:'⚽', t:'GOL! Arsenal 3-2 Man City', s:"Saka, 88'", type:'goal' },
];
[9000, 23000, 42000, 67000].forEach((d, i) => {
  setTimeout(() => {
    const n = notifs[i];
    showToast(n.e, n.t, n.s, n.type);
    document.getElementById('notif-dot').classList.remove('hidden');
  }, d);
});

// ── INIT ─────────────────────────────────────────
loadAndRender();
