'use strict';
(() => {
  const wrap=(v,n)=>((v%n)+n)%n;
  class ProductOrbit {
    constructor(root,{onChange,onOpen,onInteract}){
      this.root=root;this.onChange=onChange;this.onOpen=onOpen;this.onInteract=onInteract;this.cards=[];this.items=[];this.position=0;this.target=0;this.running=false;this.frame=0;this.drag=null;this.suppressUntil=0;this.last=0;this.hover=0;this.hoverTarget=0;
      root.classList.add('product-orbit');
      root.querySelectorAll('.service-model').forEach(e=>e.remove());
      root.addEventListener('pointerdown',e=>this.down(e));
      root.addEventListener('pointermove',e=>this.move(e),{passive:false});
      root.addEventListener('pointerup',e=>this.up(e));
      root.addEventListener('pointercancel',e=>this.up(e,true));
      root.addEventListener('lostpointercapture',e=>{if(e.target===root)this.up(e,true);});
      root.addEventListener('pointerleave',()=>{this.hoverTarget=0;this.start();});
      root.addEventListener('dragstart',e=>e.preventDefault());
      root.addEventListener('click',e=>{const card=e.target.closest('.orbit-product');if(!card)return;e.stopPropagation();if(performance.now()<this.suppressUntil)return;const index=Number(card.dataset.orbitIndex);if(index===wrap(Math.round(this.target),this.items.length))this.onOpen(this.items[index].id);else this.select(index);});
      root.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();this.onInteract();if(e.key==='Home')this.select(0);else if(e.key==='End')this.select(this.items.length-1);else this.go(e.key==='ArrowRight'?1:-1);});
      document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();else this.start();});
      window.addEventListener('pagehide',()=>this.stop());window.addEventListener('pageshow',()=>this.start());
    }
    setItems(items,index){
      this.stop();this.drag=null;this.root.classList.remove('is-dragging');this.cards.forEach(c=>c.remove());this.items=items;this.position=this.target=index;this.cards=items.map((item,i)=>{
        const button=document.createElement('button');button.type='button';button.className='service-model orbit-product';button.dataset.orbitIndex=i;button.style.setProperty('--orbit-delay',(-i*.9)+'s');button.setAttribute('aria-label',item.label);button.setAttribute('aria-pressed',String(i===index));
        const image=document.createElement('img');image.src='assets/'+item.image;image.alt=item.label;image.width=1000;image.height=1000;image.draggable=false;image.loading=i===index?'eager':'lazy';button.append(image);this.root.append(button);return button;
      });this.paint();this.start();
    }
    setRunning(value){this.running=value;if(value)this.start();else this.stop();}
    start(){if(this.frame||!this.running||document.hidden||!this.items.length)return;this.last=0;this.frame=requestAnimationFrame(t=>this.tick(t));}
    stop(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}
    tick(time){this.frame=0;const dt=this.last?Math.min(.05,(time-this.last)/1000):1/60;this.last=time;
      if(!this.drag?.horizontal)this.position+=(this.target-this.position)*(1-Math.exp(-dt*5.5));
      this.hover+=(this.hoverTarget-this.hover)*(1-Math.exp(-dt*7));this.paint();
      if(Math.abs(this.position-this.target)>.0005||Math.abs(this.hover-this.hoverTarget)>.0005||this.drag)this.frame=requestAnimationFrame(t=>this.tick(t));
    }
    paint(){const n=this.items.length;if(!n)return;
      this.cards.forEach((card,i)=>{let d=wrap(i-this.position+n/2,n)-n/2;const a=Math.min(2,Math.abs(d)),sign=d<0?-1:1;
        const x=50-sign*(a<=1?33*a:33+32*(a-1));const width=a<=1?42-14*a:28-8*(a-1),height=a<=1?68-13*a:55-14*(a-1),cy=49+a*1.5;
        card.style.left=(x-width/2)+'%';card.style.top=(cy-height/2)+'%';card.style.width=width+'%';card.style.height=height+'%';card.style.opacity=String(a<=1?1:Math.max(0,1-(a-1)*1.6));card.style.zIndex=String(10-Math.round(a*4));card.style.transform='translateX('+(this.hover*8)+'px)';
        const active=i===wrap(Math.round(this.target),n),visible=Math.abs(d)<1.65;card.style.visibility=visible?'visible':'hidden';card.style.pointerEvents=visible?'auto':'none';card.tabIndex=active?0:-1;card.setAttribute('aria-hidden',String(!visible));card.setAttribute('aria-pressed',String(active));
      });
    }
    go(delta){if(this.drag)return;this.target=Math.round(this.target)+delta;this.commit();this.start();}
    select(index){const n=this.items.length,from=wrap(Math.round(this.target),n);let delta=wrap(index-from+n/2,n)-n/2;this.target=Math.round(this.target)+delta;this.commit();this.onInteract();this.start();}
    commit(){this.onChange(wrap(Math.round(this.target),this.items.length));}
    down(e){if(e.isPrimary===false||e.button>0||!this.items.length)return;this.onInteract();this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,position:this.position,lastX:e.clientX,time:performance.now(),velocity:0,horizontal:false};this.target=this.position;}
    move(e){if(!this.drag){if(e.pointerType==='mouse'){const r=this.root.getBoundingClientRect();this.hoverTarget=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1));this.start();}return;}
      const d=this.drag;if(e.pointerId!==d.id)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;
      if(!d.horizontal){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){this.up(e,true);return;}if(Math.abs(dx)<7)return;d.horizontal=true;this.root.setPointerCapture?.(e.pointerId);this.root.classList.add('is-dragging');}
      if(e.cancelable)e.preventDefault();const now=performance.now(),width=this.root.getBoundingClientRect().width;d.velocity=(e.clientX-d.lastX)/Math.max(8,now-d.time);d.lastX=e.clientX;d.time=now;this.position=d.position+dx/(width*.33);this.target=this.position;this.suppressUntil=now+350;this.paint();
    }
    up(e,cancel=false){const d=this.drag;if(!d||e.pointerId!==d.id)return;this.drag=null;this.root.classList.remove('is-dragging');
      if(d.horizontal){const width=this.root.getBoundingClientRect().width,momentum=cancel?0:Math.max(-.8,Math.min(.8,d.velocity*150/(width*.33)));this.target=Math.round(this.position+momentum);this.suppressUntil=performance.now()+350;this.commit();}
      else this.target=Math.round(this.position);
      if(this.root.hasPointerCapture?.(d.id))this.root.releasePointerCapture(d.id);this.onInteract();this.start();
    }
  }
  window.FabyabProductOrbit=ProductOrbit;
})();
