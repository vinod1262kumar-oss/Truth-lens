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
    if (location.pathname !== '/login') { location.href = '/login'; return; }
    if (TL.sb) TL.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/login' } });
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

  /* ---------- Durva: floating OCR + Gemini agent ---------- */
  (function(){
    var root=document.createElement('div');
    root.innerHTML=
      '<button class="durva-launch" id="durvaLaunch" aria-label="Open Durva AI assistant"><span>Durva</span></button>'+
      '<section class="durva-panel" id="durvaPanel" hidden aria-label="Durva AI assistant">'+
        '<div class="durva-head"><div class="durva-name"><div class="durva-avatar">D</div><div><strong>Durva</strong><small>Powered by Harsh · OCR + AI</small></div></div><button class="durva-close" id="durvaClose" aria-label="Close">×</button></div>'+
        '<div class="durva-messages" id="durvaMessages"></div>'+
        '<div class="durva-tools"><button class="durva-tool" id="durvaScan">📷 Scan label</button><button class="durva-tool" id="durvaPlan">🥗 Make a plan</button><button class="durva-tool" id="durvaTasks">✓ Create tasks</button></div>'+
        '<input class="durva-scan" id="durvaFile" type="file" accept="image/*" capture="environment">'+
        '<div class="durva-input"><input id="durvaInput" maxlength="600" placeholder="Ask Durva…"><button class="durva-send" id="durvaSend">→</button></div>'+
        '<div class="durva-plan" id="durvaPlanOut" hidden></div>'+
      '</section>';
    document.body.appendChild(root);
    var launch=document.getElementById('durvaLaunch'), panel=document.getElementById('durvaPanel');
    var close=document.getElementById('durvaClose'), msgs=document.getElementById('durvaMessages');
    var input=document.getElementById('durvaInput'), send=document.getElementById('durvaSend');
    var scan=document.getElementById('durvaScan'), file=document.getElementById('durvaFile');
    var planBtn=document.getElementById('durvaPlan'), taskBtn=document.getElementById('durvaTasks'), planOut=document.getElementById('durvaPlanOut');
    var greeted=false;
    function add(text,who){var d=document.createElement('div');d.className='durva-msg '+(who||'ai');d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;return d;}
    function open(){panel.hidden=false;if(!greeted){add('Hi! I’m Durva 👋\\nI can read a nutrition label with OCR and help you make balanced food routines and simple tasks.');greeted=true;}}
    launch.onclick=open; close.onclick=function(){panel.hidden=true;};
    function authNeeded(){if(!TL.token){add('Please sign in first, then I can use your private scan and planning features.');return true;}return false;}
    async function ask(q){
      if(!q.trim())return;
      if(authNeeded())return;
      add(q,'user'); input.value=''; var wait=add('Thinking…');
      var r=await TL.api('/api/durva',{message:q});
      wait.remove();
      if(r.status!==200){add(r.data&&r.data.error||'Durva could not reply right now.');return;}
      var d=r.data||{}; add(d.reply||'Done.');
      if(d.plan||d.tasks){
        planOut.hidden=false;
        var html='';
        if(d.plan) html+='<h4>'+escapeHtml(d.plan.title||'Balanced plan')+'</h4><div>'+escapeHtml(d.plan.summary||'')+'</div>';
        if(Array.isArray(d.plan&&d.plan.meals)) html+='<ul>'+d.plan.meals.map(function(x){return '<li>'+escapeHtml(x)+'</li>';}).join('')+'</ul>';
        if(Array.isArray(d.tasks)) html+='<h4>Tasks</h4><ul>'+d.tasks.map(function(x){return '<li>'+escapeHtml(typeof x==='string'?x:(x.title||''))+'</li>';}).join('')+'</ul>';
        planOut.innerHTML=html;
        try{localStorage.setItem('durva_plan',JSON.stringify(d));}catch(e){}
      }
    }
    function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
    send.onclick=function(){ask(input.value);}; input.addEventListener('keydown',function(e){if(e.key==='Enter')ask(input.value);});
    planBtn.onclick=function(){open();input.value='Create a simple balanced 1-day food plan with breakfast, lunch, snack and dinner. Avoid calorie counting and extreme restrictions.';ask(input.value);};
    taskBtn.onclick=function(){open();input.value='Create 5 simple daily food and hydration tasks for a healthy routine.';ask(input.value);};
    scan.onclick=function(){open();if(authNeeded())return;file.click();};
    file.onchange=async function(){
      var f=file.files&&file.files[0]; if(!f)return;
      add('Scan this label with OCR','user'); var wait=add('Reading the label with Gemini…');
      var reader=new FileReader();
      reader.onload=async function(){
        var b64=String(reader.result).split(',')[1]||'';
        var r=await TL.api('/api/scan',{image:b64,mime:f.type||'image/jpeg'});
        wait.remove();
        if(r.status!==200){add(r.data&&r.data.error||'I could not read that label.');return;}
        var a=r.data.analysis;
        add((a.product?a.product+' — ':'')+(a.verdict&&a.verdict.title?a.verdict.title:'Scan complete.')+'\\n'+(a.headline||''));
      };
      reader.readAsDataURL(f);
    };
  })();
})();
