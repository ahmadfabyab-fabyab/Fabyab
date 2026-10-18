'use strict';
(() => {
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const wrap=a=>((a+180)%360+360)%360-180;
  const RAD=Math.PI/180;
  // Native DOM adaptation of the panorama geometry supplied by Ahmad.
  // No React runtime or external image requests are required.
  class FabyabPanorama {
    static geometry(width,height,count){
      const cardW=width<600?Math.min(230,width*.58):width<1000?250:300;
      const cardH=cardW*1984/1361,gap=width<600?19:26;
      const radius=count*(cardW+gap)/(Math.PI*2);
      const fit=Math.min(1,(height-106)*.9/cardH);
      return {cardW,cardH,radius,fit,step:360/count,tiles:8};
    }
    constructor(root,{initialIndex=0,onChange=()=>{}}={}){
      this.root=root;this.cards=Array.from(root.querySelectorAll('[data-sector]'));this.count=this.cards.length;
      if(this.count<2)return;
      this.onChange=onChange;this.active=initialIndex;this.angle=-initialIndex*360/this.count;
      this.velocity=0;this.direction=-1;this.target=null;this.raf=0;this.last=0;this.visible=true;this.press=null;this.drag=false;this.suppress=false;this.hold=0;this.listeners=[];
      this.stage=document.createElement('div');this.stage.className='panorama-stage';
      this.camera=document.createElement('div');this.camera.className='panorama-camera';
      this.ring=document.createElement('div');this.ring.className='panorama-ring';
      this.stage.append(this.camera);this.camera.append(this.ring);root.append(this.stage);
      this.frames=[];
      this.cards.forEach((card,index)=>{
        const source=card.querySelector('img');card.tabIndex=-1;card.classList.add('panorama-card');
        this.ring.append(card);const strips=[];
        for(let i=0;i<8;i++){
          const tile=document.createElement('span');tile.className='panorama-tile';tile.setAttribute('aria-hidden','true');
          const frame=document.createElement('span');frame.className='panorama-frame';
          const image=document.createElement('img');image.src=source.getAttribute('src');image.alt='';image.draggable=false;image.decoding='async';image.loading=index<3?'eager':'lazy';
          frame.append(image);tile.append(frame);card.append(tile);strips.push({tile,frame,image});
        }
        this.frames.push(strips);
      });
      this.controls=document.createElement('div');this.controls.className='panorama-controls';
      const svg=back=>'<svg class="site-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(back?'M20 12H4m7-7-7 7 7 7':'M4 12h16m-7-7 7 7-7 7')+'"/></svg>';
      this.controls.innerHTML='<button type="button" data-panorama-nav="-1">'+svg(true)+'</button><div><strong class="panorama-name"></strong><span class="panorama-count" dir="ltr"></span></div><button type="button" data-panorama-nav="1">'+svg(false)+'</button>';
      root.append(this.controls);root.classList.add('panorama-ready');root.tabIndex=0;root.setAttribute('aria-roledescription','carousel');
      this.measure();this.caption();
      const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);this.listeners.push(()=>node.removeEventListener(type,fn,options));};
      listen(root,'pointerdown',e=>this.down(e),{passive:true});listen(root,'pointermove',e=>this.move(e),{passive:true});
      listen(root,'pointerup',e=>this.release(e),{passive:true});listen(root,'pointercancel',e=>this.release(e,true),{passive:true});
      listen(root,'lostpointercapture',e=>this.release(e,true),{passive:true});
      listen(root,'click',e=>this.click(e),true);listen(root,'keydown',e=>this.key(e));
      listen(root,'wheel',e=>{if(Math.abs(e.deltaX)<=Math.abs(e.deltaY)||!e.deltaX)return;e.preventDefault();this.angle+=e.deltaX*180/(Math.PI*this.g.radius*this.g.fit);this.velocity=clamp(e.deltaX*1.2,-100,100);this.target=null;this.hold=performance.now()+350;this.wake();},{passive:false});
      listen(document,'visibilitychange',()=>{if(document.hidden)this.sleep();else this.wake();});
      if(window.ResizeObserver){this.resize=new window.ResizeObserver(()=>{this.measure();this.wake();});this.resize.observe(root);}
      else listen(window,'resize',()=>{this.measure();this.wake();});
      if(window.IntersectionObserver){this.io=new window.IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.wake();else this.sleep();},{rootMargin:'80px'});this.io.observe(root);}
      this.paint();this.wake();
    }
    measure(){
      const rect=this.root.getBoundingClientRect();if(!rect.width||!rect.height)return;
      this.g=FabyabPanorama.geometry(rect.width,rect.height,this.count);const {cardW:w,cardH:h,radius:r,fit}=this.g;
      this.stage.style.perspective=r+'px';this.stage.style.transform='translateY(-43px) scale('+fit+')';
      this.camera.style.transform='translateZ('+(r-1)+'px)';
      this.cards.forEach((card,index)=>{
        card.style.transform='rotateY('+(index*this.g.step)+'deg) translateZ('+(-r)+'px)';
        this.frames[index].forEach(({tile,frame,image},i)=>{
          const start=i*w/8-(i?1:0),end=(i+1)*w/8+(i<7?1:0),center=(start+end)/2-w/2;
          const alpha=center/r,shift=r*Math.sin(alpha),sink=r*(1-Math.cos(alpha));
          tile.style.cssText='left:'+(-(end-start)/2)+'px;top:'+(-h/2)+'px;width:'+(end-start)+'px;height:'+h+'px;transform:translate3d('+shift+'px,0,'+sink+'px) rotateY('+(-alpha/RAD)+'deg)';
          frame.style.borderRadius=(i===0?'16px':'0')+' '+(i===7?'16px 16px':'0 0')+' '+(i===0?'16px':'0');
          image.style.cssText='left:'+(-start)+'px;top:0;width:'+w+'px;height:'+h+'px;';
        });
      });
    }
    caption(){
      for(const offset of [-2,-1,0,1,2]){const i=((this.active+offset)%this.count+this.count)%this.count;this.frames[i].forEach(({image})=>{image.loading='eager';});}
      const lang=document.documentElement.lang||'en';
      const names={en:['Previous industry','Next industry'],ar:['القطاع السابق','القطاع التالي'],tr:['Önceki sektör','Sonraki sektör'],ckb:['کەرتی پێشوو','کەرتی دواتر']};
      this.controls.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-label',(names[lang]||names.en)[i]));
      this.controls.querySelector('.panorama-name').textContent=this.cards[this.active].getAttribute('aria-label');
      this.controls.querySelector('.panorama-count').textContent=String(this.active+1).padStart(2,'0')+' / '+String(this.count).padStart(2,'0');
    }
    paint(){
      if(!this.g)return;this.ring.style.transform='rotateY('+this.angle+'deg)';
      this.cards.forEach((card,i)=>{const a=wrap(i*this.g.step+this.angle);card.style.visibility=Math.abs(a)>83?'hidden':'visible';card.style.setProperty('--panorama-depth',(0.18*Math.pow((1-Math.cos(a*RAD))/2,1.25)).toFixed(3));});
      const index=((Math.round(-this.angle/this.g.step)%this.count)+this.count)%this.count;
      if(index!==this.active){this.active=index;this.caption();this.onChange(index);}
    }
    focusIndex(index){let target=-index*this.g.step;target+=360*Math.round((this.angle-target)/360);this.target=target;this.hold=performance.now()+2300;this.wake();}
    stepBy(delta){this.focusIndex(((this.active+delta)%this.count+this.count)%this.count);}
    down(e){if(e.button!==0||e.target.closest('[data-panorama-nav]'))return;this.suppress=false;this.press={id:e.pointerId,x:e.clientX,y:e.clientY,angle:this.angle,samples:[]};}
    move(e){
      const p=this.press;if(!p||p.id!==e.pointerId)return;
      const dx=e.clientX-p.x,dy=e.clientY-p.y;
      if(!this.drag){if(e.pointerType!=='mouse'&&Math.abs(dy)>7&&Math.abs(dy)>Math.abs(dx)*1.15){this.press=null;return;}if(Math.abs(dx)<7)return;this.drag=true;this.target=null;this.velocity=0;this.root.classList.add('is-dragging');try{this.root.setPointerCapture(e.pointerId);}catch{}}
      this.angle=p.angle-dx*180/(Math.PI*this.g.radius*this.g.fit);const now=performance.now();p.samples.push({time:now,angle:this.angle});while(p.samples.length>2&&now-p.samples[0].time>100)p.samples.shift();this.paint();
    }
    release(e,cancel=false){
      const p=this.press;if(!p||p.id!==e.pointerId)return;this.press=null;if(!this.drag)return;
      this.drag=false;this.suppress=true;this.root.classList.remove('is-dragging');
      const first=p.samples[0],last=p.samples.at(-1),span=first&&last?(last.time-first.time)/1000:0;
      this.velocity=!cancel&&span>.008?clamp((last.angle-first.angle)/span,-200,200):0;
      if(Math.abs(this.velocity)>15)this.direction=Math.sign(this.velocity);this.hold=performance.now()+180;try{this.root.releasePointerCapture(e.pointerId);}catch{}this.wake();
    }
    click(e){
      const nav=e.target.closest('[data-panorama-nav]');if(nav){e.preventDefault();e.stopPropagation();this.stepBy(Number(nav.dataset.panoramaNav));return;}
      if(this.suppress){this.suppress=false;e.preventDefault();e.stopPropagation();return;}
      const card=e.target.closest('[data-sector]');if(card&&Number(card.dataset.sector)!==this.active){e.preventDefault();e.stopPropagation();this.focusIndex(Number(card.dataset.sector));}
    }
    key(e){if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();this.stepBy(e.key==='ArrowRight'?1:-1);}else if(e.key==='Home'||e.key==='End'){e.preventDefault();this.focusIndex(e.key==='Home'?0:this.count-1);}else if(e.key==='Enter'||e.key===' '){if(e.target.closest('[data-panorama-nav]'))return;e.preventDefault();this.suppress=false;this.cards[this.active].click();}}
    wake(){if(this.raf||!this.visible||document.hidden||this.destroyed)return;this.raf=window.requestAnimationFrame(now=>this.frame(now));}
    frame(now){
      this.raf=0;const dt=this.last?clamp((now-this.last)/1000,0,.05):1/60;this.last=now;
      if(!this.drag){
        if(this.target!==null){const delta=this.target-this.angle;this.velocity+= (118*delta-2*Math.sqrt(118)*this.velocity)*dt;this.angle+=this.velocity*dt;if(Math.abs(delta)<.02&&Math.abs(this.velocity)<.1){this.angle=this.target;this.target=null;this.velocity=0;}}
        else{const speed=now<this.hold?0:5.5*this.direction;this.velocity+=(speed-this.velocity)*(1-Math.exp(-dt/.55));this.angle+=this.velocity*dt;}
      }
      this.paint();this.wake();
    }
    sleep(){window.cancelAnimationFrame(this.raf);this.raf=0;this.last=0;}
    destroy(){this.destroyed=true;this.sleep();this.io?.disconnect();this.resize?.disconnect();this.listeners.forEach(fn=>fn());this.root.classList.remove('panorama-ready','is-dragging');}
  }
  window.FabyabPanorama=FabyabPanorama;


})();
