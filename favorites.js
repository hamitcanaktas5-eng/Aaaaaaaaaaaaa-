/* ================================================
   RoxyScore — favorites.js  v0.3
   ================================================ */
AS.requireAuth();

let activeTab = 'teams';

// ── NAV ──────────────────────────────────────────
document.getElementById('back-btn').addEventListener('click',  () => goBack('home.html'));
document.getElementById('nav-drawer').addEventListener('click',() => goTo('home.html'));
document.getElementById('nav-search').addEventListener('click',() => goTo('home.html'));
document.getElementById('nav-home').addEventListener('click',  () => goTo('home.html'));
document.getElementById('nav-table').addEventListener('click', () => goTo('table.html'));
// nav-fav zaten aktif sayfa

// ── TABS ─────────────────────────────────────────
const ftabs  = document.querySelectorAll('.ftab');
const ftLine = document.getElementById('ftab-line');

function moveTabLine(el) {
  const wr = document.querySelector('.tabs-wrap').getBoundingClientRect();
  const r  = el.getBoundingClientRect();
  ftLine.style.left  = (r.left - wr.left) + 'px';
  ftLine.style.width = r.width + 'px';
}

ftabs.forEach(tab => {
  tab.addEventListener('click', () => {
    ftabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    moveTabLine(tab);
    render();
  });
});
setTimeout(() => moveTabLine(document.querySelector('.ftab.active')), 50);

// ── RENDER ───────────────────────────────────────
function render() {
  const c = document.getElementById('fav-content');
  c.classList.remove('fade-in'); void c.offsetWidth; c.classList.add('fade-in');
  if (activeTab === 'teams') renderTeams();
  else renderNotifs();
}

// ── TAKIMLAR ─────────────────────────────────────
function renderTeams() {
  const teams = AS.getFavTeams();
  const c     = document.getElementById('fav-content');

  if (!teams.length) {
    c.innerHTML = `<div class="empty-fav">
      <div class="ef-icon">⭐</div>
      <h3>Favori Takım Yok</h3>
      <p>Maç ekranlarında takım adına veya yıldıza basarak favori ekleyebilirsin.</p>
      <button class="empty-fav-btn" id="go-home-btn">Maçlara Dön</button>
    </div>`;
    document.getElementById('go-home-btn').addEventListener('click', () => goTo('home.html'));
    return;
  }

  c.innerHTML = `<div class="team-grid">
    ${teams.map(t => `
      <div class="team-card" data-tid="${t.id}">
        <button class="team-card-remove" data-id="${t.id}">
          <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <div>${buildLogo(t.id, 'lg')}</div>
        <div class="team-card-name">${t.name}</div>
        <div class="team-card-league">${t.league || ''}</div>
        <button class="team-card-detail" data-tid="${t.id}">Detay</button>
      </div>`).join('')}
  </div>`;

  c.querySelectorAll('.team-card-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const team = teams.find(t => t.id === btn.dataset.id);
      AS.toggleFavTeam(team);
      showToast('💔', `${team.name} favorilerden çıkarıldı`, '', 'neutral');
      render();
    });
  });
  c.querySelectorAll('.team-card-detail').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      goTo(`team.html?id=${btn.dataset.tid}&from=favorites.html`);
    });
  });
  c.querySelectorAll('.team-card').forEach(card => {
    card.addEventListener('click', () => goTo(`team.html?id=${card.dataset.tid}&from=favorites.html`));
  });
}

// ── MAÇ BİLDİRİMLERİ ─────────────────────────────
function renderNotifs() {
  const ids   = AS.getFavMatches();
  const c     = document.getElementById('fav-content');

  if (!ids.length) {
    c.innerHTML = `<div class="empty-fav">
      <div class="ef-icon">🔔</div>
      <h3>Bildirim Yok</h3>
      <p>Maç kartlarındaki zil ikonuna basarak maçları takibe alabilirsin. Favori maçlar ana sayfada şeritte görünür.</p>
      <button class="empty-fav-btn" id="go-home-btn">Maçlara Dön</button>
    </div>`;
    document.getElementById('go-home-btn').addEventListener('click', () => goTo('home.html'));
    return;
  }

  const matches = ids.map(id => MATCHES.getMatch(id)).filter(Boolean);
  c.innerHTML = `<div class="notif-list">
    ${matches.map(m => {
      let statusCls = 'upcoming', statusText = m.time;
      if (m.status === 'live')     { statusCls = 'live';     statusText = `● ${m.minute}'`; }
      if (m.status === 'finished') { statusCls = 'finished'; statusText = 'MS'; }
      return `<div class="notif-item ${m.status === 'live' ? 'live' : ''}" data-mid="${m.id}">
        ${buildLogo(m.home.id, 'sm')}
        <div class="notif-info">
          <div class="notif-teams">${m.home.name} — ${m.away.name}</div>
          <div class="notif-league">${m.leagueName}</div>
          <span class="notif-status s-${statusCls}">${statusText}</span>
        </div>
        ${buildLogo(m.away.id, 'sm')}
        <button class="notif-remove" data-mid="${m.id}">
          <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>`;
    }).join('')}
  </div>`;

  c.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.closest('.notif-remove')) return;
      goTo(`match.html?id=${item.dataset.mid}&from=favorites.html`);
    });
  });
  c.querySelectorAll('.notif-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      AS.toggleFavMatch(btn.dataset.mid);
      showToast('🔕', 'Bildirim kapatıldı', '', 'neutral');
      render();
    });
  });
}

render();
