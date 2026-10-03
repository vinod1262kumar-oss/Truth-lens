(function(){
  var TL=window.TL;
  function boot(){
    var form=document.getElementById('durvaForm'), input=document.getElementById('durvaInput'), msgs=document.getElementById('durvaMessages'), out=document.getElementById('durvaPlanOut'), scan=document.getElementById('durvaScan'), file=document.getElementById('durvaFile');
    if(!form||!input||!msgs||!TL)return;
    function add(text,who){var d=document.createElement('div');d.className='durva-msg '+(who||'ai');d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;return d;}
    function needAuth(){if(!TL.token){add('Please sign in first so Durva can use your private TruthLens features.','ai');return true}return false}
    async function send(q){
      q=(q||'').trim(); if(!q)return; if(needAuth())return; add(q,'user'); input.value=''; var loading=add('Durva is thinking…','ai');
      var r=await TL.api('/api/durva',{message:q}); loading.remove();
      if(r.status!==200){add(r.data&&r.data.error?r.data.error:'Durva could not respond right now. Please try again.','ai');return;}
      add(r.data.reply||'Done.','ai');
      if(r.data.plan){out.hidden=false;out.innerHTML='';var h=document.createElement('h4');h.textContent=r.data.plan.title||'Your plan';out.appendChild(h);var p=document.createElement('p');p.textContent=r.data.plan.summary||'';out.appendChild(p);var ul=document.createElement('ul');(r.data.plan.meals||[]).forEach(function(x){var li=document.createElement('li');li.textContent=x;ul.appendChild(li)});out.appendChild(ul)}
      if(Array.isArray(r.data.tasks)&&r.data.tasks.length){add('Tasks:\n- '+r.data.tasks.map(function(t){return typeof t==='string'?t:(t.title||t.task||JSON.stringify(t))}).join('\n- '),'ai')}
    }
    async function scanLabel(){
      if(needAuth())return; var f=file.files&&file.files[0]; if(!f)return; add('Scan this label with OCR','user'); var wait=add('Reading the label with Gemini…','ai');
      var reader=new FileReader(); reader.onload=async function(){var b64=String(reader.result).split(',')[1]||'';var r=await TL.api('/api/scan',{image:b64,mime:f.type||'image/jpeg'});wait.remove();if(r.status!==200){add(r.data&&r.data.error?r.data.error:'I could not read that label.','ai');return}var a=r.data.analysis||{};add((a.product?a.product+' — ':'')+(a.verdict&&a.verdict.title?a.verdict.title:'Scan complete.')+'\n'+(a.headline||''),'ai')}; reader.readAsDataURL(f)
    }
    form.addEventListener('submit',function(e){e.preventDefault();send(input.value)});
    document.querySelectorAll('.durva-tool[data-q]').forEach(function(b){b.addEventListener('click',function(){send(b.getAttribute('data-q'))})});
    if(scan&&file){scan.addEventListener('click',function(){if(!needAuth())file.click()});file.addEventListener('change',scanLabel)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
