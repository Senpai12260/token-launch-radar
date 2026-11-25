// Launch Radar — the page over the board. Reads window.RADAR (data.js, written by main.ts from the
// same snapshot and model), renders the ranked pre-token board, a filterable/sortable table, a
// per-protocol detail drawer with the model's own arithmetic and the farm plan, and the live-token
// view the board deliberately sets aside. No network, no framework: every byte shown is in data.js.
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) return;

  var state = { q: '', cat: 'all', wl: 'all', sort: 'rank', dir: 1, tab: 'board', pick: null };

  // ---------- formatting ----------
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'age unknown';
    if (days >= 365) return (days / 365).toFixed(1) + ' yr';
    return Math.max(0, Math.round(days)) + ' d';
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- header ----------
  function renderHeader() {
    var total = 0;
    D.rows.forEach(function (r) { total += r.implied_value_usd; });
    var chips = [
      { b: D.rows.length.toLocaleString('en-US'), s: 'rows ranked', cls: 'gold' },
      { b: D.watchlist_size, s: 'watchlist (≥' + Math.round(D.floor_usd / 1e6) + 'M)' },
      { b: D.early_size, s: 'early, below floor' },
      { b: fmtUsd(total), s: 'combined implied' },
    ];
    document.getElementById('chips').innerHTML = chips.map(function (c) {
      return '<div class="chip ' + (c.cls || '') + '"><b>' + c.b + '</b><span>' + esc(c.s) + '</span></div>';
    }).join('');
    document.getElementById('m-base').textContent = '× ' + D.model.base_multiple;
    document.getElementById('m-asof').textContent = D.as_of;
    document.getElementById('m-watch').textContent = D.watchlist_size;
    document.getElementById('f-src').textContent = D.source.replace('DefiLlama ', '');
    document.getElementById('f-floor').textContent = fmtUsd(D.floor_usd);
  }

  // ---------- categories ----------
  function fillCategories() {
    var seen = {};
    D.rows.forEach(function (r) { if (r.category) seen[r.category] = true; });
    var cats = Object.keys(seen).sort();
    var sel = document.getElementById('cat');
    cats.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
  }

  // ---------- the model, re-run in the page so the numbers on screen are the board's own arithmetic ----------
  function impliedOf(r) {
    var m = D.model;
    var growth = Math.min(m.growth_cap, Math.max(m.growth_floor, r.change_7d == null ? 0 : r.change_7d));
    var growthMult = 1 + (growth / 100) * m.growth_weight;
    var age = r.age_days == null ? m.unknown_age_days : r.age_days;
    var maturity = m.maturity_floor + (Math.min(Math.max(age, 0), m.maturity_days) / m.maturity_days) * m.maturity_range;
    return Math.max(1, Math.round(r.tvl_usd * m.base_multiple * growthMult * maturity));
  }

  // ---------- growth tick: a small centred gauge, left for negative, right for positive ----------
  function tick(change) {
    if (change == null || !isFinite(change)) return '';
    var half = Math.min(Math.abs(change) / 60, 1) * 50;
    var color = change >= 0 ? 'var(--up)' : 'var(--down)';
    var style = change >= 0
      ? 'left:50%;width:' + half + '%;background:' + color
      : 'left:' + (50 - half) + '%;width:' + half + '%;background:' + color;
    return '<span class="tick"><i style="' + style + '"></i></span>';
  }

  // ---------- value bar: implied value against the board's strongest row ----------
  var maxValue = 1;
  function valueBar(r) {
    var pct = Math.max(3, Math.round((r.implied_value_usd / maxValue) * 100));
    return '<span class="barwrap"><span class="bar" style="width:' + pct + '%"></span><span class="bartext">' + fmtUsd(r.implied_value_usd) + '</span></span>';
  }

  // ---------- board table ----------
  var COLS = [
    { key: 'rank', label: '#', cls: 'num' },
    { key: 'name', label: 'Protocol' },
    { key: 'category', label: 'Category' },
    { key: 'tvl_usd', label: 'TVL', cls: 'num' },
    { key: 'change_7d', label: '7d', cls: 'num' },
    { key: 'age_days', label: 'No-token age', cls: 'num' },
    { key: 'implied_value_usd', label: 'Implied value', cls: 'num' },
  ];
  function renderTableHead() {
    return '<thead><tr>' + COLS.map(function (c) {
      var on = state.sort === c.key;
      return '<th data-key="' + c.key + '" class="' + (c.cls || '') + (on ? ' sorted' : '') + '">' +
        c.label + (on ? ' <span class="dir">' + (state.dir > 0 ? '▲' : '▼') + '</span>' : '') + '</th>';
    }).join('') + '</tr></thead>';
  }
  function sortRows(rows) {
    var key = state.sort, dir = state.dir;
    return rows.slice().sort(function (a, b) {
      var x = a[key], y = b[key];
      if (key === 'name' || key === 'category') {
        var sx = String(x == null ? '' : x).toLowerCase(), sy = String(y == null ? '' : y).toLowerCase();
        return sx < sy ? -dir : sx > sy ? dir : a.rank - b.rank;
      }
      var nx = x == null ? -Infinity : x, ny = y == null ? -Infinity : y;
      return nx < ny ? -dir : nx > ny ? dir : a.rank - b.rank;
    });
  }
  function visibleRows() {
    var q = state.q.trim().toLowerCase();
    var watchSet = D.watch || {};
    return D.rows.filter(function (r) {
      if (state.wl === 'watch' && !watchSet[r.slug]) return false;
      if (state.wl === 'early' && watchSet[r.slug]) return false;
      if (state.cat !== 'all' && r.category !== state.cat) return false;
      if (!q) return true;
      return (r.name + ' ' + r.slug + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase().indexOf(q) >= 0;
    });
  }
  function renderBoard() {
    var rows = sortRows(visibleRows());
    var html = '<table>' + renderTableHead() + '<tbody>' + rows.map(function (r) {
      var watch = D.watch && D.watch[r.slug];
      var chg = r.change_7d == null ? '<span class="flat">n/a</span>'
        : '<span class="' + (r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(r.change_7d) + '</span>' + tick(r.change_7d);
      return '<tr class="row ' + (watch ? 'watch' : 'early') + '" data-slug="' + esc(r.slug) + '">' +
        '<td class="rank' + (r.rank <= 3 ? ' top' : '') + '">' + r.rank + '</td>' +
        '<td class="pname">' + esc(r.name) + '<small>' + esc(r.slug) + ' · ' + r.chains.slice(0, 3).join(', ') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</small></td>' +
        '<td>' + (r.category ? '<span class="tag">' + esc(r.category) + '</span>' : '<span class="flat">—</span>') + '</td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num">' + chg + '</td>' +
        '<td class="num">' + fmtAge(r.age_days) + '</td>' +
        '<td class="val">' + valueBar(r) + '</td>' +
        '</tr>';
    }).join('');
    if (!rows.length) html += '<tr><td colspan="7"><div class="empty">No protocol matches the filter.</div></td></tr>';
    html += '</tbody></table>';
    var el = document.getElementById('board');
    el.innerHTML = html;
    Array.prototype.forEach.call(el.querySelectorAll('tr.row'), function (tr) {
      tr.addEventListener('click', function () { openDrawer(tr.getAttribute('data-slug')); });
    });
    Array.prototype.forEach.call(el.querySelectorAll('th'), function (th) {
      th.addEventListener('click', function () {
        var key = th.getAttribute('data-key');
        if (state.sort === key) state.dir = -state.dir;
        else { state.sort = key; state.dir = key === 'rank' ? 1 : -1; }
        renderBoard();
      });
    });
  }

  // ---------- live-token view ----------
  function renderLive() {
    var html = D.live.map(function (p) {
      return '<div class="live-card"><div class="grow"><b>' + esc(p.name) + '</b> <span class="tag">' + esc(p.category || '—') + '</span><br>' +
        '<small style="color:var(--faint)">' + esc(p.chains.slice(0, 4).join(', ')) + ' · TVL ' + fmtUsd(p.tvl_usd) + '</small></div>' +
        '<div class="num">' + (p.change_7d == null ? '<span class="flat">n/a</span>' : '<span class="' + (p.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(p.change_7d) + '</span>') + '</div>' +
        '<div class="mcap">' + fmtUsd(p.mcap_usd) + ' mcap</div></div>';
    }).join('');
    document.getElementById('live').innerHTML =
      '<p class="method" style="margin:0 0 14px">Protocols whose token already trades, kept out of the ranked board on purpose: their value is the market\'s own, so they are the comparison set, not the find.</p>' + html;
  }

  // ---------- detail drawer ----------
  function openDrawer(slug) {
    var r = null;
    D.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return;
    state.pick = slug;
    var m = D.model;
    var growth = Math.min(m.growth_cap, Math.max(m.growth_floor, r.change_7d == null ? 0 : r.change_7d));
    var growthMult = 1 + (growth / 100) * m.growth_weight;
    var age = r.age_days == null ? m.unknown_age_days : r.age_days;
    var maturity = m.maturity_floor + (Math.min(Math.max(age, 0), m.maturity_days) / m.maturity_days) * m.maturity_range;
    var breakdown =
      '<div class="breakdown">TVL ' + fmtUsd(r.tvl_usd) + ' × <b>' + m.base_multiple + '</b>' +
      ' × growth <b>×' + growthMult.toFixed(3) + '</b>' +
      ' × maturity <b>×' + maturity.toFixed(3) + '</b><br>' +
      '= <span class="res">' + fmtUsd(r.implied_value_usd) + ' implied</span>' +
      ' <span style="color:var(--faint)">(model ' + esc(D.model_version) + ')</span></div>';
    var steps = r.farm_steps || [];
    var drawer = document.getElementById('drawer');
    drawer.innerHTML =
      '<button class="close" id="dx">✕</button>' +
      '<h2>' + esc(r.name) + '</h2>' +
      '<p class="sub">' + esc(r.slug) + ' · rank #' + r.rank + ' · ' + (D.watch && D.watch[r.slug] ? 'on the snapshot watchlist' : 'early radar find, below the floor') + '</p>' +
      '<div class="badges">' + r.chains.map(function (c) { return '<span class="tag">' + esc(c) + '</span>'; }).join('') +
      (r.category ? '<span class="tag">' + esc(r.category) + '</span>' : '') + '</div>' +
      '<div class="bigval">' + fmtUsd(r.implied_value_usd) + ' <small>IMPLIED IF IT LAUNCHES</small></div>' +
      breakdown +
      '<div class="grid2">' +
      '<div class="kv"><span>TVL</span><b>' + fmtUsd(r.tvl_usd) + '</b></div>' +
      '<div class="kv"><span>7-day change</span><b class="' + (r.change_7d == null ? '' : r.change_7d >= 0 ? 'pos' : 'neg') + '">' + (r.change_7d == null ? 'n/a' : fmtPct(r.change_7d)) + '</b></div>' +
      '<div class="kv"><span>Tracked since</span><b>' + esc(r.listed_at || 'unknown') + '</b></div>' +
      '<div class="kv"><span>No-token age</span><b>' + fmtAge(r.age_days) + '</b></div>' +
      '</div>' +
      '<h3 style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim)">Farm plan</h3>' +
      '<ul class="steps">' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
    drawer.hidden = false;
    document.getElementById('scrim').hidden = false;
    document.getElementById('dx').addEventListener('click', closeDrawer);
    document.getElementById('scrim').addEventListener('click', closeDrawer);
  }
  function closeDrawer() {
    state.pick = null;
    document.getElementById('drawer').hidden = true;
    document.getElementById('scrim').hidden = true;
  }

  // ---------- wiring ----------
  function setTab(tab) {
    state.tab = tab;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    document.getElementById('board').hidden = tab !== 'board';
    document.getElementById('live').hidden = tab !== 'live';
  }

  renderHeader();
  fillCategories();
  D.rows.forEach(function (r) { if (r.implied_value_usd > maxValue) maxValue = r.implied_value_usd; });
  renderBoard();
  renderLive();

  document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value; renderBoard(); });
  document.getElementById('cat').addEventListener('change', function (e) { state.cat = e.target.value; renderBoard(); });
  document.getElementById('wl').addEventListener('change', function (e) { state.wl = e.target.value; renderBoard(); });
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
    b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
})();
