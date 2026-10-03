(function () {
  var $ = function (i) { return document.getElementById(i); };
  var TL = window.TL = { token: null, sb: null, ready: false, subs: [] };
  TL.api = async function (path, body, method) {
    var hd = { 'Content-Type': 'application/json' };
    if (TL.token) hd.Authorization = 'Bearer ' + TL.token;
    var r;
    try { r = await fetch(path, { method: method || (body ? 'POST' : 'GET'), headers: hd, body: body ? JSON.stringify(body) : undefined }); }
    catch (e) { return { status: 0, data: { error: 'No internet, or the server is waking up. Try again in a moment.', code: 'network' } }; }
    var d = await r.json().catch(function () { return { error: 'The server sent an unexpected reply (status ' + r.status + ').', code: 'bad_reply' }; });
    return { status: r.status, data: d };
  };
  TL.setLeft = function (l) {
    var c = $('chip'); if (!c || l === undefined || l === null && false) return;
    c.hidden = false; c.textContent = l === null ? 'Pro: unlimited' : l + ' free scan' + (l === 1 ? '' : 's') + ' left';
  };
  TL.signIn = function () {
    try { localStorage.setItem('tl_next', '/scan'); } catch (e) {}
    TL.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } });
  };
  TL.onAuth = function (fn) { TL.subs.push(fn); if (TL.ready) fn(!!TL.token); };
  function apply(s) {
    TL.token = s ? s.access_token : null; TL.ready = true;
    document.querySelectorAll('[data-auth]').forEach(function (el) { el.hidden = (el.getAttribute('data-auth') === 'in') !== !!s; });
    var b = $('authBtn'); if (b) b.textContent = s ? 'Sign out' : 'Sign in';
    var c = $('chip'); if (c && !s) c.hidden = true;
    if (s) {
      var nx = null; try { nx = localStorage.getItem('tl_next'); localStorage.removeItem('tl_next'); } catch (e) {}
      if (nx && location.pathname !== nx) { location.replace(nx); return; }
      TL.api('/api/me').then(function (r) { if (r.status === 200) TL.setLeft(r.data.left); });
    }
    TL.subs.forEach(function (fn) { fn(!!s); });
  }
  async function init() {
    document.querySelectorAll('#nav a').forEach(function (a) { if (a.getAttribute('href') === location.pathname) a.className = 'on'; });
    var b = $('authBtn'); if (b) b.onclick = function () { if (!TL.sb) return; TL.token ? TL.sb.auth.signOut() : TL.signIn(); };
    try {
      var c = await (await fetch('/api/config')).json();
      TL.sb = supabase.createClient(c.url, c.anonKey);
      var s = await TL.sb.auth.getSession(); apply(s.data.session);
      TL.sb.auth.onAuthStateChange(function (_e, sess) { apply(sess); });
    } catch (e) { TL.ready = true; TL.subs.forEach(function (fn) { fn(false); }); }
  }
  init();
})();


/* ---------- Durva launcher + parrot-green accent ---------- */
(function () {
  var style = document.createElement('style');
  style.textContent = ':root{--parrot-green:#7CFC00;--parrot-green-dark:#4f9f00}.durva-fab,.durva-button{background:var(--parrot-green)!important;color:#173000!important;border-color:rgba(79,159,0,.25)!important}.durva-fab:hover,.durva-button:hover{filter:saturate(1.05) brightness(.97);box-shadow:0 10px 28px rgba(80,160,0,.25)}';
  document.head.appendChild(style);
  document.addEventListener('click', function (e) {
    var el = e.target.closest('a,button,[role="button"],.durva-fab');
    if (!el) return;
    var label = ((el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.textContent || '')).trim().toLowerCase();
    if (label.indexOf('durva') !== -1 && location.pathname !== '/durva') {
      e.preventDefault();
      location.href = '/durva';
    }
  });
})();
