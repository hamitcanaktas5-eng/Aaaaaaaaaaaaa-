/* ================================================
   RoxyScore — api.js  v0.4
   API-Football v3 servis katmanı
   Base URL: https://v3.football.api-sports.io
   ================================================ */

const API = (() => {
  // Basit bellek önbelleği
  const cache = {};

  async function request(endpoint, params) {
    const url = new URL(API_BASE_URL + endpoint);
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const key = url.toString();

    // Cache kontrolü
    if (cache[key] && Date.now() - cache[key].ts < 60000) {
      return cache[key].data;
    }

    try {
      const resp = await fetch(url.toString(), {
        method: 'GET',
        headers: API_HEADERS,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (json.errors && Object.keys(json.errors).length > 0) {
        console.warn('API hatası:', json.errors);
        return null;
      }
      const data = json.response || [];
      cache[key] = { data, ts: Date.now() };
      return data;
    } catch (e) {
      console.warn('API isteği başarısız:', e.message);
      return null;
    }
  }

  /* ── BUGÜNÜN MAÇLARI ──────────────────────────
     Tüm 8 lig için bugünün maçlarını çeker.
     Strateji: Her lig için ayrı istek yerine
     tarih + her lig ID'si ile toplu çekme.
  ─────────────────────────────────────────────── */
  async function getTodayFixtures() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Her lig için paralel istek gönder (8 istek)
    const promises = LEAGUE_CONFIG.map(lc =>
      request('/fixtures', {
        league:  lc.id,
        season:  currentSeason(),
        date:    today,
        timezone: 'Europe/Istanbul',
      })
    );

    const results = await Promise.allSettled(promises);
    const fixtures = [];
    results.forEach(r => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        fixtures.push(...r.value);
      }
    });
    return fixtures; // API-Football fixture array
  }

  /* ── CANLI MAÇLAR ─────────────────────────────
     Tüm ligler için canlı maçları çeker (tek istek)
  ─────────────────────────────────────────────── */
  async function getLiveFixtures() {
    return await request('/fixtures', {
      live: LEAGUE_IDS,
    });
  }

  /* ── MAÇ DETAYI ───────────────────────────────
     Tek bir maçın tüm bilgileri
  ─────────────────────────────────────────────── */
  async function getFixtureById(fixtureId) {
    const data = await request('/fixtures', { id: fixtureId });
    return data && data.length ? data[0] : null;
  }

  /* ── MAÇ İSTATİSTİKLERİ ───────────────────────
     match.js'in stats sekmesi için
  ─────────────────────────────────────────────── */
  async function getFixtureStats(fixtureId) {
    const data = await request('/fixtures/statistics', { fixture: fixtureId });
    if (!data || !data.length) return [];
    return mapStats(data);
  }

  /* ── KADRO ────────────────────────────────────
     match.js'in lineup sekmesi için
  ─────────────────────────────────────────────── */
  async function getFixtureLineups(fixtureId) {
    const data = await request('/fixtures/lineups', { fixture: fixtureId });
    if (!data || !data.length) return null;
    return mapLineup(data);
  }

  /* ── OLAYLAR ──────────────────────────────────
     match.js'in özet sekmesi için
  ─────────────────────────────────────────────── */
  async function getFixtureEvents(fixtureId, homeTeamId) {
    const data = await request('/fixtures/events', { fixture: fixtureId });
    if (!data || !data.length) return [];
    return mapEvents(data, homeTeamId);
  }

  /* ── H2H ──────────────────────────────────────
     Son 10 karşılaşma
  ─────────────────────────────────────────────── */
  async function getH2H(teamA, teamB) {
    const data = await request('/fixtures/headtohead', {
      h2h:  `${teamA}-${teamB}`,
      last: 10,
    });
    if (!data) return { wins: { home: 0, draw: 0, away: 0 }, matches: [] };
    return mapH2H(data, String(teamA), String(teamB));
  }

  /* ── PUAN TABLOSU ─────────────────────────────
     table.html için
  ─────────────────────────────────────────────── */
  async function getStandings(leagueId) {
    return await request('/standings', {
      league: leagueId,
      season: currentSeason(),
    });
  }

  /* ── YARDIMCI: SEZON ──────────────────────────
     Şu anki sezonu döndürür (Ağustos'tan itibaren yeni sezon)
  ─────────────────────────────────────────────── */
  function currentSeason() {
    const now = new Date();
    return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  }

  /* ── TAKIM RENK/KISA AD ────────────────────── */
  function getTeamColor(teamId) {
    const tc = TEAM_COLORS[parseInt(teamId)];
    return tc ? tc.color : '#1e2740';
  }
  function getTeamColor2(teamId) {
    const tc = TEAM_COLORS[parseInt(teamId)];
    return tc ? tc.color2 : 'rgba(255,255,255,0.15)';
  }
  function getTeamShort(teamId, name) {
    const tc = TEAM_COLORS[parseInt(teamId)];
    if (tc) return tc.short;
    const tp = typeof TEAM_PROFILES !== 'undefined' ? TEAM_PROFILES[String(teamId)] : null;
    if (tp) return tp.short;
    return name.replace(/[^A-ZÇĞİÖŞÜa-zçğışöüñ]/g, '').substring(0, 3).toUpperCase();
  }

  /* ── MAPPER: OLAYLAR ──────────────────────────
     API-Football events → v03 format
  ─────────────────────────────────────────────── */
  function mapEvents(apiEvents, homeTeamId) {
    return apiEvents.map(e => {
      const typeMap = {
        'Goal':          'goal',
        'Card':          e.detail === 'Red Card' ? 'red' : 'yellow',
        'subst':         'sub',
        'Var':           'var',
      };
      return {
        min:    e.time.elapsed,
        type:   typeMap[e.type] || e.type.toLowerCase(),
        side:   String(e.team.id) === String(homeTeamId) ? 'home' : 'away',
        player: e.player?.name || e.player || '?',
        assist: e.assist?.name || '',
        detail: e.detail || '',
      };
    });
  }

  /* ── MAPPER: İSTATİSTİKLER ────────────────────
     API stats → v03 format
  ─────────────────────────────────────────────── */
  function mapStats(apiStats) {
    if (!apiStats || apiStats.length < 2) return [];
    const home = apiStats[0].statistics || [];
    const away = apiStats[1].statistics || [];

    const LABELS = {
      'Ball Possession':        { label: 'Topa Sahip Olma', type: 'possession' },
      'Total Shots':            { label: 'Şut',             type: 'bar' },
      'Shots on Goal':          { label: 'İsabetli Şut',    type: 'bar' },
      'Shots off Goal':         { label: 'İsabetsiz Şut',   type: 'bar' },
      'Corner Kicks':           { label: 'Korner',          type: 'bar' },
      'Fouls':                  { label: 'Faul',            type: 'bar' },
      'Offsides':               { label: 'Ofsayt',         type: 'bar' },
      'Yellow Cards':           { label: 'Sarı Kart',       type: 'bar' },
      'Red Cards':              { label: 'Kırmızı Kart',    type: 'bar' },
      'Goalkeeper Saves':       { label: 'Kurtarış',        type: 'bar' },
      'Total passes':           { label: 'Pas',             type: 'bar' },
      'Passes accurate':        { label: 'İsabetli Pas',    type: 'bar' },
      'Passes %':               { label: 'Pas Yüzdesi',     type: 'possession' },
    };

    const result = [];
    home.forEach(stat => {
      const meta = LABELS[stat.type];
      if (!meta) return;
      const awayStat = away.find(s => s.type === stat.type);
      let hv = stat.value    || 0;
      let av = awayStat ? (awayStat.value || 0) : 0;
      // Yüzde string temizleme
      if (typeof hv === 'string') hv = parseInt(hv) || 0;
      if (typeof av === 'string') av = parseInt(av) || 0;
      result.push({ label: meta.label, home: hv, away: av, type: meta.type === 'possession' ? 'possession' : undefined });
    });
    return result;
  }

  /* ── MAPPER: KADRO ────────────────────────────
     API lineup → v03 format
  ─────────────────────────────────────────────── */
  function mapLineup(apiLineups) {
    if (!apiLineups || apiLineups.length < 2) return null;

    function mapPlayers(list) {
      return list.map(p => ({
        num:  p.player.number,
        name: p.player.name,
        pos:  p.player.pos,
      }));
    }

    return {
      home: {
        formation: apiLineups[0].formation,
        starting:  mapPlayers(apiLineups[0].startXI || []),
        subs:      mapPlayers(apiLineups[0].substitutes || []),
        coach:     apiLineups[0].coach?.name || '',
      },
      away: {
        formation: apiLineups[1].formation,
        starting:  mapPlayers(apiLineups[1].startXI || []),
        subs:      mapPlayers(apiLineups[1].substitutes || []),
        coach:     apiLineups[1].coach?.name || '',
      },
    };
  }

  /* ── MAPPER: H2H ──────────────────────────────
     API h2h fixtures → v03 format
  ─────────────────────────────────────────────── */
  function mapH2H(apiFixtures, homeTeamId, awayTeamId) {
    let hw = 0, d = 0, aw = 0;
    const matches = apiFixtures.slice(0, 10).map(f => {
      const hGoals = f.goals.home ?? 0;
      const aGoals = f.goals.away ?? 0;
      // Ev sahibi maçın ev sahibiyle aynıysa normal, değilse ters
      const isHomeFirst = String(f.teams.home.id) === String(homeTeamId);
      const ourHome = isHomeFirst ? hGoals : aGoals;
      const ourAway = isHomeFirst ? aGoals : hGoals;
      if      (ourHome > ourAway) hw++;
      else if (ourHome < ourAway) aw++;
      else                        d++;
      const dt = new Date(f.fixture.date);
      return {
        date:      dt.toLocaleDateString('tr-TR', { day:'numeric', month:'short', year:'numeric' }),
        homeScore: ourHome,
        awayScore: ourAway,
      };
    });
    return { wins: { home: hw, draw: d, away: aw }, matches };
  }

  /* ── PUBLIC API ───────────────────────────────
     Tüm fonksiyonları dışarı aç
  ─────────────────────────────────────────────── */
  return {
    getTodayFixtures,
    getLiveFixtures,
    getFixtureById,
    getFixtureStats,
    getFixtureLineups,
    getFixtureEvents,
    getH2H,
    getStandings,
    mapEvents,
    mapStats,
    mapLineup,
    mapH2H,
    getTeamColor,
    getTeamColor2,
    getTeamShort,
  };
})();
