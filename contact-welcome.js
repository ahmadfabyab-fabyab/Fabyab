'use strict';
(() => {
  const WELCOME={
    en:['Welcome to the world of','Fabyab packaging solutions'],
    ar:['أهلًا بك في عالم','فابياب لحلول التغليف'],
    tr:['Fabyab dünyasına hoş geldiniz','Ambalaj çözümleri'],
    ckb:['بەخێربێیت بۆ جیهانی','فابیاب بۆ چارەسەرەکانی بەستەبەندی']
  };
  class LocationExplorer {
    constructor(root){
      this.root=root;this.tabs=Array.from(root.querySelectorAll('[data-location]'));
      this.panels=Array.from(root.querySelectorAll('.location-panel'));this.map=document.getElementById('location-map');this.dialog=document.querySelector('.location-map-dialog');this.preview=root.querySelector('.location-preview-name');this.active=0;
      this.dialog.querySelector('.location-map-close').addEventListener('click',()=>this.dialog.close());
      this.dialog.addEventListener('click',e=>{if(e.target===this.dialog){const r=this.dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.dialog.close();}});
      this.dialog.addEventListener('close',()=>{this.map.removeAttribute('src');if(this.opener)this.opener.focus();});
      root.addEventListener('click',e=>{
        const tab=e.target.closest('[data-location]');if(tab&&root.contains(tab))this.select(Number(tab.dataset.location));
        const link=e.target.closest('.location-directions');if(!link||!root.contains(link))return;
        // Keep the original Google Maps link as fallback for browsers without dialog support.
        if(typeof this.dialog.showModal!=='function')return;
        e.preventDefault();this.opener=link;
        this.map.setAttribute('src',this.tabs[this.active].dataset.mapSrc);
        this.dialog.querySelector('.location-map-external').href=link.href;
        this.dialog.showModal();
      });
      root.addEventListener('keydown',e=>{
        const tab=e.target.closest('[data-location]');if(!tab)return;
        const rtl=document.documentElement.dir==='rtl';let next=Number(tab.dataset.location);
        if(e.key==='ArrowRight')next+=rtl?-1:1;
        else if(e.key==='ArrowLeft')next+=rtl?1:-1;
        else if(e.key==='Home')next=0;
        else if(e.key==='End')next=this.tabs.length-1;
        else return;
        e.preventDefault();this.select(next,true);
      });
      window.addEventListener('fabyab:languagechange',()=>this.select(this.active));
      this.select(0);
    }
    select(index,focus=false){
      const i=((index%this.tabs.length)+this.tabs.length)%this.tabs.length;this.active=i;
      this.tabs.forEach((tab,n)=>{tab.setAttribute('aria-selected',String(n===i));tab.tabIndex=n===i?0:-1;this.panels[n].hidden=n!==i;});
      const name=this.tabs[i].querySelector('[data-t]').textContent;
      this.preview.textContent=name;this.map.title=name;this.dialog.querySelector('h3').textContent=name;
      if(focus)this.tabs[i].focus();
    }
  }
  class WelcomeHeading {
    constructor(root){
      this.root=root;this.accessible=root.querySelector('.sr-only');this.reserve=root.querySelector('.galaxy-type-reserve');this.output=root.querySelector('#galaxy-typed-text');this.visible=false;this.update();
      window.addEventListener('fabyab:languagechange',()=>this.update());
      if(window.IntersectionObserver){this.observer=new window.IntersectionObserver(([entry])=>{if(entry.isIntersecting&&!this.visible)this.animate();this.visible=entry.isIntersecting;},{threshold:.15});this.observer.observe(root);}else this.animate();
    }
    update(){
      const lines=WELCOME[document.documentElement.lang]||WELCOME.en;this.accessible.textContent=lines.join(' ');this.reserve.replaceChildren();this.output.replaceChildren();
      lines.forEach((text,index)=>{const reserve=document.createElement('span');reserve.className='galaxy-welcome-line line-'+index;reserve.textContent=text;this.reserve.append(reserve);const line=reserve.cloneNode(true);line.className+=' headline-line';line.style.setProperty('--line-index',index);this.output.append(line);});
      if(this.visible)this.animate();
    }
    animate(){this.root.classList.remove('welcome-arrived');void this.root.offsetWidth;this.root.classList.add('welcome-arrived');}
  }
  window.FabyabLocationExplorer=LocationExplorer;window.FabyabWelcomeHeading=WelcomeHeading;
  const init=()=>{
    const locations=document.querySelector('.location-explorer');if(locations)window.fabyabLocations=new LocationExplorer(locations);
    const welcome=document.getElementById('galaxy-welcome-message');if(welcome)window.fabyabWelcome=new WelcomeHeading(welcome);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
