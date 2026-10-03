(function(){
  const chat=document.getElementById('chat'), form=document.getElementById('composer'), input=document.getElementById('prompt'), send=form.querySelector('button');
  const history=[];
  function add(role,text){const a=document.createElement('article');a.className='msg '+role;a.innerHTML='<b>'+ (role==='user'?'You':'Durva') +'</b><p></p>';a.querySelector('p').textContent=text;chat.appendChild(a);a.scrollIntoView({behavior:'smooth',block:'end'});}
  async function ask(text){text=text.trim();if(!text)return;add('user',text);history.push({role:'user',text});input.value='';send.disabled=true;const loading=document.createElement('article');loading.className='msg ai';loading.innerHTML='<b>Durva</b><p>Thinking…</p>';chat.appendChild(loading);try{const r=await fetch('/api/durva',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:history.slice(-12)})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Durva could not answer right now.');loading.remove();add('ai',d.answer||'I could not generate an answer. Please try again.');history.push({role:'model',text:d.answer||''});}catch(e){loading.querySelector('p').textContent=e.message+' If the problem continues, check the server Gemini configuration.';}finally{send.disabled=false;input.focus();}}
  form.addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
  document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.prompt)));
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,130)+'px'});
})();
