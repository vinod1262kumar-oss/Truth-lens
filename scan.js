(function () {
  var $ = function (i) { return document.getElementById(i); };
  var MAIN = [['added_sugars', 'Added sugars', 'g'], ['total_sugars', 'Total sugars', 'g'], ['total_fat', 'Total fat', 'g'], ['sat_fat', 'Saturated fat', 'g'], ['trans_fat', 'Trans fat', 'g'], ['sodium', 'Sodium', 'mg']];
  var MORE = [['energy_kcal', 'Energy', 'kcal'], ['protein', 'Protein', 'g'], ['carbs', 'Carbohydrate', 'g'], ['cholesterol', 'Cholesterol', 'mg'], ['fibre', 'Dietary fibre', 'g'], ['salt', 'Salt (if no sodium)', 'g']];
  var F = MAIN.concat(MORE), busy = false, lastId = null;
  function inputs(l) { return l.map(function (f) { return '<div><label for="f_' + f[0] + '">' + f[1] + ' (' + f[2] + ')</label><input id="f_' + f[0] + '" type="number" inputmode="decimal" min="0" step="any"></div>'; }).join(''); }
  $('fieldsMain').innerHTML = inputs(MAIN); $('fieldsMore').innerHTML = inputs(MORE);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var HEADS = /^(Bottom line|What to do|Better choices|Your question)$/i;
  function fmt(t) {
    return String(t).split('\n').map(function (l) {
      l = l.trim().replace(/\*\*/g, ''); if (!l) return '';
      if (HEADS.test(l.replace(/:$/, ''))) return '<b>' + esc(l.replace(/:$/, '')) + '</b>';
      return '<div>' + esc(l.replace(/^[-*]\s*/, '\u2022 ')) + '</div>';
    }).join('');
  }
  function num(id) { var v = parseFloat($(id).value); return isNaN(v) ? null : v; }
  function say(t, bad, code) { var m = $('msg'); m.className = 'note' + (bad ? ' err' : ''); m.textContent = (t || '') + (code && bad ? ' (code: ' + code + ')' : ''); }
  function readForm() { var o = { product_name: $('f_name').value.trim(), serving_size_g: num('f_serving') }; F.forEach(function (f) { o[f[0]] = num('f_' + f[0]); }); return o; }
  function fill(n) {
    $('f_name').value = n.product_name || ''; $('f_serving').value = n.serving_size_g == null ? '' : n.serving_size_g;
    F.forEach(function (f) { $('f_' + f[0]).value = n[f[0]] == null ? '' : n[f[0]]; });
  }
  function compress(file) {
    return new Promise(function (ok, bad) {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        ok({ data: c.toDataURL('image/jpeg', 0.85).split(',')[1], url: c.toDataURL('image/jpeg', 0.4) });
      };
      img.onerror = bad; img.src = URL.createObjectURL(file);
    });
  }
  function render(a) {
    var top = '<div class="verdict ' + a.verdict.level + '"><b>' + a.verdict.title + '</b><span>' + a.verdict.text + '</span></div>';
    if (a.safe_grams !== null) top += '<div class="big">About ' + a.safe_grams + ' g</div>';
    top += '<p class="lead">' + a.headline + '</p>';
    var more = '';
    if (a.points.length) more += '<ul>' + a.points.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>';
    more += a.rows.map(function (r) {
      return '<div class="nrow"><div class="nh"><b>' + r.name + '</b><span class="badge ' + r.level + '">' + r.level.charAt(0).toUpperCase() + r.level.slice(1) + '</span></div><div class="nd">' + r.text + '</div></div>';
    }).join('');
    if (a.info.length) more += '<p style="margin-top:12px">' + a.info.map(function (i) { return '<span class="tag">' + i + '</span>'; }).join('') + '</p>';
    if (a.tip) more += '<p><b>What to do:</b> ' + a.tip + '</p>';
    more += a.notes.map(function (n) { return '<p class="note">' + n + '</p>'; }).join('');
    $('resTitle').textContent = a.product ? 'Result: ' + a.product : 'Your result';
    $('resTop').innerHTML = top; $('resMore').innerHTML = more; $('sumOut').hidden = true; $('result').hidden = false;
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function handle(res) {
    if (res.status === 402) { $('modal').hidden = false; TL.setLeft(0); return false; }
    if (res.status === 401) { say('Your session ended. Please sign in again.', true, res.data.code); return false; }
    if (res.status >= 400 || res.status === 0) { say(res.data.error || 'Something went wrong.', true, res.data.code); return false; }
    if (res.data.nutrients) fill(res.data.nutrients);
    lastId = res.data.scan_id || null;
    TL.setLeft(res.data.left); render(res.data.analysis); return true;
  }
  async function doScan(file) {
    if (!file || busy) return;
    busy = true; $('takeBtn').disabled = $('pickBtn').disabled = true; say('Reading the label... this takes a few seconds.');
    try {
      var j = await compress(file);
      $('preview').src = j.url; $('preview').hidden = false;
      var res = await TL.api('/api/scan', { image: j.data, mime: 'image/jpeg' });
      if (handle(res)) say('Label read. Wrong number? Tap Edit values, fix it and check again (free).');
    } catch (e) { say('Could not open that photo. Try another one.', true, 'photo'); }
    busy = false; $('takeBtn').disabled = $('pickBtn').disabled = false; $('camIn').value = ''; $('picIn').value = '';
  }
  $('takeBtn').onclick = function () { $('camIn').click(); };
  $('pickBtn').onclick = function () { $('picIn').click(); };
  $('camIn').onchange = $('picIn').onchange = function (e) { doScan(e.target.files && e.target.files[0]); };
  $('calc').onclick = async function () {
    if (busy) return; busy = true; $('calc').disabled = true; say('');
    var res = await TL.api('/api/check', readForm());
    handle(res); busy = false; $('calc').disabled = false;
  };
  $('editBtn').onclick = function () { $('manual').open = true; $('manual').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $('sumBtn').onclick = async function () {
    var out = $('sumOut'), b = $('sumBtn');
    if (busy) return;
    out.hidden = false;
    if (!lastId) { out.className = 'sumbox err'; out.textContent = 'Summary needs your history to be set up first. Please try again later.'; return; }
    busy = true; b.disabled = true; b.textContent = 'Writing summary...';
    var res = await TL.api('/api/summary', { scan_id: lastId, question: $('ask').value.trim() });
    busy = false; b.disabled = false; b.textContent = 'Summarize with AI';
    if (res.status !== 200) { out.className = 'sumbox err'; out.textContent = (res.data.error || 'Could not make a summary.') + (res.data.code ? ' (code: ' + res.data.code + ')' : ''); return; }
    out.className = 'sumbox'; out.innerHTML = fmt(res.data.summary);
  };
  $('closeModal').onclick = function () { $('modal').hidden = true; };
  $('google').onclick = function () { if (TL.sb) TL.signIn(); };
})();
