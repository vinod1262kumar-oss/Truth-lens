(function(){
  var stage=document.getElementById('mascotStage');
  var email=document.getElementById('email');
  var form=document.getElementById('loginForm');
  var google=document.getElementById('googleLogin');
  var status=document.getElementById('loginStatus');
  function reveal(){ if(stage) stage.classList.add('revealed'); }
  ['focus','input'].forEach(function(ev){ if(email) email.addEventListener(ev,reveal); });
  function say(msg,err){ status.textContent=msg||''; status.className='login-status'+(err?' err':''); }
  function ready(){
    if(!window.TL || !TL.sb) return false;
    return true;
  }
  if(window.TL) TL.onAuth(function(s){
    if(s){ window.location.replace('/scan'); }
  });
  form.addEventListener('submit',async function(e){
    e.preventDefault(); reveal();
    if(!ready()){say('Login service is still loading. Try again.',true);return;}
    var value=email.value.trim();
    if(!value){say('Enter your email address.',true);return;}
    say('Sending your secure sign-in link…');
    var r=await TL.sb.auth.signInWithOtp({email:value,options:{emailRedirectTo:location.origin+'/login'}});
    if(r.error) say(r.error.message,true);
    else say('Check your email for the sign-in link.');
  });
  google.addEventListener('click',async function(){
    reveal();
    if(!ready()){say('Login service is still loading. Try again.',true);return;}
    try{localStorage.setItem('tl_next','/scan');}catch(e){}
    say('Opening Google…');
    var r=await TL.sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/login'}});
    if(r.error) say(r.error.message,true);
  });
})();