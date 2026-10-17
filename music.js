'use strict';
(() => {
  if (document.getElementById('fabyab-music')) return;
  const audio=document.createElement('audio');
  audio.id='fabyab-music';audio.src='assets/audio/wonders-of-the-earth.mp3';
  audio.preload='none';audio.loop=true;audio.setAttribute('playsinline','');audio.hidden=true;
  const button=document.createElement('button');button.type='button';button.id='music-toggle';button.className='music-toggle';
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><g class="music-waves"><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></g><path class="music-mute" d="m16 9 5 6m0-6-5 6"/></svg><span></span>';
  const status=document.createElement('span');status.className='music-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  document.body.append(audio,button,status);
  const copy={
    en:{name:'Music',on:'Mute background music',off:'Play background music',failed:'Music could not load. Press the music button to try again.'},
    ar:{name:'الموسيقى',on:'كتم موسيقى الخلفية',off:'تشغيل موسيقى الخلفية',failed:'تعذر تحميل الموسيقى، اضغط زر الموسيقى للمحاولة مجددًا.'},
    tr:{name:'Müzik',on:'Arka plan müziğini kapat',off:'Arka plan müziğini çal',failed:'Müzik yüklenemedi. Yeniden denemek için müzik düğmesine basın.'},
    ckb:{name:'مۆسیقا',on:'بێدەنگکردنی مۆسیقای پاشبنەما',off:'لێدانی مۆسیقای پاشبنەما',failed:'مۆسیقا بار نەکرا. بۆ هەوڵدانەوە دوگمەی مۆسیقا دابگرە.'}
  };
  let desired=true,filmActive=false,pending=false,generation=0;
  const words=()=>copy[document.documentElement.lang]||copy.en;
  function draw(){
    const active=!audio.paused&&!audio.ended,w=words();
    button.classList.toggle('is-playing',active);button.setAttribute('aria-pressed',String(active));
    button.setAttribute('aria-label',active?w.on:w.off);button.title=active?w.on:w.off;
    button.setAttribute('aria-busy',String(pending));button.querySelector('span').textContent=w.name;
    button.lang=document.documentElement.lang;button.dir=['ar','ckb'].includes(button.lang)?'rtl':'ltr';
  }
  function pause(){generation++;pending=false;audio.pause();draw();}
  function play(){
    if(!desired||filmActive||document.hidden||pending||(!audio.paused&&!audio.ended))return;
    const run=++generation;pending=true;status.textContent='';draw();
    try{
      Promise.resolve(audio.play()).then(()=>{
        if(run!==generation){if(!desired||filmActive||document.hidden)audio.pause();return;}
        pending=false;draw();
      }).catch(error=>{
        if(run!==generation)return;pending=false;draw();
        // Autoplay denial is expected on some devices; retry on a user gesture.
        if(error?.name!=='NotAllowedError'&&error?.name!=='AbortError')status.textContent=words().failed;
      });
    }catch{pending=false;draw();status.textContent=words().failed;}
  }
  function filmState(state){if(state===1||state===3){filmActive=true;pause();}else if(state===0||state===2){filmActive=false;play();}}
  function startFilm(){filmActive=true;pause();}
  button.addEventListener('click',()=>{
    if(!audio.paused||pending){desired=false;pause();return;}
    desired=true;
    if(filmActive){
      const frame=document.getElementById('fabyab-film-player');
      frame?.contentWindow?.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}), 'https://www.youtube-nocookie.com');
      filmActive=false;
    }
    play();
  });
  function interaction(event){
    if(event.target.closest?.('#music-toggle,#film-play,#film-screen,[data-video]'))return;
    play();
  }
  document.addEventListener('pointerdown',interaction,{passive:true});
  document.addEventListener('touchend',interaction,{passive:true});
  document.addEventListener('click',interaction,{passive:true});
  document.addEventListener('keydown',interaction,{passive:true});
  document.getElementById('film-play')?.addEventListener('click',()=>{
    // Local HTML opens YouTube in another tab; visibility handling pauses music there.
    if(['http:','https:'].includes(window.location.protocol))startFilm();
  },true);
  document.addEventListener('fabyab:film-state',event=>filmState(event.detail.state));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)play();});
  window.addEventListener('pagehide',pause);window.addEventListener('pageshow',play);
  audio.addEventListener('playing',draw);audio.addEventListener('pause',draw);
  audio.addEventListener('error',()=>{pending=false;draw();status.textContent=words().failed;});
  if(window.MutationObserver)new window.MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  draw();play();
})();
