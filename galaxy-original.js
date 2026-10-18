/* Original Galaxy_3D by its Framer author, adapted to the existing static HTML.
Source supplied by the site owner: https://framer.com/m/Galaxy-3D-pLJO0S.js@BF20R3TAqRhQVdcnba5H
Original geometry, shaders, palette and camera settings retained. Background made transparent.
Three.js license: assets/vendor/THREE-LICENSE.txt
Effects source notes: assets/effects-sources.txt
*/
'use strict';
(()=>{
 function init(){
 const mount=document.getElementById('galaxy-interlude');if(!mount||!window.THREE)return;
 const defaults={width:400,height:400,livePreview:false,appearance:{backgroundColor:"#000000",centerLightColor:"#A8A8A8",coreColor:"#2200FF",midColor:"#00039E",edgeColor:"#482BFF"},geometry:{particleCount:5e4,backgroundStarsCount:800,radius:7.5,branches:10,spin:3.5,randomness:.25,randomnessPower:3},effects:{particleSize:.25,glowSpeed:1.5,pulseSpread:.8,vortexSpeed:-.4,rotationSpeed:.08},cameraSettings:{cameraPitch:5,cameraDistance:17,fov:45,enableParallax:true,parallaxStrength:5,parallaxDamping:.01}};
 const props={...defaults.appearance,...defaults.geometry,...defaults.effects,...defaults.cameraSettings};
 const isStatic=false;
 try{
const width=mount.clientWidth;const height=mount.clientHeight;// Performance Optimization: Reduce particle count significantly in the editor
// but maintain high fidelity in the live preview/published site.
const performanceCount=isStatic?Math.min(props.particleCount,15e3):props.particleCount;// 1. Core Scene Environment
const scene=new THREE.Scene;scene.background=null;let targetX=0,targetY=0,currentX=0,currentY=0;const camera=new THREE.PerspectiveCamera(props.fov,width/height,.1,100);camera.position.set(0,props.cameraPitch,props.cameraDistance);camera.lookAt(0,0,0);// 2. Ultra High-Fidelity Renderer
const renderer=new THREE.WebGLRenderer({antialias:!isStatic,alpha:true,powerPreference:"high-performance"});const pixelRatio=Math.min(window.devicePixelRatio,2);renderer.setPixelRatio(pixelRatio);renderer.setSize(width,height);renderer.setClearColor(0x000000,0);mount.appendChild(renderer.domElement);// 3. Shaders
const vertexShader=`
            uniform float uTime;
            uniform float uPixelRatio;
            uniform float uSizeBase;
            uniform float uVortexSpeed;
            attribute float size;
            attribute vec3 customColor;
            attribute float aDistance;
            attribute float aAngle;
            varying vec3 vColor;
            varying float vDistance;
            varying float vAngle;
            void main() {
                vColor = customColor;
                vDistance = aDistance;
                vAngle = aAngle;
                vec3 pos = position;
                float twist = (uTime * uVortexSpeed) / (vDistance + 0.1);
                float c = cos(twist);
                float s = sin(twist);
                float newX = pos.x * c - pos.z * s;
                float newZ = pos.x * s + pos.z * c;
                pos.x = newX;
                pos.z = newZ;
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * uSizeBase * uPixelRatio * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;const fragmentShader=`
            uniform float uTime;
            uniform float uGlowSpeed;
            uniform vec3 uCenterColor;
            uniform float uPulseSpread;
            varying vec3 vColor;
            varying float vDistance;
            varying float vAngle;
            void main() {
                vec2 pt = gl_PointCoord - vec2(0.5);
                float d = length(pt);
                float alpha = exp(-d * d * 30.0);
                float core = exp(-d * d * 150.0);
                float flowPhase = vDistance * 1.5 - vAngle * 2.0 - uTime * uGlowSpeed;
                float flowStrength = pow(sin(flowPhase) * 0.5 + 0.5, 1.0 / uPulseSpread); 
                vec3 baseColor = mix(vColor, uCenterColor, core * 0.8);
                vec3 finalColor = baseColor + (baseColor * flowStrength * 1.8);
                float finalAlpha = alpha * (0.6 + flowStrength * 0.6);
                if (finalAlpha < 0.01) discard; 
                gl_FragColor = vec4(finalColor, finalAlpha);
            }
        `;const material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uPixelRatio:{value:pixelRatio},uSizeBase:{value:props.particleSize},uGlowSpeed:{value:props.glowSpeed},uVortexSpeed:{value:props.vortexSpeed},uCenterColor:{value:new THREE.Color(props.centerLightColor)},uPulseSpread:{value:props.pulseSpread}},depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,vertexShader,fragmentShader,transparent:true});// 4. Generate Geometry (Optimized Count)
const geometry=new THREE.BufferGeometry;const positions=new Float32Array(performanceCount*3);const colors=new Float32Array(performanceCount*3);const sizes=new Float32Array(performanceCount);const distances=new Float32Array(performanceCount);const angles=new Float32Array(performanceCount);const coreC=new THREE.Color(props.coreColor);const midC=new THREE.Color(props.midColor);const edgeC=new THREE.Color(props.edgeColor);for(let i=0;i<performanceCount;i++){const i3=i*3;const r=Math.random()*props.radius;const spinAngle=r*props.spin;const branchAngle=i%props.branches/props.branches*Math.PI*2;const perfectAngle=branchAngle+spinAngle;const pwr=props.randomnessPower;const rnd=props.randomness;const randomX=Math.pow(Math.random(),pwr)*(Math.random()<.5?1:-1)*rnd*r;const randomY=Math.pow(Math.random(),pwr)*(Math.random()<.5?1:-1)*rnd*r*.15;const randomZ=Math.pow(Math.random(),pwr)*(Math.random()<.5?1:-1)*rnd*r;positions[i3]=Math.cos(perfectAngle)*r+randomX;positions[i3+1]=randomY;positions[i3+2]=Math.sin(perfectAngle)*r+randomZ;distances[i]=r;angles[i]=perfectAngle;const mixedColor=new THREE.Color;const midThreshold=props.radius*.35;if(r<midThreshold){mixedColor.copy(coreC).lerp(midC,r/midThreshold);}else{mixedColor.copy(midC).lerp(edgeC,(r-midThreshold)/(props.radius-midThreshold));}colors[i3]=mixedColor.r;colors[i3+1]=mixedColor.g;colors[i3+2]=mixedColor.b;sizes[i]=.5+Math.random()*.5;}geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));geometry.setAttribute("customColor",new THREE.BufferAttribute(colors,3));geometry.setAttribute("size",new THREE.BufferAttribute(sizes,1));geometry.setAttribute("aDistance",new THREE.BufferAttribute(distances,1));geometry.setAttribute("aAngle",new THREE.BufferAttribute(angles,1));const galaxy=new THREE.Points(geometry,material);scene.add(galaxy);// Ambient Stars (Reduced in editor)
const ambCount=isStatic?Math.min(props.backgroundStarsCount,200):props.backgroundStarsCount;const ambGeo=new THREE.BufferGeometry;const ambPos=new Float32Array(ambCount*3);const ambColors=new Float32Array(ambCount*3);const ambSizes=new Float32Array(ambCount);const ambDistances=new Float32Array(ambCount);const ambAngles=new Float32Array(ambCount);for(let i=0;i<ambCount;i++){const i3=i*3;const x=(Math.random()-.5)*60;const y=(Math.random()-.5)*60;const z=(Math.random()-.5)*60;ambPos[i3]=x;ambPos[i3+1]=y;ambPos[i3+2]=z;// Ambient stars generic colors
ambColors[i3]=.9+Math.random()*.1;ambColors[i3+1]=.9+Math.random()*.1;ambColors[i3+2]=1;ambSizes[i]=.2+Math.random()*.4;// Required for shader layout interpolation so they don't crash and disappear
ambDistances[i]=Math.sqrt(x*x+y*y+z*z);ambAngles[i]=Math.atan2(z,x);}ambGeo.setAttribute("position",new THREE.BufferAttribute(ambPos,3));ambGeo.setAttribute("customColor",new THREE.BufferAttribute(ambColors,3));ambGeo.setAttribute("size",new THREE.BufferAttribute(ambSizes,1));ambGeo.setAttribute("aDistance",new THREE.BufferAttribute(ambDistances,1));ambGeo.setAttribute("aAngle",new THREE.BufferAttribute(ambAngles,1));const ambStars=new THREE.Points(ambGeo,material);scene.add(ambStars);
 let raf=0,visible=false,last=0,elapsed=0,disposed=false;
 const frame=now=>{raf=0;if(disposed||!visible||document.hidden)return;
 const delta=last?Math.min((now-last)/1000,.05):1/60;last=now;elapsed+=delta;
 material.uniforms.uTime.value=elapsed;
 galaxy.rotation.y+=delta*props.rotationSpeed;ambStars.rotation.y+=delta*props.rotationSpeed*.15;
 currentX+=(targetX-currentX)*props.parallaxDamping;currentY+=(targetY-currentY)*props.parallaxDamping;
 camera.position.set(currentX*props.parallaxStrength*5,props.cameraPitch+currentY*props.parallaxStrength*3,props.cameraDistance);
 camera.lookAt(0,0,0);renderer.render(scene,camera);raf=requestAnimationFrame(frame);
 };
 const wake=()=>{if(!raf&&!disposed&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(frame);}};
 const sleep=()=>{cancelAnimationFrame(raf);raf=0;last=0;};
 const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)wake();else sleep();},{rootMargin:'100px'});observer.observe(mount);
 const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(mount);
 const pointer=e=>{if(e.pointerType==='touch')return;targetX=e.clientX/window.innerWidth*2-1;targetY=-(e.clientY/window.innerHeight)*2+1;};
 window.addEventListener('pointermove',pointer,{passive:true});
 const visibility=()=>document.hidden?sleep():wake();document.addEventListener('visibilitychange',visibility);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();sleep();});
 renderer.domElement.addEventListener('webglcontextrestored',wake);
 window.addEventListener('pagehide',e=>{sleep();if(e.persisted)return;disposed=true;observer.disconnect();resizeObserver.disconnect();window.removeEventListener('pointermove',pointer);document.removeEventListener('visibilitychange',visibility);geometry.dispose();ambGeo.dispose();material.dispose();renderer.dispose();},{once:true});
 window.addEventListener('pageshow',wake);resize();
 mount.dataset.galaxy='original';
 }catch(error){mount.dataset.galaxy='unavailable';console.warn('Galaxy rendering unavailable',error);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
