(function(){
  const chat=document.getElementById('chat'), form=document.getElementById('composer'), input=document.getElementById('prompt'), send=form.querySelector('button');
  const loginStatus=document.getElementById('loginStatus'), signIn=document.getElementById('signIn');
  const scanBtn=document.getElementById('scanBtn'), scanPanel=document.getElementById('scanPanel'), labelInput=document.getElementById('labelInput'), scanResult=document.getElementById('scanResult'), clearBtn=document.getElementById('clearBtn');
  let sb=null, token=null, history=[];

  const esc=t=>String(t||'');
  function add(role,text){const a=document.createElement('article');a.className='msg '+role;const b=document.createElement('b');b.textContent=role==='user'?'You':'Durva';const p=document.createElement('p');p.textContent=esc(text);a.append(b,p);chat.appendChild(a);a.scrollIntoView({behavior:'smooth',block:'end'});}
  function welcome(){if(!chat.children.length)add('ai','Hi! I’m Durva. Ask me about nutrition, food labels, workouts, recovery, sleep, hydration, meal plans or wellness tasks.');}
  async function api(path,body,method){
    const headers={'Content-Type':'application/json'}; if(token) headers.Authorization='Bearer '+token;
    const r=await fetch(path,{method:method||(body?'POST':'GET'),headers,body:body?JSON.stringify(body):undefined});
    const d=await r.json().catch(()=>({error:'Unexpected server response.'}));
    return {ok:r.ok,status:r.status,data:d};
  }
  async function initAuth(){
    try{
      const c=await fetch('/api/config').then(r=>r.json());
      sb=supabase.createClient(c.url,c.anonKey);
      const s=await sb.auth.getSession(); setSession(s.data.session);
      sb.auth.onAuthStateChange((_e,sess)=>setSession(sess));
      if(token) await loadHistory(); else welcome();
    }catch(e){loginStatus.textContent='Offline';welcome();}
  }
  async function setSession(s){
    token=s?s.access_token:null;
    loginStatus.textContent=s?'Signed in':'Not signed in';
    signIn.hidden=!!s;
    if(!s){history=[];chat.innerHTML='';welcome();return;}
    await loadHistory();
  }
  signIn.addEventListener('click',async()=>{
    if(!sb)return;
    try{await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/durva'}})}catch(e){loginStatus.textContent='Sign-in failed';}
  });
  async function loadHistory(){
    const r=await api('/api/durva/history');
    if(!r.ok){welcome();return;}
    history=(r.data.items||[]).map(x=>({role:x.role,text:x.message}));
    chat.innerHTML='';
    if(!history.length){welcome();return;}
    history.slice(-50).forEach(x=>add(x.role==='user'?'user':'ai',x.text));
  }
  async function ask(text){
    text=text.trim();if(!text)return;
    add('user',text);history.push({role:'user',text});input.value='';send.disabled=true;
    const loading=document.createElement('article');loading.className='msg ai';loading.innerHTML='<b>Durva</b><p>Thinking…</p>';chat.appendChild(loading);
    try{
      if(!token) throw new Error('Please sign in to use Durva AI.');
      const r=await api('/api/durva',{message:text,history:history.slice(-12)});
      if(!r.ok) throw new Error(r.data.error||'Durva could not answer right now.');
      loading.remove();const answer=r.data.answer||'I could not generate an answer. Please try again.';add('ai',answer);history.push({role:'model',text:answer});
    }catch(e){loading.querySelector('p').textContent=e.message;}
    finally{send.disabled=false;input.focus();}
  }
  form.addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
  document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.prompt)));
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,130)+'px'});
  scanBtn.addEventListener('click',()=>{scanPanel.hidden=!scanPanel.hidden;if(!scanPanel.hidden)labelInput.focus()});
  labelInput.addEventListener('change',async()=>{
    const file=labelInput.files&&labelInput.files[0];if(!file)return;
    if(!token){scanResult.hidden=false;scanResult.textContent='Please sign in before scanning a label.';return;}
    scanResult.hidden=false;scanResult.textContent='Reading label…';
    try{
      const b64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(file)});
      const r=await api('/api/scan',{image:b64,mime:file.type||'image/jpeg'});
      if(!r.ok) throw new Error(r.data.error||'The label could not be read.');
      const a=r.data.analysis||{}, n=r.data.nutrients||{};
      scanResult.innerHTML='';
      const title=document.createElement('strong');title.textContent=n.product_name||'Label scan complete';
      const p=document.createElement('p');p.textContent=(a.verdict&&a.verdict.title?a.verdict.title+'. ':'')+(a.headline||'Nutrition values were extracted.');
      scanResult.append(title,p);
      add('ai','Label scan: '+(n.product_name||'Unknown product')+'\n'+(a.headline||'Nutrition values extracted.')+'\nAsk me anything about this label.');
    }catch(e){scanResult.textContent=e.message;}
  });
  clearBtn.addEventListener('click',async()=>{
    if(!token){chat.innerHTML='';history=[];welcome();return;}
    if(!confirm('Clear your Durva chat history?'))return;
    const r=await api('/api/durva/history',null,'DELETE');
    if(r.ok){history=[];chat.innerHTML='';welcome();}
  });
  initAuth();
})();
