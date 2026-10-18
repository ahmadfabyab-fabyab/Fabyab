'use strict';
(() => {
  const data = window.FABYAB_CONTENT;
  if (!data) return;
  const $ = id => document.getElementById(id);
  const all = selector => Array.from(document.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const wrap = (value, length) => ((value % length) + length) % length;
  const asset = path => 'assets/' + path;
  const storage = {
    get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch {} }
  };
  const languages = ['ar','en','tr','ckb'];
  const languageNames = {ar:'العربية',en:'English',tr:'Türkçe',ckb:'کوردی (سۆرانی)'};
  const normalizeLanguage = value => value === 'ku' ? 'ckb' : value;
  // Every fresh page load starts in English; visitors can change it in this session.
  let lang = 'en';
  const isRTL = () => lang === 'ar' || lang === 'ckb';
  // Continuous motion is the owner's explicit presentation setting, including local HTML.
  let paused = false;
  let heroIndex = 0, serviceIndex = 0, sectorIndex = 0, videoLanguage = 'en';
  let activeModels = {}, clientFilter = 'all', coverageVisible = false;
  let heroVisible = true, filmPlaying = false, dialogItem = null, lastRequest = null;
  let heroTimer, modelTimer, modelVisible = false;
  let clientTimer, clientIndex = 0, clientVisible = false;
  let modelSwapTimer, modelGeneration = 0;
  let stageSlots = ['service-main-open','service-side-one','service-side-two'];
  let networkFrame = 0, networkVisible = false, keyboardNavigation = false;
  let filmPlayer = null, filmAPIRequested = false, filmStatusKey = 'filmFallback';
  const t = key => data.text[key] ? data.text[key][languages.indexOf(lang)] : key;
  const serviceName = family => data.services.find(x => x.id === family)?.[lang].name || t('other');
  const number = value => String(value).padStart(2,'0');
  function transition(element) {
    if (!element || paused) return;
    element.classList.remove('is-switching');
    void element.offsetWidth;
    element.classList.add('is-switching');
  }
  function closeMenu() {
    $('primary-nav').classList.remove('open');
    $('menu-toggle').setAttribute('aria-expanded','false');
    $('menu-toggle').setAttribute('aria-label',t('openMenu'));
  }
  function closeLanguages() {
    $('language-menu').hidden = true;
    $('language-toggle').setAttribute('aria-expanded','false');
  }
  function toggleLanguages() {
    const open = $('language-menu').hidden;
    $('language-menu').hidden = !open;
    $('language-toggle').setAttribute('aria-expanded',String(open));
    if (open) {closeMenu();$('language-menu').querySelector('[data-language="'+lang+'"]').focus();}
  }
  function arrowIcon() {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','site-arrow');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M5 19 19 5M7 5h12v12');svg.append(path);return svg;
  }
  function createButton(label, className, dataset, value) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.dataset[dataset] = value;
    return button;
  }
  function renderHeroDots() {
    const container = $('hero-dots');
    container.replaceChildren();
    data.slides.forEach((_, i) => {
      const button = createButton(number(i+1),'hero-dot','hero',i);
      button.setAttribute('aria-label',t('scene')+' '+(i+1));
      button.setAttribute('aria-pressed',String(i===heroIndex));
      button.classList.toggle('active',i===heroIndex);
      container.append(button);
    });
  }
  function setHero(index, animate = true) {
    heroIndex = wrap(index, data.slides.length);
    const slide = data.slides[heroIndex][lang];
    $('hero-title').innerHTML = slide.title.split(/<br\s*\/?>/i).map((line,i)=>'<span class="headline-line" style="--line-index:'+i+'">'+line+'</span>').join(' ');
    $('hero-description').textContent = slide.body;
    all('.hero-image').forEach((element,i) => element.classList.toggle('active',i===heroIndex));
    all('.hero-dot').forEach((element,i) => {
      element.classList.toggle('active',i===heroIndex);
      element.setAttribute('aria-pressed',String(i===heroIndex));
    });
    if (animate) transition($('hero-description'));
  }
  function startHeroTimer() {
    window.clearInterval(heroTimer);
    if (paused || !heroVisible || document.hidden) return;
    heroTimer = window.setInterval(() => {
      if (!paused && heroVisible && !document.hidden && !(keyboardNavigation && $('hero-dots').contains(document.activeElement))) setHero(heroIndex+1);
    },7000);
  }
  function renderServices() {
    const tabs = $('service-tabs');
    tabs.replaceChildren();
    data.services.forEach((service,i) => {
      const button = createButton('', 'service-tab','service',i);
      button.id = 'service-tab-'+service.id;
      button.setAttribute('role','tab');
      button.setAttribute('aria-controls','service-panel');
      const num = document.createElement('span'); num.textContent=number(i+1);
      const name = document.createElement('span'); name.textContent=service[lang].name;
      const arrow = document.createElement('span'); arrow.className='tab-arrow';arrow.append(arrowIcon());arrow.setAttribute('aria-hidden','true');
      button.append(num,name,arrow); tabs.append(button);
    });
    setService(serviceIndex,false);
  }
  function familyProducts() {return data.products.filter(x=>x.family===data.services[serviceIndex].id);}
  function setService(index, animate = true) {
    serviceIndex=wrap(index,data.services.length);
    const service=data.services[serviceIndex],copy=service[lang],products=familyProducts();
    $('service-panel').dataset.family=service.id;
    if(!activeModels[service.id])activeModels[service.id]=(products.find(x=>x.featured)||products[0]).id;
    all('.service-tab').forEach((button,i)=>{button.classList.toggle('active',i===serviceIndex);button.setAttribute('aria-selected',String(i===serviceIndex));button.tabIndex=i===serviceIndex?0:-1;});
    $('service-panel').setAttribute('aria-labelledby','service-tab-'+service.id);
    $('service-title').innerHTML=copy.title;$('service-body').textContent=copy.body;$('service-family-name').textContent=copy.name;
    $('service-watermark').textContent=service.id.toUpperCase();
    $('service-tags').replaceChildren(...copy.tags.map(tag=>{const span=document.createElement('span');span.textContent=tag;return span;}));
    const strip=$('service-models'),oldScroll=strip.scrollLeft;strip.replaceChildren();
    products.forEach(product=>{const button=createButton('','model-option','model',product.id);button.setAttribute('aria-label',product[lang][0]);button.setAttribute('title',product[lang][0]);const img=document.createElement('img');img.src=asset(product.thumb);img.width=140;img.height=140;img.alt='';img.loading='lazy';button.append(img);strip.append(button);});
    strip.scrollLeft=oldScroll;$('model-total').textContent=products.length+' / '+t('modelCount');
    setModel(activeModels[service.id],animate,false);
    syncModels();
    if(animate)transition($('service-copy'));
  }
  function stageButtonImage(button) {return $(button).querySelector('img');}
  function positionStageSlots() {
    stageSlots.forEach((id,i)=>{
      const button=$(id);['model-main','model-left','model-right'].forEach((role,j)=>button.classList.toggle(role,i===j));
    });
  }
  function labelModel(product,index,products) {
    activeModels[data.services[serviceIndex].id]=product.id;
    all('[data-model]').forEach(button=>{const active=button.dataset.model===product.id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    $('service-model-name').textContent=product[lang][0];$('service-count').textContent=number(index+1)+' / '+number(products.length);
  }
  function placeModel(buttonId,product,animate=false) {
    const button=$(buttonId),img=stageButtonImage(buttonId),next=asset(product.image);
    img.src=next;img.alt=product[lang][0];button.dataset.modelProduct=product.id;
    button.setAttribute('aria-label',product[lang][0]+' — '+t('viewProduct'));
    if(animate&&!paused)transition(img);
  }
  function setModel(id,animate=true,restart=true) {
    const products=familyProducts(),selected=products.findIndex(x=>x.id===id);if(selected<0)return;
    window.clearTimeout(modelSwapTimer);modelGeneration++;
    stageSlots=['service-main-open','service-side-one','service-side-two'];positionStageSlots();
    stageSlots.forEach((button,i)=>placeModel(button,products[wrap(selected+i,products.length)],animate));
    labelModel(products[selected],selected,products);
    if(restart)syncModels();
  }
  function chooseService(index) {setService(index);}
  function advanceModels() {
    const products=familyProducts(),oldMain=stageSlots[0],newMain=stageSlots[1],newLeft=stageSlots[2];
    const nextIndex=products.findIndex(x=>x.id===$(newMain).dataset.modelProduct);
    if(nextIndex<0)return;
    window.clearTimeout(modelSwapTimer);const generation=++modelGeneration;
    stageSlots=[newMain,newLeft,oldMain];positionStageSlots();
    labelModel(products[nextIndex],nextIndex,products);
    const incoming=products[wrap(nextIndex+2,products.length)];
    // The outgoing centre photo completes its travel before the next model enters.
    const preload=new Image();preload.src=asset(incoming.image);
    modelSwapTimer=window.setTimeout(()=>{
      if(generation!==modelGeneration)return;
      const commit=()=>{if(generation===modelGeneration)placeModel(oldMain,incoming,true);};
      if(preload.decode)preload.decode().then(commit,commit);else commit();
    },paused?0:1150);
  }
  function syncModels() {
    window.clearInterval(modelTimer);
    const stopped=paused||!modelVisible||document.hidden;
    $('service-panel').classList.toggle('models-paused',stopped);
    if(stopped)return;
    modelTimer=window.setInterval(()=>{
      const focused=keyboardNavigation&&($('service-panel').contains(document.activeElement)||$('service-models').contains(document.activeElement));
      if(!paused&&!document.hidden&&!focused&&!$('product-dialog').open)advanceModels();
    },3000);
  }
  const clientMap={'frozen':'frozen-food','oil':'edible-oils'};
  function renderSectors() {
    const container=$('sector-grid');container.replaceChildren();
    data.sectors.forEach((sector,i)=>{
      const button=createButton('','industry-card','sector',i);button.setAttribute('aria-label',sector[lang][0]);button.style.setProperty('--industry-index',i);
      const image=document.createElement('img');image.src=asset(sector.image);image.alt='';image.width=sector.width;image.height=sector.height;image.loading='lazy';
      const picture=document.createElement('div');picture.className='industry-picture';picture.style.setProperty('--image-ratio','1361 / 1984');picture.append(image);
      const name=document.createElement('strong');name.textContent=sector[lang][0];const num=document.createElement('span');num.className='industry-number';num.textContent=number(i+1);
      const arrow=document.createElement('span');arrow.className='industry-arrow';arrow.append(arrowIcon());arrow.setAttribute('aria-hidden','true');button.append(picture,num,name,arrow);container.append(button);
    });
    setSector(sectorIndex,false);renderClients();
  }
  function setSector(index,animate=true) {
    sectorIndex=wrap(index,data.sectors.length);const sector=data.sectors[sectorIndex],copy=sector[lang];
    $('sector-name').textContent=copy[0];$('sector-title').innerHTML=copy[1];$('sector-body').textContent=copy[2];
    all('[data-sector]').forEach((button,i)=>{button.classList.toggle('active',i===sectorIndex);button.setAttribute('aria-pressed',String(i===sectorIndex));});
    if(animate)transition($('industry-detail'));
  }
  function clientSectors() {
    return ['frozen','detergents','eggs','water','oil','dairy','chips','juice'].map(id=>data.sectors.find(x=>x.id===id)).filter(x=>x?.logos);
  }
  function renderClients() {
    const filters=$('client-filters');filters.replaceChildren(createButton(t('allClients'),'client-filter','clientFilter','all'));
    clientSectors().forEach(sector=>filters.append(createButton(sector[lang][0],'client-filter','clientFilter',sector.id)));
    all('[data-client-filter]').forEach(button=>{const active=button.dataset.clientFilter===clientFilter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    const wall=$('client-wall');wall.replaceChildren();
    const article=document.createElement('article');article.className='client-group';
    const heading=document.createElement('h4');article.append(heading);
    const button=createButton('','client-sheet','client','');
    const img=document.createElement('img');img.width=2048;img.height=1488;img.loading='eager';img.decoding='async';button.append(img);article.append(button);wall.append(article);
    // Reserve the original card width and the tallest logo sheet to avoid layout jumps.
    const companion=document.createElement('aside');companion.className='client-companion';
    companion.innerHTML='<div class="trust-orb" aria-hidden="true"><div class="trust-orb-core"></div><i class="trust-orb-ring ring-1"></i><i class="trust-orb-ring ring-2"></i><i class="trust-orb-ring ring-3"></i><img src="assets/brand/fabyab-official.webp" width="2048" height="415" alt=""></div><div class="client-companion-copy"><strong dir="ltr">1,200+</strong><p></p></div>';
    companion.querySelector('p').textContent=t('clients');wall.append(companion);
    renderClientCard(false);syncClients();
  }
  function renderClientCard(animate=true) {
    const sectors=clientSectors();clientIndex=wrap(clientIndex,sectors.length);
    const sector=clientFilter==='all'?sectors[clientIndex]:sectors.find(x=>x.id===clientFilter);
    if(!sector)return;
    const wall=$('client-wall'),button=wall.querySelector('.client-sheet'),img=button.querySelector('img');
    wall.querySelector('h4').textContent=sector[lang][0];button.dataset.client=sector.id;
    button.setAttribute('aria-label',sector[lang][0]+' — '+t('viewLogos'));
    img.src=asset('clients/'+(clientMap[sector.logos]||sector.logos)+'-logos.webp');
    img.alt=t('sectorClients')+' — '+sector[lang][0];
    if(animate)transition(img);
    // Warm the next sheet before its three-second turn.
    if(clientFilter==='all'){const next=sectors[wrap(clientIndex+1,sectors.length)];const preload=new Image();preload.src=asset('clients/'+(clientMap[next.logos]||next.logos)+'-logos.webp');}
  }
  function setClientFilter(id) {
    if(id!=='all'&&!clientSectors().some(x=>x.id===id))return;
    clientFilter=id;renderClients();
  }
  function advanceClients() {clientIndex=wrap(clientIndex+1,clientSectors().length);renderClientCard();}
  function syncClients() {
    window.clearInterval(clientTimer);
    if(paused||clientFilter!=='all'||!clientVisible||document.hidden)return;
    clientTimer=window.setInterval(()=>{
      const focused=keyboardNavigation&&($('client-filters').contains(document.activeElement)||$('client-wall').contains(document.activeElement));
      if(!$('product-dialog').open&&!focused)advanceClients();
    },3000);
  }

  const videoNames={en:'English',ar:'العربية',ku:'کوردی',tr:'Türkçe'};
  function setFilmStatus(key,error=false) {
    filmStatusKey=key;$('film-status').textContent=t(key);
    document.querySelector('.film-footer').classList.toggle('is-error',error);
  }
  function filmPage() {return new URL(window.location.href);}
  function attachFilmAPI() {
    const iframe=$('fabyab-film-player');
    if(!iframe||!window.YT?.Player||filmPlayer)return;
    filmPlayer=new window.YT.Player(iframe,{events:{
      onReady:()=>setFilmStatus('filmLoaded'),
      onError:()=>setFilmStatus('filmError',true)
    }});
  }
  function loadFilmAPI() {
    if(window.YT?.Player){attachFilmAPI();return;}
    if(filmAPIRequested)return;filmAPIRequested=true;
    window.onYouTubeIframeAPIReady=attachFilmAPI;
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
    script.referrerPolicy='strict-origin-when-cross-origin';
    script.onerror=()=>setFilmStatus('filmFallback');document.head.append(script);
  }
  function embedVideo(autoplay=true) {
    const page=filmPage();
    if(!['http:','https:'].includes(page.protocol)) {
      setFilmStatus('filmLocal');$('film-external').click();return;
    }
    if(filmPlayer){try{filmPlayer.destroy();}catch{}filmPlayer=null;}
    const container=$('film-embed');container.replaceChildren();
    const iframe=document.createElement('iframe');
    const parameters=new URLSearchParams({rel:'0',playsinline:'1',enablejsapi:'1',origin:page.origin,widget_referrer:page.href,autoplay:autoplay?'1':'0'});
    iframe.id='fabyab-film-player';iframe.src='https://www.youtube-nocookie.com/embed/'+data.videos[videoLanguage]+'?'+parameters;
    iframe.title=t('play')+' — '+videoNames[videoLanguage];
    iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.setAttribute('allowfullscreen','');iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
    container.append(iframe);container.hidden=false;$('film-poster').hidden=true;filmPlaying=true;
    setFilmStatus('filmLoading');loadFilmAPI();
  }
  function setVideo(language,play=false) {
    if(!data.videos[language])return;
    const wasPlaying=filmPlaying;videoLanguage=language;
    all('[data-video]').forEach(button=>{button.classList.toggle('active',button.dataset.video===language);button.setAttribute('aria-pressed',String(button.dataset.video===language));});
    $('film-language-name').textContent=videoNames[language];$('film-language-name').lang=language==='ku'?'ckb':language;
    document.querySelector('.film-poster-bottom>span').textContent='THE COMPANY FILM / '+language.toUpperCase();
    $('film-external').href='https://www.youtube.com/watch?v='+data.videos[language];
    if(play||wasPlaying)embedVideo(true);
  }
  function renderQuoteOptions() {
    const select=$('quote-solution'),oldValue=select.value;
    select.replaceChildren();
    const first=document.createElement('option');first.value='';first.textContent=t('choose');select.append(first);
    data.services.forEach(service=>{const option=document.createElement('option');option.value=service.id;option.textContent=service[lang].name;select.append(option);});
    const other=document.createElement('option');other.value='other';other.textContent=t('other');select.append(other);
    select.value=oldValue||'';
  }
  function measureVision() {
    const rotator=$('vision-rotator');
    all('.vision-choice').slice(0,3).forEach((choice,i)=>{
      const width=choice.getBoundingClientRect().width;
      if(width>0)rotator.style.setProperty('--vision-'+i,width+'px');
    });
  }
  function renderVision() {
    const keys=['vision','brand','packaging'],prefix=$('vision-prefix'),track=$('vision-track');
    prefix.textContent=lang==='en'?'Your':'';prefix.hidden=lang!=='en';
    const words=keys.map(key=>lang==='en'?t(key).replace(/^Your\s+/,''):t(key));
    track.replaceChildren(...[...words,words[0]].map((word,i)=>{const span=document.createElement('span');span.textContent=word;span.className='vision-choice choice-'+(i%3);return span;}));
    $('vision-accessible').textContent=keys.map(t).join(' — ');
    measureVision();
  }
  function applyLanguage() {
    document.documentElement.lang=lang;document.documentElement.dir=isRTL()?'rtl':'ltr';
    document.title=t('pageTitle');
    document.querySelector('meta[name=description]').content=t('metaDescription');
    document.querySelector('meta[property="og:title"]').content=t('pageTitle');
    document.querySelector('meta[property="og:description"]').content=t('metaDescription');
    all('[data-t]').forEach(element=>{element.textContent=t(element.dataset.t);});
    all('[data-html]').forEach(element=>{element.innerHTML=t(element.dataset.html);});
    all('[data-aria]').forEach(element=>{element.setAttribute('aria-label',t(element.dataset.aria));});
    all('[data-alt]').forEach(element=>{element.alt=t(element.dataset.alt);});
    all('[data-title]').forEach(element=>{element.title=t(element.dataset.title);});
    all('[data-alt-ar]').forEach(element=>{element.alt=element.getAttribute('data-alt-'+lang)||element.getAttribute('data-alt-en')||'';});
    all('[data-family-label]').forEach(element=>{element.textContent=serviceName(element.dataset.familyLabel);});
    $('language-label').textContent=languageNames[lang];$('language-label').lang=lang;
    $('language-toggle').setAttribute('aria-label',t('chooseLanguage'));
    all('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===lang)));
    closeLanguages();
    closeMenu();renderHeroDots();setHero(heroIndex,false);renderServices();renderSectors();renderQuoteOptions();renderVision();
    setFilmStatus(filmStatusKey,filmStatusKey==='filmError');
    if($('fabyab-film-player'))$('fabyab-film-player').title=t('play')+' — '+videoNames[videoLanguage];
    if(dialogItem)renderDialog();
    if(lastRequest){lastRequest=buildRequest();$('request-preview').value=lastRequest.text;$('form-status').textContent=t('formReady');}
  }
  function setLanguage(value) {
    value=normalizeLanguage(value);if(!languages.includes(value))return;
    lang=value;storage.set('fabyab-language',lang);applyLanguage();
  }
  function prefill(family,details='') {
    $('quote-solution').value=family;
    if(details){const textarea=$('quote-details');if(!textarea.value.includes(details))textarea.value=(textarea.value?textarea.value+'\n':'')+details;}
    closeDialog();$('contact').scrollIntoView({behavior:paused?'auto':'smooth',block:'start'});
  }
  function renderDialog() {
    if(!dialogItem)return;
    const isSector=dialogItem.startsWith('sector:'),isClient=dialogItem.startsWith('client:');
    const sector=(isSector||isClient)?data.sectors.find(x=>x.id===dialogItem.split(':')[1]):null;
    const product=data.products.find(x=>x.id===dialogItem),service=product?null:data.services.find(x=>x.id===dialogItem);
    if(!product&&!service&&!sector)return;
    $('product-dialog').classList.toggle('client-dialog',isClient);$('product-dialog').classList.toggle('sector-dialog',isSector);$('dialog-request').hidden=isClient;
    const image=sector?(isClient?'clients/'+(clientMap[sector.logos]||sector.logos)+'-logos.webp':sector.image):product?product.image:data.products.find(x=>x.family===service.id).image;
    $('dialog-image').src=asset(image);$('dialog-image').alt=sector?sector[lang][0]:product?product[lang][0]:service[lang].name;
    $('dialog-family').textContent=sector?(isClient?t('clientsEyebrow'):serviceName(sector.family)):serviceName(product?product.family:service.id);
    $('dialog-title').textContent=sector?sector[lang][0]:product?product[lang][0]:service[lang].name;
    $('dialog-body').textContent=sector?(isClient?t('trustBody'):sector[lang][2]):product?product[lang][1]:service[lang].body;
  }
  function openProduct(id) {
    const sectorId=id.includes(':')?id.split(':')[1]:null;
    if(!data.products.some(x=>x.id===id)&&!data.services.some(x=>x.id===id)&&!data.sectors.some(x=>x.id===sectorId))return;
    dialogItem=id;renderDialog();const dialog=$('product-dialog');
    if(!dialog.open){if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}
    $('dialog-close').focus();
  }

  function closeDialog() {
    const dialog=$('product-dialog');
    if(typeof dialog.close==='function'&&dialog.open)dialog.close();else dialog.removeAttribute('open');
    dialogItem=null;
  }
  function buildRequest() {
    const form=$('quote-form');
    const value=name=>String(form.querySelector('[name="'+name+'"]').value||'').trim();
    const subject=t('enquirySubject')+(value('company')||value('name'));
    const labels={name:t('name'),company:t('company'),email:t('email'),phone:t('phone'),solution:t('family'),quantity:t('quantity'),details:t('details')};
    const text=[t('enquiryHello'),'',...Object.entries(labels).map(([key,label])=>label+': '+(key==='solution'?serviceName(value(key)):value(key))),'',t('enquiryClosing')].join('\n');
    return {subject,text,url:'mailto:info@fabyab.co?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(text)};
  }
  function syncMotion() {
    document.documentElement.classList.toggle('motion-paused',paused);
    onScroll();
    if(paused)all('.reveal').forEach(element=>element.classList.add('is-visible'));
    startHeroTimer();syncCoverage();syncModels();syncClients();
    if(paused){const id=activeModels[data.services[serviceIndex].id];if(id)setModel(id,false,false);}
    if(paused)all('.service-model img').forEach(img=>img.getAnimations?.().forEach(animation=>animation.cancel()));
    if(paused&&networkFrame){window.cancelAnimationFrame(networkFrame);networkFrame=0;}
    else if(networkVisible)startNetwork();
  }
  function setMotion(value) {paused=value;syncMotion();}
  function syncCoverage() {
    const stop=paused||!coverageVisible||document.hidden;
    $('coverage-map').classList.toggle('is-paused',stop);
  }
  function onScroll() {
    const height=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    document.documentElement.style.setProperty('--progress',String(clamp(window.scrollY/height,0,1)));
    $('header').classList.toggle('scrolled',window.scrollY>25);
    const factory=$('factory-figure');
    if(factory){const rect=factory.getBoundingClientRect(),range=window.innerWidth<760?6:12;const shift=paused?0:clamp((window.innerHeight/2-rect.top-rect.height/2)/(window.innerHeight||1)*range,-range,range);factory.style.setProperty('--factory-y',shift.toFixed(2)+'px');}
  }

  let scrollFrame=false;
  function requestScroll() {if(scrollFrame)return;scrollFrame=true;window.requestAnimationFrame(()=>{scrollFrame=false;onScroll();});}
  function animateCounter(element) {
    const run=(Number(element.dataset.countRun)||0)+1;element.dataset.countRun=run;element.dataset.counted='true';
    const target=Number(element.dataset.count),suffix=element.dataset.suffix||'';
    if(paused){element.textContent=target.toLocaleString('en-US')+suffix;return;}
    const start=performance.now();
    function frame(now){
      if(Number(element.dataset.countRun)!==run)return;
      if(paused){element.textContent=target.toLocaleString('en-US')+suffix;return;}
      const p=clamp((now-start)/1300,0,1);element.textContent=Math.round(target*(1-Math.pow(1-p,3))).toLocaleString('en-US')+suffix;
      if(p<1)window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }
  let canvasContext=null,networkPoints=[];
  function setupNetwork() {
    const canvas=$('network-canvas');
    try {canvasContext=canvas.getContext&&canvas.getContext('2d');}catch{}if(!canvasContext)return;
    const ratio=Math.min(window.devicePixelRatio||1,1.5),width=$('systems').clientWidth,height=$('systems').clientHeight;
    if(!width||!height)return;
    canvas.width=width*ratio;canvas.height=height*ratio;canvasContext.setTransform(ratio,0,0,ratio,0,0);
    const count=window.innerWidth<760?22:45;
    networkPoints=Array.from({length:count},(_,i)=>({x:((i*197)%width),y:((i*293)%height),phase:i*.9}));
  }
  function startNetwork() {
    if(!canvasContext||networkFrame||paused||!networkVisible||document.hidden)return;
    function frame(now){
      networkFrame=0;if(paused||!networkVisible||document.hidden)return;
      const canvas=$('network-canvas'),ctx=canvasContext,ratio=Math.min(window.devicePixelRatio||1,1.5),w=canvas.width/ratio,h=canvas.height/ratio;
      ctx.clearRect(0,0,w,h);
      const points=networkPoints.map(p=>({x:p.x+Math.sin(now*.00018+p.phase)*25,y:p.y+Math.cos(now*.00016+p.phase)*20}));
      points.forEach((a,i)=>{
        for(let j=i+1;j<points.length;j++){const b=points[j],distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance<155){ctx.strokeStyle='rgba(0,174,239,'+((1-distance/155)*.25)+')';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
        ctx.fillStyle='rgba(0,174,239,.65)';ctx.beginPath();ctx.arc(a.x,a.y,1.5,0,Math.PI*2);ctx.fill();
      });
      networkFrame=window.requestAnimationFrame(frame);
    }
    networkFrame=window.requestAnimationFrame(frame);
  }
  function installObservers() {
    if(typeof window.IntersectionObserver!=='function'){
      all('.reveal').forEach(element=>element.classList.add('is-visible'));all('[data-count]').forEach(animateCounter);heroVisible=true;coverageVisible=true;modelVisible=true;clientVisible=true;networkVisible=true;startHeroTimer();syncCoverage();syncModels();syncClients();startNetwork();return;
    }
    const reveals=new window.IntersectionObserver(entries=>entries.forEach(entry=>{entry.target.classList.toggle('is-visible',paused||entry.isIntersecting);}),{threshold:.06,rootMargin:'0px 0px -20px 0px'});
    all('.reveal').forEach(element=>reveals.observe(element));
    const counters=new window.IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting&&entry.intersectionRatio>=.25)animateCounter(entry.target);else{entry.target.dataset.countRun=(Number(entry.target.dataset.countRun)||0)+1;entry.target.textContent=Number(entry.target.dataset.count).toLocaleString('en-US')+(entry.target.dataset.suffix||'');}}),{threshold:.25});
    all('[data-count]').forEach(element=>counters.observe(element));
    const ambient=new window.IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.target.id==='home'){heroVisible=entry.isIntersecting;startHeroTimer();}if(entry.target.id==='solutions'){modelVisible=entry.isIntersecting;syncModels();}if(entry.target.id==='coverage'){coverageVisible=entry.isIntersecting;syncCoverage();}if(entry.target.id==='client-section'){clientVisible=entry.isIntersecting;syncClients();}if(entry.target.id==='systems'){networkVisible=entry.isIntersecting;if(networkVisible)startNetwork();else if(networkFrame){window.cancelAnimationFrame(networkFrame);networkFrame=0;}}}),{threshold:0});
    ambient.observe($('home'));ambient.observe($('systems'));ambient.observe($('coverage'));ambient.observe($('solutions'));ambient.observe($('client-section'));
  }
  function setupHeroGestures() {
    const home=$('home');let mouse=null,touch=null,lastSwitch=0,suppressClickUntil=0;
    const isControl=target=>target.closest('a,button,input,select,textarea');
    const change=direction=>{setHero(heroIndex+direction);startHeroTimer();lastSwitch=performance.now();};
    home.addEventListener('pointermove',event=>{
      if(event.pointerType!=='mouse'||isControl(event.target)){mouse=null;return;}
      if(!mouse){mouse={x:event.clientX,y:event.clientY};return;}
      if(performance.now()-lastSwitch<1100){mouse={x:event.clientX,y:event.clientY};return;}
      const dx=event.clientX-mouse.x,dy=event.clientY-mouse.y;
      if(Math.abs(dx)>=clamp(home.clientWidth*.1,70,120)&&Math.abs(dx)>Math.abs(dy)*1.3){change(dx>0?1:-1);mouse={x:event.clientX,y:event.clientY};}
    },{passive:true});
    home.addEventListener('pointerleave',()=>{mouse=null;});
    home.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&!isControl(event.target))touch={x:event.clientX,y:event.clientY,id:event.pointerId};},{passive:true});
    home.addEventListener('pointerup',event=>{
      if(!touch||event.pointerId!==touch.id)return;
      const dx=event.clientX-touch.x,dy=event.clientY-touch.y;touch=null;
      if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){change(dx<0?1:-1);suppressClickUntil=performance.now()+350;}
    },{passive:true});
    home.addEventListener('pointercancel',()=>{touch=null;},{passive:true});
    home.addEventListener('click',event=>{if(performance.now()<suppressClickUntil){event.preventDefault();event.stopPropagation();}},true);
  }

  $('hero-images').replaceChildren(...data.slides.map((slide,i)=>{const element=document.createElement('div');element.className='hero-image'+(i===0?' active':'');element.style.backgroundImage='url("'+asset(slide.image)+'")';return element;}));
  $('language-toggle').addEventListener('click',toggleLanguages);
  $('language-menu').addEventListener('click',event=>{const button=event.target.closest('[data-language]');if(button){setLanguage(button.dataset.language);$('language-toggle').focus();}});
  $('language-menu').addEventListener('keydown',event=>{
    if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();
    const options=all('[data-language]'),current=options.indexOf(event.target.closest('[data-language]'));
    const index=event.key==='Home'?0:event.key==='End'?options.length-1:wrap(current+(event.key==='ArrowDown'?1:-1),options.length);options[index].focus();
  });
  document.addEventListener('click',event=>{if(!event.target.closest('.language-picker'))closeLanguages();});
  document.addEventListener('focusin',event=>{if(!event.target.closest('.language-picker'))closeLanguages();});
  document.addEventListener('keydown',event=>{if(['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))keyboardNavigation=true;});
  document.addEventListener('pointerdown',()=>{keyboardNavigation=false;},{passive:true});
  $('menu-toggle').addEventListener('click',()=>{const open=$('menu-toggle').getAttribute('aria-expanded')!=='true';$('primary-nav').classList.toggle('open',open);$('menu-toggle').setAttribute('aria-expanded',String(open));$('menu-toggle').setAttribute('aria-label',t(open?'closeMenu':'openMenu'));});
  all('#primary-nav a').forEach(link=>link.addEventListener('click',closeMenu));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();if(!$('language-menu').hidden){closeLanguages();$('language-toggle').focus();}if($('product-dialog').open)closeDialog();}});
  $('hero-prev').addEventListener('click',()=>{setHero(heroIndex-1);startHeroTimer();});$('hero-next').addEventListener('click',()=>{setHero(heroIndex+1);startHeroTimer();});
  $('hero-dots').addEventListener('click',event=>{const button=event.target.closest('[data-hero]');if(button){setHero(Number(button.dataset.hero));startHeroTimer();}});
  $('service-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-service]');if(button)chooseService(Number(button.dataset.service));});
  $('service-tabs').addEventListener('keydown',event=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();let i=serviceIndex;if(event.key==='Home')i=0;else if(event.key==='End')i=3;else i+=event.key==='ArrowDown'||(event.key==='ArrowRight'&&!isRTL())||(event.key==='ArrowLeft'&&isRTL())?1:-1;chooseService(i);all('.service-tab')[serviceIndex].focus();});
  $('service-request').addEventListener('click',()=>prefill(data.services[serviceIndex].id));
  $('service-models').addEventListener('click',event=>{const button=event.target.closest('[data-model]');if(button)setModel(button.dataset.model);});
  $('service-panel').addEventListener('click',event=>{const button=event.target.closest('[data-model-product]');if(button)openProduct(button.dataset.modelProduct);});
  $('sector-grid').addEventListener('click',event=>{const button=event.target.closest('[data-sector]');if(button){setSector(Number(button.dataset.sector));openProduct('sector:'+data.sectors[sectorIndex].id);}});
  $('client-filters').addEventListener('click',event=>{const button=event.target.closest('[data-client-filter]');if(button)setClientFilter(button.dataset.clientFilter);});
  $('client-wall').addEventListener('click',event=>{const button=event.target.closest('[data-client]');if(button)openProduct('client:'+button.dataset.client);});

  $('sector-request').addEventListener('click',()=>{const sector=data.sectors[sectorIndex];prefill(sector.family,sector[lang][0]);});
  $('film-play').addEventListener('click',()=>embedVideo(true));
  $('film-languages').addEventListener('click',event=>{const button=event.target.closest('[data-video]');if(button)setVideo(button.dataset.video);});
  $('dialog-close').addEventListener('click',closeDialog);
  $('product-dialog').addEventListener('close',()=>{dialogItem=null;});
  $('product-dialog').addEventListener('click',event=>{if(event.target===$('product-dialog'))closeDialog();});
  $('dialog-request').addEventListener('click',()=>{const product=data.products.find(x=>x.id===dialogItem);const service=data.services.find(x=>x.id===dialogItem);const sector=dialogItem?.startsWith('sector:')?data.sectors.find(x=>x.id===dialogItem.split(':')[1]):null;if(product)prefill(product.family,product[lang][0]);else if(service)prefill(service.id);else if(sector)prefill(sector.family,sector[lang][0]);});
  $('quote-form').addEventListener('submit',event=>{
    event.preventDefault();if(!$('quote-form').reportValidity())return;
    lastRequest=buildRequest();$('form-status').textContent=t('formReady');$('copy-request').hidden=false;$('request-preview').value=lastRequest.text;
    const link=document.createElement('a');link.href=lastRequest.url;link.hidden=true;document.body.append(link);link.click();link.remove();
  });
  $('copy-request').addEventListener('click',async()=>{
    lastRequest=buildRequest();$('request-preview').value=lastRequest.text;
    try {if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');await navigator.clipboard.writeText(lastRequest.text);$('form-status').textContent=t('copied');}
    catch {$('request-preview').hidden=false;$('request-preview').focus();$('request-preview').select();$('form-status').textContent=t('copyManual');}
  });
  window.addEventListener('scroll',requestScroll,{passive:true});
  window.addEventListener('resize',()=>{requestScroll();measureVision();setupNetwork();if(networkVisible)startNetwork();});
  document.addEventListener('visibilitychange',()=>{startHeroTimer();syncCoverage();syncModels();syncClients();if(document.hidden&&networkFrame){window.cancelAnimationFrame(networkFrame);networkFrame=0;}else startNetwork();});
  $('home').addEventListener('pointermove',event=>{if(paused||event.pointerType==='touch'||window.innerWidth<1000)return;document.documentElement.style.setProperty('--pointer-x',((event.clientX/window.innerWidth-.5)*18)+'px');document.documentElement.style.setProperty('--pointer-y',((event.clientY/window.innerHeight-.5)*12)+'px');});
  if(!['http:','https:'].includes(filmPage().protocol))filmStatusKey='filmLocal';
  setupHeroGestures();applyLanguage();syncMotion();setupNetwork();installObservers();onScroll();
  if(document.fonts){document.fonts.ready.then(measureVision);document.fonts.addEventListener?.('loadingdone',measureVision);}
  $('year').textContent=String(new Date().getFullYear());
  document.documentElement.classList.add('js');
  window.fabyab={data,t,setLanguage,setHero,setService,chooseService,setModel,advanceModels,setClientFilter,setSector,setVideo,openProduct,closeDialog,buildRequest,setMotion,onScroll,get state(){return {lang,paused,heroIndex,serviceIndex,sectorIndex,videoLanguage,clientFilter,clientIndex,activeModels,modelVisible,filmPlaying,dialogItem};}};
})();
