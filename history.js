(function () {
  var $ = function (i) { return document.getElementById(i); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var HEADS = /^(Bottom line|What to do|Better choices|Your question)$/i;
  function fmt(t) {
    return String(t).split('\n').map(function (l) {
      l = l.trim().replace(/\*\*/g, ''); if (!l) return '';
      if (HEADS.test(l.replace(/:$/, ''))) return '<b>' + esc(l.replace(/:$/, '')) + '</b>';
      return '<div>' + esc(l.replace(/^[-*]\s*/, '\u2022 ')) + '</div>';
    }).join('');
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function card(it) {
    var a = it.analysis || {}, v = a.verdict || { level: 'low', title: '' };
    var main = it.safe_grams != null ? 'About ' + it.safe_grams + ' g' + (it.limiting ? ' &middot; ' + esc(it.limiting) : '') : 'No limit reached';
    var d = new Date(it.created_at).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    var rows = (a.rows || []).map(function (r) { return '<div class="nrow"><div class="nh"><b>' + r.name + '</b><span class="badge ' + r.level + '">' + cap(r.level) + '</span></div><div class="nd">' + r.text + '</div></div>'; }).join('');
    return '<details class="glass hcard"><summary><span class="hs"><b>' + esc(it.product_name || 'Untitled product') + '</b><small>' + esc(d) + ' &middot; ' + (it.source === 'scan' ? 'Camera scan' : 'Manual') + '</small><small>' + main + '</small></span><span class="badge ' + v.level + '">' + cap(v.level) + '</span></summary>' +
      '<div class="hb"><p><b>' + esc(v.title) + '</b></p><p class="lead">' + (a.headline || '') + '</p>' + (it.summary ? '<div class="sumbox">' + fmt(it.summary) + '</div>' : '') + '<details class="more"><summary>Nutrient details</summary>' + rows + '</details><p><button class="mini" type="button" data-del="' + it.id + '">Delete this item</button></p></div></details>';
  }
  async function load() {
    var m = $('hmsg'); m.className = 'note'; m.textContent = 'Loading...';
    var r = await TL.api('/api/history');
    if (r.status !== 200) { m.className = 'note err'; m.textContent = (r.data.error || 'Could not load history.') + (r.data.code ? ' (code: ' + r.data.code + ')' : ''); return; }
    var items = r.data.items || [];
    $('list').innerHTML = items.map(card).join('');
    $('clearAll').hidden = !items.length;
    m.textContent = items.length ? items.length + ' saved item' + (items.length === 1 ? '' : 's') + '. Tap one to open it.' : 'Nothing here yet. Scan a label and it will show up here.';
  }
  $('list').onclick = async function (e) {
    var id = e.target.getAttribute && e.target.getAttribute('data-del');
    if (!id || !confirm('Delete this item?')) return;
    await TL.api('/api/history/' + id, null, 'DELETE'); load();
  };
  $('clearAll').onclick = async function () {
    if (!confirm('Delete all your history? This cannot be undone.')) return;
    await TL.api('/api/history', null, 'DELETE'); load();
  };
  $('google').onclick = function () { if (TL.sb) TL.signIn(); };
  var started = false;
  TL.onAuth(function (s) { if (s && !started) { started = true; load(); } });
})();
