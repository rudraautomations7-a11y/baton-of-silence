'use strict';
// Start the trimmed click at button press, before the browser's later click event.
// A decoded buffer avoids MP3 seek/decode lag; the audio element covers early presses.
const buttonClickSound=new Audio('assets/button-click-fast.wav');
buttonClickSound.preload='auto';buttonClickSound.load();
const ClickAudioContext=window.AudioContext||window.webkitAudioContext;
const buttonAudioContext=ClickAudioContext?new ClickAudioContext():null;
let buttonClickBuffer=null;
if(buttonAudioContext){
 fetch('assets/button-click-fast.wav').then(response=>response.arrayBuffer())
  .then(bytes=>buttonAudioContext.decodeAudioData(bytes))
  .then(buffer=>{buttonClickBuffer=buffer;}).catch(()=>{});
}
function playButtonClick(){
 if(buttonClickBuffer){
  const source=buttonAudioContext.createBufferSource();source.buffer=buttonClickBuffer;
  source.connect(buttonAudioContext.destination);source.start();
  if(buttonAudioContext.state==='suspended')buttonAudioContext.resume().catch(()=>{});
 }else{
  buttonClickSound.pause();buttonClickSound.currentTime=0;
  buttonClickSound.play().catch(()=>{});
 }
}
function eventButton(event){
 const button=event.target instanceof Element?event.target.closest('button'):null;
 return button&&!button.disabled?button:null;
}
let pressedButton=null;
document.addEventListener('pointerdown',event=>{
 if(event.button!==0)return;
 const button=eventButton(event);if(!button)return;
 pressedButton=button;playButtonClick();
},true);
document.addEventListener('pointercancel',()=>{pressedButton=null;},true);
document.addEventListener('click',event=>{
 const button=eventButton(event);if(!button)return;
 if(event.detail>0&&button===pressedButton){pressedButton=null;return;}
 pressedButton=null;playButtonClick();
},true);

// Hide the old pose until the next pose is decoded, so it never moves to the new speaker's side.
function swapStoryPose(character,image,alt){
 const source='assets/'+image;
 character.alt=alt;
 if(character.getAttribute('src')===source)return;
 character.style.visibility='hidden';
 character.src=source;
 character.decode().then(()=>{
  if(character.getAttribute('src')===source)character.style.visibility='visible';
 }).catch(()=>{
  if(character.getAttribute('src')===source&&character.naturalWidth)character.style.visibility='visible';
 });
}
// The cinematic landing is the entry point. Its buttons alone control the handoff.
(function createLanding(){
 const root=document.documentElement;
 const landing=document.getElementById('landing');
 const mission=document.getElementById('landing-mission');
 const missionNav=landing.querySelector('.landing-nav-mission');
 const homeNav=landing.querySelector('.landing-nav-home');
 const close=landing.querySelector('.landing-mission-close');
 const startButtons=landing.querySelectorAll('.landing-start,.landing-mission-start');
 const far=landing.querySelector('.landing-star-far');
 const near=landing.querySelector('.landing-star-near');
 let starSeed=2026;
 function rand(){starSeed=(starSeed*16807)%2147483647;return(starSeed-1)/2147483646;}
 for(const [layer,count] of [[far,55],[near,27]]){
  const fragment=document.createDocumentFragment();
  for(let i=0;i<count;i++){
   const star=document.createElement('i');
   star.style.left=rand()*100+'%';star.style.top=rand()*83+'%';
   star.style.setProperty('--size',(layer===near?1.5+rand()*2:.7+rand()*1.2)+'px');
   star.style.setProperty('--delay',(-rand()*14)+'s');
   star.style.setProperty('--duration',(8+rand()*13)+'s');
   fragment.append(star);
  }
  layer.append(fragment);
 }
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  landing.addEventListener('pointermove',event=>{
   const x=event.clientX/innerWidth-.5,y=event.clientY/innerHeight-.5;
   landing.style.setProperty('--pointer-x',x.toFixed(3));
   landing.style.setProperty('--pointer-y',y.toFixed(3));
  },{passive:true});
 }
 function showMission(){mission.hidden=false;missionNav.setAttribute('aria-expanded','true');root.classList.add('landing-mission-open');close.focus({preventScroll:true});}
 function hideMission(){mission.hidden=true;missionNav.setAttribute('aria-expanded','false');root.classList.remove('landing-mission-open');missionNav.focus({preventScroll:true});}
 missionNav.addEventListener('click',showMission);
 homeNav.addEventListener('click',()=>{if(!mission.hidden)hideMission();});
 close.addEventListener('click',hideMission);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!mission.hidden)hideMission();});
 let started=false;
 function start(){
  if(started)return;
  started=true;
  mission.hidden=true;
  root.classList.remove('landing-mission-open');
  root.dispatchEvent(new CustomEvent('intro-start'));
  setTimeout(()=>{landing.hidden=true;},matchMedia('(prefers-reduced-motion: reduce)').matches?0:850);
 }
 startButtons.forEach(button=>button.addEventListener('click',start));
})();
// Three cinematic beats sit between the landing CTA and the first Earth–Moon scene.
(function createStoryIntro(){
 const root=document.documentElement;
 const intro=document.getElementById('story-intro');
 const landing=document.getElementById('landing');
 const universe=document.getElementById('universe');
 const slides=[...intro.querySelectorAll('.story-slide')];
 const caption=intro.querySelector('.story-caption');
 const captionText=document.getElementById('story-caption-text');
 const count=document.getElementById('story-count');
 const next=document.getElementById('story-next');
 const skip=document.getElementById('story-skip');
 const dust=intro.querySelector('.story-dust');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const captions=[
  'Mira just learned that NASA never brought most of its Moon and Mars machines back home.',
  "Too curious to wait until morning, she sprinted straight to Dr. Vance's observatory...",
  'where Dr. Vance was already searching the night sky',
  'Tonight, Mira wants to know what really happened to all of them.'
 ];
 let active=false,index=0,frame=0;
 let targetX=0,targetY=0,currentX=0,currentY=0;
 let dustSeed=11969;
 function rand(){dustSeed=(dustSeed*16807)%2147483647;return(dustSeed-1)/2147483646;}
 const motes=document.createDocumentFragment();
 for(let i=0;i<28;i++){
  const mote=document.createElement('i');
  mote.style.left=rand()*100+'%';mote.style.top=rand()*90+'%';
  mote.style.setProperty('--dust-size',(1+rand()*2.2)+'px');
  mote.style.setProperty('--dust-duration',(8+rand()*11)+'s');
  mote.style.setProperty('--dust-delay',(-rand()*16)+'s');
  motes.append(mote);
 }
 dust.append(motes);
 function move(event){
  if(!active||reduced||event.pointerType==='touch')return;
  targetY=(event.clientX/innerWidth-.5)*5;
  targetX=(.5-event.clientY/innerHeight)*5;
 }
 function tilt(){
  if(!active)return;
  currentX+=(targetX-currentX)*.09;currentY+=(targetY-currentY)*.09;
  intro.style.setProperty('--intro-rotate-x',currentX.toFixed(3)+'deg');
  intro.style.setProperty('--intro-rotate-y',currentY.toFixed(3)+'deg');
  intro.style.setProperty('--dust-shift-x',(currentY*3).toFixed(2)+'px');
  intro.style.setProperty('--dust-shift-y',(currentX*-3).toFixed(2)+'px');
  frame=requestAnimationFrame(tilt);
 }
 intro.addEventListener('pointermove',move,{passive:true});
 intro.addEventListener('pointerleave',()=>{targetX=0;targetY=0});
 function showSlide(nextIndex){
  index=nextIndex;
  slides.forEach((slide,i)=>{slide.classList.toggle('is-active',i===index);slide.setAttribute('aria-hidden',String(i!==index));});
  caption.classList.remove('is-entering');captionText.textContent=captions[index];
  intro.dataset.slide=String(index+1);
  count.textContent=String(index+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');
  next.textContent=index===slides.length-1?"Continue with Mira's question →":'Next →';
  void caption.offsetWidth;caption.classList.add('is-entering');
 }
 function finish(){
  if(!active)return;
  active=false;cancelAnimationFrame(frame);
  landing.hidden=true;
  root.classList.remove('intro-active');root.classList.add('mission-started');
  universe.removeAttribute('inert');universe.removeAttribute('aria-hidden');
  root.dispatchEvent(new CustomEvent('mission-start'));
  setTimeout(()=>{intro.hidden=true;intro.setAttribute('aria-hidden','true');universe.focus({preventScroll:true});},reduced?0:850);
 }
 root.addEventListener('intro-start',()=>{
  if(active)return;
  active=true;intro.hidden=false;intro.setAttribute('aria-hidden','false');
  void intro.offsetWidth;root.classList.add('intro-active');showSlide(0);
  next.focus({preventScroll:true});
  if(!reduced)frame=requestAnimationFrame(tilt);
 });
 next.addEventListener('click',()=>index===slides.length-1?finish():showSlide(index+1));
 skip.addEventListener('click',finish);
})();
// Fixed planetary centres preserve the empty diagonal for the next laser step.
// This is a visual composition, not an astronomical scale model.
const starfield=document.querySelector('.stars');
let seed=137;
function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
const stars=document.createDocumentFragment();
for(let i=0;i<95;i++){
 const star=document.createElement('i');
 star.className='star';star.style.left=random()*100+'%';star.style.top=random()*100+'%';star.style.opacity=String(.18+random()*.65);
 if(i%13===0){star.style.width='2px';star.style.height='2px';}
 stars.append(star);
}
starfield.append(stars);
function syncVisibility(){document.documentElement.classList.toggle('scene-paused',document.hidden);}
document.addEventListener('visibilitychange',syncVisibility);
syncVisibility();

// Texture the sphere in its own canvas so land moves over its curved surface,
// rather than spinning a flat photograph. Lighting stays fixed in space.
(async function createEarth(){
 const canvas=document.getElementById('earth-globe');
 const host=document.getElementById('earth');
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
 if(!gl)return;
 const vertex='attribute vec2 position; varying vec2 v; void main(){v=position;gl_Position=vec4(position,0.,1.);}';
 const fragment=`precision highp float;
 varying vec2 v;uniform sampler2D dayMap;uniform sampler2D nightMap;uniform float rotation;
 void main(){
  float r2=dot(v,v);if(r2>1.){gl_FragColor=vec4(0.);return;}
  vec3 n=vec3(v.x,v.y,sqrt(max(0.,1.-r2)));
  vec2 uv=vec2(atan(n.x,n.z)/6.2831853+.5+rotation,asin(n.y)/3.14159265+.5);
  vec3 day=texture2D(dayMap,uv).rgb;
  vec3 city=texture2D(nightMap,uv).rgb;
  vec3 light=normalize(vec3(-.9,.45,.65));
  float sun=dot(n,light);float daylight=smoothstep(-.14,.3,sun);
  vec3 color=day*(.035+max(sun,0.)*.97);
  color+=city*vec3(1.35,1.1,.72)*(1.-daylight)*1.5;
  color+=vec3(.012,.035,.07)*(1.-daylight);
  float rim=pow(1.-n.z,3.5);
  color+=vec3(.13,.56,1.)*rim*(.25+daylight*.7);
  color=mix(color,color*1.08+vec3(.015,.035,.06),daylight*.22);
  gl_FragColor=vec4(color,1.);
 }`;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Earth shader failed');return s;}
 try{
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  function texture(url,unit,name){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{gl.activeTexture(gl.TEXTURE0+unit);const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,name),unit);resolve();};img.onerror=reject;img.src=url;});}
  await Promise.all([texture('assets/earth-day.jpg',0,'dayMap'),texture('assets/earth-night.webp',1,'nightMap')]);
  const rotation=gl.getUniformLocation(program,'rotation');const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let turn=.05,last=0,frame=0;
  function draw(){const size=Math.min(1024,Math.ceil(host.clientWidth*Math.min(devicePixelRatio||1,2)));if(canvas.width!==size||canvas.height!==size){canvas.width=size;canvas.height=size;gl.viewport(0,0,size,size);}gl.uniform1f(rotation,turn);gl.drawArrays(gl.TRIANGLES,0,6);}
  function tick(now){frame=0;if(last)turn=(turn+Math.min((now-last)/1000,.1)/(15/.95))%1;last=now;draw();if(!document.hidden&&!motion.matches)frame=requestAnimationFrame(tick);}
  function sync(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;draw();if(!document.hidden&&!motion.matches)frame=requestAnimationFrame(tick);}
  new ResizeObserver(draw).observe(host);document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(frame)cancelAnimationFrame(frame);host.classList.remove('globe-ready');});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
  draw();host.classList.add('globe-ready');sync();
 }catch(error){console.warn('Earth rendering unavailable; using image fallback.');}
})();

// Reveal Mira's question, then let the viewer invite Dr. Vance into the scene.
(function revealMiraDialogue(){
 const scene=document.querySelector('.mira-scene');
 const line=document.getElementById('mira-line');
 const universe=document.getElementById('universe');
 const prompt=document.getElementById('continue-prompt');
 const sendLaser=document.getElementById('send-laser');
 const vanceScene=document.getElementById('vance-scene');
 const vanceLine=document.getElementById('vance-line');
 const dialogue='Dr. Vance... umm, I was curious, what happened to all the machines NASA left on the Moon? Do they just sit there dead?';
 const answer='Not all of them, Mira. Watch what happens when we shine a laser at where Apollo 11 landed in 1969.';
 const followUp='And how do we shine a laser at Apollo 11?';
 const finalAnswer='The observatory telescope is already aimed at their landing spot. Go ahead, send the laser pulse.';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let ready=false,phase=0;
 function inviteNext(){ready=true;document.documentElement.classList.add('continuation-ready');prompt.removeAttribute('aria-hidden');}
 function pauseForSpeech(){ready=false;document.documentElement.classList.remove('continuation-ready');prompt.setAttribute('aria-hidden','true');}
 function typeInto(target,text,done,delay=58,startDelay=350){
  target.textContent='';
  if(reduced){target.textContent=text;done();return;}
  const words=text.split(' ');let index=0;
  setTimeout(function typeWord(){target.textContent+=(index?' ':'')+words[index++];if(index<words.length)setTimeout(typeWord,delay);else done();},startDelay);
 }
 function finishOpening(){scene.classList.add('dialogue-complete');phase=1;inviteNext();}
 function advanceStory(){
  if(!ready)return;
  pauseForSpeech();
  if(phase===1){
   document.documentElement.classList.add('vance-visible');
   vanceScene.classList.remove('dialogue-complete');
   typeInto(vanceLine,answer,()=>{vanceScene.classList.add('dialogue-complete');phase=2;inviteNext();},58,850);
  }else if(phase===2){
   document.documentElement.classList.add('mira-followup');
   scene.classList.remove('dialogue-complete');
   typeInto(line,followUp,()=>{scene.classList.add('dialogue-complete');phase=3;inviteNext();});
  }else if(phase===3){
   document.documentElement.classList.remove('mira-followup');
   document.documentElement.classList.add('vance-final');
   vanceScene.classList.remove('dialogue-complete');
   typeInto(vanceLine,finalAnswer,()=>{vanceScene.classList.add('dialogue-complete');phase=4;document.documentElement.classList.add('laser-ready');});
  }
 }
 universe.addEventListener('click',advanceStory);
 sendLaser.addEventListener('click',event=>event.stopPropagation());
 document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&ready){event.preventDefault();advanceStory();}});
 let started=false;
 document.documentElement.addEventListener('mission-start',()=>{
  if(started)return;started=true;
  if(reduced){line.textContent=dialogue;finishOpening();return;}
  const words=dialogue.split(' ');let index=0;
  setTimeout(function typeWord(){
   line.textContent+=(index?' ':'')+words[index++];
   if(index<words.length)setTimeout(typeWord,62);else finishOpening();
  },2800);
 });
})();

// Fire a physically timed 2.56-second laser-ranging pulse to Apollo 11 and back.
(function createLaserRanging(){
 const root=document.documentElement;
 const button=document.getElementById('send-laser');
 const earth=document.getElementById('earth');
 const target=document.getElementById('moon-target-dot');
 const track=document.getElementById('laser-track');
 const ray=document.getElementById('laser-ray');
 const photon=document.getElementById('photon');
 const telemetry=document.getElementById('laser-telemetry');
 const timer=document.getElementById('laser-timer');
 const distance=document.getElementById('laser-distance');
 let geometry=null,launched=false,frame=0;
 function measure(){
  const e=earth.getBoundingClientRect();const t=target.getBoundingClientRect();
  const cx=e.left+e.width/2,cy=e.top+e.height/2,tx=t.left+t.width/2,ty=t.top+t.height/2;
  const dx=tx-cx,dy=ty-cy,length=Math.hypot(dx,dy)||1;
  const radius=e.width*.46;
  const x1=cx+dx/length*radius,y1=cy+dy/length*radius;
  geometry={x1,y1,x2:tx,y2:ty,dx:tx-x1,dy:ty-y1};
  track.setAttribute('x1',x1);track.setAttribute('y1',y1);track.setAttribute('x2',tx);track.setAttribute('y2',ty);
  telemetry.style.left=(x1+(tx-x1)*.5)+'px';telemetry.style.top=(y1+(ty-y1)*.5-34)+'px';
 }
 function draw(fromX,fromY,toX,toY){ray.setAttribute('x1',fromX);ray.setAttribute('y1',fromY);ray.setAttribute('x2',toX);ray.setAttribute('y2',toY);photon.setAttribute('cx',toX);photon.setAttribute('cy',toY);}
 function finish(){cancelAnimationFrame(frame);frame=0;timer.textContent='2.56s';distance.textContent='768,800 km round-trip';root.classList.remove('laser-running');root.classList.add('laser-complete');root.dispatchEvent(new CustomEvent('laser-echo-complete'));}
 function tick(start,now){
  const elapsed=Math.min(now-start,2560);timer.textContent=(elapsed/1000).toFixed(2)+'s';
  if(elapsed<=1280){const p=elapsed/1280;draw(geometry.x1,geometry.y1,geometry.x1+geometry.dx*p,geometry.y1+geometry.dy*p);distance.textContent='384,400 km';}
  else{if(!root.classList.contains('moon-impact')){root.classList.add('moon-impact');distance.textContent='REFLECTED ECHO • RETURNING';}const p=(elapsed-1280)/1280;draw(geometry.x2,geometry.y2,geometry.x2-geometry.dx*p,geometry.y2-geometry.dy*p);}
  if(elapsed<2560)frame=requestAnimationFrame(time=>tick(start,time));else finish();
 }
 function launch(event){
  event.stopPropagation();if(launched||!root.classList.contains('laser-ready'))return;launched=true;button.disabled=true;root.classList.remove('laser-ready');root.classList.add('laser-running');timer.textContent='0.00s';distance.textContent='384,400 km';measure();draw(geometry.x1,geometry.y1,geometry.x1,geometry.y1);const start=performance.now();frame=requestAnimationFrame(time=>tick(start,time));
 }
 button.addEventListener('click',launch);
 addEventListener('resize',()=>{if(launched)measure();},{passive:true});
})();

// Continue the story after the laser echo.
(function createPostEchoConversation(){
 const root=document.documentElement;
 const universe=document.getElementById('universe');
 const prompt=document.getElementById('continue-prompt');
 const scene=document.getElementById('post-echo-scene');
 const chapterButton=document.getElementById('chapter-button');
 const chapterSurface=document.getElementById('chapter-surface');
 const speaker=document.getElementById('post-speaker');
 const line=document.getElementById('post-line');
 const mirrorReveal=document.getElementById('mirror-reveal');
 const mirrorLens=document.getElementById('mirror-lens');
 const mirrorDot=document.getElementById('moon-target-dot');
 const mirrorCoordinates=document.getElementById('mirror-reveal-coordinates');
 const mirrorLines=[document.getElementById('mirror-reveal-line-top'),document.getElementById('mirror-reveal-line-bottom')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const beats=[
  {speaker:'MIRA',side:'mira',pose:'post-mira-amazed-active',text:'Whoa, Dr. Vance... it bounced back in like 2.56 seconds!?'},
  {speaker:'DR. VANCE',side:'vance',pose:'post-vance-mirrors-active',text:'Yes, Mira, Apollo 11 astronauts left a box of 100 glass mirrors there...'},
  {speaker:'DR. VANCE',side:'vance',pose:'post-vance-mirrors-active',text:'The glass mirrors sent back the lights after the lights hit them.'},
  {speaker:'MIRA',side:'mira',pose:'post-mira-when-active',text:'Ohh, when did NASA astronauts leave it there, Dr. Vance?'},
  {speaker:'DR. VANCE',side:'vance',pose:'post-vance-date-active',text:'On July 21, 1969, Mira.'},
  {speaker:'MIRA',side:'mira',pose:'post-mira-when-active',text:'Wait—can we actually see what that mirror box looks like?!'},
  {speaker:'DR. VANCE',side:'vance',pose:'post-vance-zoom-active',text:"Sure! Let's zoom the telescope straight into that spot.",revealAfter:true},
  {speaker:'MIRA',side:'mira',pose:'post-mira-more-active',text:'That mirror is so cool! Is there anything else sitting on the Moon?'},
  {speaker:'DR. VANCE',side:'vance',pose:'post-vance-robot-active',text:'Before humans could land, a tiny robot had to go first.'},
  {speaker:'DR. VANCE',side:'vance',pose:'post-vance-zoom-active',text:"Let's zoom in to see it."}
 ];
 const poseClasses=beats.map(beat=>beat.pose);let index=-1,ready=false;
 function positionMirrorLines(){
  const dot=mirrorDot.getBoundingClientRect(),lens=mirrorLens.getBoundingClientRect();
  const x=dot.left+dot.width/2,y=dot.top+dot.height/2;
  mirrorCoordinates.style.left=(x+14+mirrorCoordinates.offsetWidth<innerWidth-8?x+14:x-mirrorCoordinates.offsetWidth-14)+'px';
  mirrorCoordinates.style.top=(y-38)+'px';
  mirrorLines.forEach((beam,i)=>{
   const endX=lens.right-3,endY=lens.top+lens.height*(i===0?.22:.78);
   const length=Math.hypot(endX-x,endY-y);
   beam.setAttribute('x1',x);beam.setAttribute('y1',y);
   beam.setAttribute('x2',endX);beam.setAttribute('y2',endY);
   beam.style.setProperty('--mirror-line-length',length.toFixed(2)+'px');
  });
 }
 function showMirrorReveal(){
  positionMirrorLines();mirrorReveal.removeAttribute('inert');mirrorReveal.setAttribute('aria-hidden','false');
  void mirrorReveal.offsetWidth;root.classList.add('mirror-reveal-active');
 }
 function hideMirrorReveal(){
  root.classList.remove('mirror-reveal-active');mirrorReveal.setAttribute('inert','');mirrorReveal.setAttribute('aria-hidden','true');
 }
 function setReady(value){ready=value;root.classList.toggle('continuation-ready',value);if(value)prompt.removeAttribute('aria-hidden');else prompt.setAttribute('aria-hidden','true');}
 function typeBeat(text,done){line.textContent='';scene.classList.remove('post-dialogue-complete');if(reduced){line.textContent=text;done();return;}const words=text.split(' ');let word=0;setTimeout(function typeWord(){line.textContent+=(word?' ':'')+words[word++];if(word<words.length)setTimeout(typeWord,64);else done();},360);}
 function showBeat(next){
  setReady(false);hideMirrorReveal();poseClasses.forEach(name=>root.classList.remove(name));root.classList.remove('post-speaker-mira','post-speaker-vance');const beat=beats[next];speaker.textContent=beat.speaker;root.classList.add('post-speaker-'+beat.side,beat.pose);index=next;typeBeat(beat.text,()=>{
   scene.classList.add('post-dialogue-complete');
   if(beat.revealAfter){showMirrorReveal();setTimeout(()=>{if(index===next)setReady(true);},reduced?0:1100);}
   else if(index<beats.length-1)setReady(true);
   else root.classList.add('chapter-ready');
  });
 }
 function advance(event){if(!ready||!root.classList.contains('post-echo-visible'))return;if(event)event.stopPropagation();showBeat(index+1);}
 root.addEventListener('laser-echo-complete',()=>{setTimeout(()=>{root.classList.add('post-echo-visible');showBeat(0);},700);});
 universe.addEventListener('click',advance);
 document.addEventListener('keydown',event=>{if(event.target instanceof Element&&event.target.closest('a'))return;if((event.key==='Enter'||event.key===' ')&&ready&&root.classList.contains('post-echo-visible')){event.preventDefault();advance(event);}});
 mirrorReveal.querySelectorAll('a').forEach(link=>link.addEventListener('click',event=>event.stopPropagation()));
 addEventListener('resize',()=>{if(root.classList.contains('mirror-reveal-active'))positionMirrorLines();},{passive:true});
 chapterButton.addEventListener('click',event=>{
  event.stopPropagation();if(!root.classList.contains('chapter-ready'))return;
  root.classList.remove('chapter-ready');root.classList.add('chapter-travel');chapterButton.disabled=true;
  const land=()=>{root.classList.add('chapter-landed');chapterSurface.focus({preventScroll:true});root.dispatchEvent(new CustomEvent('chapter-arrived'));};
  if(reduced)land();else setTimeout(land,1650);
 });
})();
// Chapter 1: discover Surveyor 3, operate its soil scoop, and hear what followed.
(function createSurveyorChapter(){
 const root=document.documentElement;
 const surface=document.getElementById('chapter-surface');
 const speaker=document.getElementById('chapter-speaker');
 const line=document.getElementById('chapter-line');
 const character=document.getElementById('chapter-character');
 const continueButton=document.getElementById('chapter-continue');
 const pokeButton=document.getElementById('poke-button');
 const chapter2Button=document.getElementById('chapter2-button');
 const chapter2Surface=document.getElementById('chapter2-surface');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const beats=[
  {speaker:'MIRA',side:'mira',image:'mira-when.webp',alt:'Mira curiously asking about the little robot',text:'Ooh, what is that little 3-legged robot, Dr. Vance?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-date.webp',alt:'Dr. Vance pointing out Surveyor 3',text:"That's Surveyor 3!"},
  {speaker:'DR. VANCE',side:'vance',image:'vance-robot.webp',alt:'Dr. Vance describing the robot with her hands',text:'NASA sent it here to poke the Moon dirt before astronauts came.'},
  {speaker:'MIRA',side:'mira',image:'mira.webp',alt:'Mira wondering why Surveyor 3 tested the soil',text:'But why did it poke the dirt?'},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-explain.webp',alt:'Dr. Vance explaining the lunar soil',text:"To make sure astronauts wouldn't sink in the Moon's soft dust."},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-ready.webp',alt:'Dr. Vance encouraging the soil test',text:'Tap the button below to try it.'},
  {speaker:'MIRA',side:'mira',image:'mira-more.webp',alt:'Mira celebrating the firm lunar ground',text:'Yay! Now the astronauts can land!!'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-date.webp',alt:'Dr. Vance recalling Apollo 11',text:'Yep! Two years later, Apollo 11 landed safely.'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-mirrors.webp',alt:'Dr. Vance telling Mira about Apollo 12 visiting Surveyor 3',text:'And later, Apollo 12 astronauts even walked over to say hi to this quiet little robot!'},
  {speaker:'MIRA',side:'mira',image:'mira-when.webp',alt:'Mira wondering how astronauts traveled across the Moon',text:'Wait, once astronauts landed on the Moon, did they walk everywhere, or did they bring a car?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-zoom.webp',alt:'Dr. Vance inviting Mira to see the Moon buggy',text:"They brought a Moon buggy! Let's go see where they parked it."}
 ];
 let index=-1,ready=false,started=false;
 function setReady(value){ready=value;root.classList.toggle('chapter-continue-ready',value);}
 function typeBeat(text,done){
  line.textContent='';if(reduced){line.textContent=text;done();return;}
  const words=text.split(' ');let word=0;
  setTimeout(function nextWord(){line.textContent+=(word?' ':'')+words[word++];if(word<words.length)setTimeout(nextWord,62);else done();},320);
 }
 function showBeat(next){
  setReady(false);root.classList.remove('chapter-poke-ready','chapter2-ready','chapter-speaker-mira','chapter-speaker-vance');
  const beat=beats[next];index=next;speaker.textContent=beat.speaker;swapStoryPose(character,beat.image,beat.alt);
  root.classList.add('chapter-story-active','chapter-speaker-'+beat.side);
  typeBeat(beat.text,()=>{if(index===5)root.classList.add('chapter-poke-ready');else if(index<beats.length-1)setReady(true);else root.classList.add('chapter2-ready');});
 }
 function advance(){if(ready&&root.classList.contains('chapter-story-active'))showBeat(index+1);}
 root.addEventListener('chapter-arrived',()=>{if(started)return;started=true;setTimeout(()=>showBeat(0),reduced?200:1150);});
 surface.addEventListener('click',advance);
 document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&ready&&root.classList.contains('chapter-story-active')){event.preventDefault();advance();}});
 continueButton.addEventListener('click',event=>{event.stopPropagation();advance();});
 pokeButton.addEventListener('click',event=>{
  event.stopPropagation();if(!root.classList.contains('chapter-poke-ready'))return;
  root.classList.remove('chapter-poke-ready');root.classList.add('scoop-digging');pokeButton.disabled=true;
  if(!reduced)setTimeout(()=>{root.classList.add('soil-impact');setTimeout(()=>root.classList.remove('soil-impact'),390);},600);
  setTimeout(()=>root.classList.add('scoop-safe'),reduced?100:1050);
  setTimeout(()=>showBeat(6),reduced?800:2600);
 });
 chapter2Button.addEventListener('click',event=>{
  event.stopPropagation();if(!root.classList.contains('chapter2-ready'))return;
  root.classList.remove('chapter2-ready');root.classList.add('chapter2-travel');chapter2Button.disabled=true;
  setTimeout(()=>{root.classList.add('chapter2-landed');chapter2Surface.focus({preventScroll:true});root.dispatchEvent(new CustomEvent('chapter2-arrived'));},reduced?0:650);
 });
})();
// Chapter 2: let visitors compare the rover under Earth and Moon gravity.
(function createMoonBuggyChapter(){
 const root=document.documentElement;
 const surface=document.getElementById('chapter2-surface');
 const speaker=document.getElementById('chapter2-speaker');
 const line=document.getElementById('chapter2-line');
 const character=document.getElementById('chapter2-character');
 const continueButton=document.getElementById('chapter2-continue');
 const earthButton=document.getElementById('gravity-earth-button');
 const moonButton=document.getElementById('gravity-moon-button');
 const quakeButton=document.getElementById('chapter2-quake-button');
 const marsButton=document.getElementById('chapter2-mars-button');
 const marsSurface=document.getElementById('mars-surface');
 const result=document.getElementById('chapter2-gravity-result');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const beats=[
  {speaker:'MIRA',side:'mira',image:'mira-amazed.webp',alt:'Mira amazed by the Moon buggy',text:'Whoa, a real Moon car! Why did astronauts leave it here?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-robot.webp',alt:'Dr. Vance describing the light Moon buggy',text:'It was built super light just for the Moon!'},
  {speaker:'MIRA',side:'mira',image:'mira-when.webp',alt:'Mira wondering why the buggy stayed on the Moon',text:"But why couldn't they take it back to Earth?"},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-explain.webp',alt:'Dr. Vance explaining the rover and Earth gravity',text:"On Earth, it's too weak to even hold two astronauts."},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-ready.webp',alt:'Dr. Vance inviting a gravity test',text:'Try switching gravity!'},
  {speaker:'MIRA',side:'mira',image:'mira-when.webp',alt:'Mira noticing the distance travelled',text:'Wait! It says 27.9 km across the Moon? Dr. Vance?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-date.webp',alt:'Dr. Vance explaining the distance',text:'Yep! This little buggy travelled almost 28 kilometres on the Moon!'},
  {speaker:'MIRA',side:'mira',image:'mira-more.webp',alt:'Mira pointing toward the science box',text:"Whoa! What's that little white box next to it?"},
  {speaker:'DR. VANCE',side:'vance',image:'vance-robot.webp',alt:'Dr. Vance introducing the Moonquake Detector',text:"Oh, that's a Moonquake Detector!"},
  {speaker:'MIRA',side:'mira',image:'mira-amazed.webp',alt:'Mira curious about the Moonquake Detector',text:"A Moonquake Detector? What's it for?"},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-explain.webp',alt:'Dr. Vance explaining the detector',text:'It listens for shaking on the Moon!'},
  {speaker:'MIRA',side:'mira',image:'mira.webp',alt:'Mira surprised that the Moon shakes',text:'Wait... the Moon shakes too?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-mirrors.webp',alt:'Dr. Vance sharing a surprising detail',text:"It does! And here's the cool part."},
  {speaker:'DR. VANCE',side:'vance',image:'vance-date.webp',alt:'Dr. Vance describing years of moonquake listening',text:'Even after the astronauts went home, this little box stayed behind for 8 whole years, listening for moonquakes!'},
  {speaker:'MIRA',side:'mira',image:'mira-when.webp',alt:'Mira wondering how the detector works',text:'No way! But how can a little box hear the Moon shake?'},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-ready.webp',alt:'Dr. Vance inviting a Moonquake test',text:"There's only one way to find out. Tap the Moonquake button below!"},
  {speaker:'MIRA',side:'mira',image:'mira-amazed.webp',alt:'Mira amazed by the moonquake',text:"Whoa! The Moon actually shakes! That's amazing!"},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-ready.webp',alt:'Dr. Vance agreeing with Mira',text:'It is!'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-zoom.webp',alt:'Dr. Vance introducing another world to explore',text:"But Mira, the Moon isn't the only place we've sent robots to explore."},
  {speaker:'MIRA',side:'mira',image:'mira-when.webp',alt:'Mira wondering about robots on other planets',text:'Wait, there are robots on other planets too?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-mirrors.webp',alt:'Dr. Vance describing robots on Mars',text:"YES, we've even sent robots all the way to Mars too!"},
  {speaker:'MIRA',side:'mira',image:'mira-amazed.webp',alt:'Mira excited about Mars',text:'MARS?! What are they doing there?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-robot.webp',alt:'Dr. Vance explaining Mars exploration',text:'Exploring! And guess what?'},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-explain.webp',alt:'Dr. Vance explaining that humans have not walked on Mars',text:'No human has ever walked on Mars!'},
  {speaker:'MIRA',side:'mira',image:'mira-more.webp',alt:'Mira asking to see the robots on Mars',text:'Seriously?! Then I wanna see those robots!'}
 ];
 let index=-1,ready=false,started=false,quakeTimeout;
 function setReady(value){ready=value;root.classList.toggle('chapter2-continue-ready',value);}
 function typeBeat(text,done){
  line.textContent='';if(reduced){line.textContent=text;done();return;}
  const words=text.split(' ');let word=0;
  setTimeout(function nextWord(){line.textContent+=(word?' ':'')+words[word++];if(word<words.length)setTimeout(nextWord,62);else done();},320);
 }
 function showBeat(next){
  setReady(false);root.classList.remove('chapter2-test-ready','chapter2-quake-ready','chapter2-mars-ready','chapter2-speaker-mira','chapter2-speaker-vance');
  const beat=beats[next];index=next;speaker.textContent=beat.speaker;swapStoryPose(character,beat.image,beat.alt);
  root.classList.add('chapter2-story-active','chapter2-speaker-'+beat.side);
  typeBeat(beat.text,()=>{if(index===4)root.classList.add('chapter2-test-ready');else if(index===15)root.classList.add('chapter2-quake-ready');else if(index===beats.length-1)root.classList.add('chapter2-mars-ready');else setReady(true);});
 }
 function advance(){if(ready&&root.classList.contains('chapter2-story-active'))showBeat(index+1);}
 root.addEventListener('chapter2-arrived',()=>{if(started)return;started=true;setTimeout(()=>showBeat(0),reduced?200:1750);});
 surface.addEventListener('click',advance);
 document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&ready&&root.classList.contains('chapter2-story-active')&&event.target.tagName!=='BUTTON'){event.preventDefault();advance();}});
 continueButton.addEventListener('click',event=>{event.stopPropagation();advance();});
 earthButton.addEventListener('click',event=>{
  event.stopPropagation();if(!root.classList.contains('chapter2-test-ready'))return;
  root.classList.remove('chapter2-test-ready');root.classList.add('chapter2-earth');result.textContent='TOO HEAVY FOR EARTH!';
  setTimeout(()=>root.classList.add('chapter2-moon-ready'),reduced?0:580);
 });
 moonButton.addEventListener('click',event=>{
  event.stopPropagation();if(!root.classList.contains('chapter2-moon-ready'))return;
  root.classList.remove('chapter2-moon-ready','chapter2-earth');root.classList.add('chapter2-moon');result.textContent='27.9 km across the Moon!';
  setTimeout(()=>{root.classList.add('chapter2-epilogue');showBeat(5);},reduced?250:1450);
 });
 quakeButton.addEventListener('click',event=>{
  event.stopPropagation();if(!root.classList.contains('chapter2-quake-ready'))return;
  root.classList.remove('chapter2-quaking');void surface.offsetWidth;root.classList.add('chapter2-quaking');
  quakeButton.innerHTML='REPLAY MOONQUAKE <span aria-hidden="true">↺</span>';
  clearTimeout(quakeTimeout);
  quakeTimeout=setTimeout(()=>{root.classList.remove('chapter2-quaking');root.classList.add('chapter2-afterquake');showBeat(16);},reduced?350:2400);
 });
 marsButton.addEventListener('click',event=>{
  event.stopPropagation();if(!root.classList.contains('chapter2-mars-ready')||root.classList.contains('mars-flight-active'))return;
  root.classList.remove('chapter2-mars-ready');root.classList.add('mars-flight-active');marsButton.disabled=true;
  const land=()=>{root.classList.add('mars-landed');marsSurface.focus({preventScroll:true});root.dispatchEvent(new CustomEvent('mars-arrived'));};
  if(reduced){root.classList.add('mars-arriving');land();}
  else{setTimeout(()=>root.classList.add('mars-arriving'),3900);setTimeout(land,5400);}
 });
})();
// Chapter 3: Spirit's dusty solar panels and a simulated wind cleaning event.
(function createSpiritChapter(){
 const root=document.documentElement;
 const surface=document.getElementById('mars-surface');
 const speaker=document.getElementById('mars-speaker');
 const line=document.getElementById('mars-line');
 const character=document.getElementById('mars-character');
 const continueButton=document.getElementById('mars-continue');
 const blowButton=document.getElementById('mars-blow-button');
 const batteryValue=document.getElementById('mars-battery-value');
 const batteryFill=document.getElementById('mars-battery-fill');
 const batteryCard=surface.querySelector('.mars-battery');
 const rover=surface.querySelector('.spirit-rover');
 const wheelCanvas=document.getElementById('spirit-wheels');
 const wheelContext=wheelCanvas.getContext('2d');
 const cleanRover=rover.querySelector('.spirit-clean');
 const stuckTag=rover.querySelector('.spirit-stuck-tag');
 const trail=surface.querySelector('.mars-wheel-trail');
 const silica=surface.querySelector('.mars-silica');
 const forwardButton=document.getElementById('mars-drive-forward');
 const backwardButton=document.getElementById('mars-drive-backward');
 const chapter4Button=document.getElementById('mars-chapter4-button');
 const chargePointer=document.getElementById('mars-charge-pointer');
 const chargePointerPath=document.getElementById('mars-charge-pointer-path');
 const chargePointerDot=document.getElementById('mars-charge-pointer-dot');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const beats=[
  {speaker:'MIRA',side:'mira',image:'mira-amazed.webp',alt:'Mira discovering Spirit on Mars',text:'Whoa! What is that?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-robot.webp',alt:'Dr. Vance introducing Spirit',text:"That's Spirit! It's a robot that explores Mars."},
  {speaker:'MIRA',side:'mira',image:'mira-when.webp',alt:'Mira wondering why Spirit is dusty',text:'But why is it so dusty?'},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-explain.webp',alt:'Dr. Vance explaining solar power and dust',text:'It gets power from sunlight. But dust covers its big panels!'},
  {speaker:'MIRA',side:'mira',image:'mira.webp',alt:'Mira worried about Spirit losing power',text:'Oh no! How will it get power if it is covered in dust?'},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-ready.webp',alt:'Dr. Vance inviting a wind test',text:"Let's see what happens when the wind blows!"},
  {speaker:'MIRA',side:'mira',image:'mira-amazed.webp',alt:'Mira noticing the clean solar panels',text:'Whoa! The panels are clean!'},
  {speaker:'MIRA',side:'mira',image:'mira-when.webp',alt:'Mira asking about solar charge',text:"Wait, Dr. Vance! What's solar charge?"},
  {speaker:'DR. VANCE',side:'vance',image:'vance-mirrors.webp',alt:'Dr. Vance explaining solar charge',text:"It's how much power Spirit gets from the Sun!"},
  {speaker:'MIRA',side:'mira',image:'mira-charge-point.webp',alt:'Mira pointing at the 93 percent solar charge below Spirit',text:'Ohhh! But why did the solar charge go up?'},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-explain.webp',alt:'Dr. Vance explaining the wind',text:'Because the wind blew the dust away!'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-mirrors.webp',alt:'Dr. Vance explaining how sunlight reaches the panels',text:'So that more sunlight can reach the panels!'},
  {speaker:'MIRA',side:'mira',image:'mira-when.webp',alt:'Mira connecting sunlight and power',text:'So more sunlight means more power?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-mirrors.webp',alt:'Dr. Vance explaining sunlight and power',text:'Exactly! More sunlight helps Spirit make more power.'},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-explain.webp',alt:'Dr. Vance explaining recurring dust',text:"Every day, dust kept covering Spirit's big panels."},
  {speaker:'DR. VANCE',side:'vance',image:'vance-mirrors.webp',alt:'Dr. Vance explaining the wind cleaning Spirit’s panels',text:'But the wind kept blowing the dust away, so sunlight could reach them again!'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-date.webp',alt:'Dr. Vance explaining Spirit’s long mission',text:"That's how Spirit worked for over six years instead of just 90 days!"},
  {speaker:'MIRA',side:'mira',image:'mira-more.webp',alt:'Mira wondering if Spirit can still move',text:'Wait—if it has power now, can we drive it?'},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-ready.webp',alt:'Dr. Vance inviting Mira to drive Spirit',text:'Yes! Tap DRIVE FORWARD to roll Spirit!',action:'forward'},
  {speaker:'MIRA',side:'mira',image:'mira-when.webp',alt:'Mira noticing Spirit’s stuck wheel',text:"Hey! Why isn't that front wheel spinning?"},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-explain.webp',alt:'Dr. Vance explaining Spirit’s broken wheel motor',text:"The motor in that wheel broke. It's completely stuck!"},
  {speaker:'MIRA',side:'mira',image:'mira-amazed.webp',alt:'Mira worried Spirit cannot move',text:'Oh no! Does that mean Spirit is trapped forever?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-robot.webp',alt:'Dr. Vance explaining the backward drive',text:'Nope! NASA drove it backward instead.'},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-ready.webp',alt:'Dr. Vance inviting Mira to drive backward',text:'Tap DRIVE BACKWARD to see!',action:'backward'},
  {speaker:'MIRA',side:'mira',image:'mira-amazed.webp',alt:'Mira discovering bright white soil',text:'Whoa! Look at that bright white sand!'},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-explain.webp',alt:'Dr. Vance explaining the pale soil',text:'That white stuff only forms in hot water.'},
  {speaker:'MIRA',side:'mira',image:'mira-when.webp',alt:'Mira amazed by the discovery',text:'Wait! WHAT?!'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-mirrors.webp',alt:'Dr. Vance confirming the discovery',text:"Yes, it's true."},
  {speaker:'DR. VANCE',side:'vance',image:'vance-date.webp',alt:'Dr. Vance describing what Spirit found',text:'Spirit just proved Mars used to have hot springs!'},
  {speaker:'MIRA',side:'mira',image:'mira-when.webp',alt:'Mira asking about ice on Mars',text:'Wait—if Mars had hot water before, is there any frozen ice hiding on Mars right now?'},
  {speaker:'DR. VANCE',side:'vance',image:'dr-vance-ready.webp',alt:'Dr. Vance inviting a journey to the Martian north pole',text:"Let's fly to Mars' icy north pole and dig to find out!",action:'chapter4'}
 ];
 let index=-1,ready=false,started=false;
 function updateChargePointer(){
  if(!root.classList.contains('mars-charge-question'))return;
  const scene=surface.getBoundingClientRect(),mira=character.getBoundingClientRect(),charge=batteryCard.getBoundingClientRect();
  const x1=mira.left-scene.left+mira.width*.84,y1=mira.top-scene.top+mira.height*.53;
  const x2=charge.left-scene.left+10,y2=charge.top-scene.top+charge.height*.52;
  chargePointer.setAttribute('viewBox',`0 0 ${scene.width} ${scene.height}`);
  chargePointerPath.setAttribute('d',`M ${x1} ${y1} Q ${(x1+x2)/2} ${Math.min(y1,y2)-24} ${x2} ${y2}`);
  chargePointerDot.setAttribute('cx',x2);chargePointerDot.setAttribute('cy',y2);
 }
 const wheels=[
  {x:285,y:913,rx:78,ry:95,stuck:true},
  {x:562,y:895,rx:64,ry:79},
  {x:687,y:887,rx:59,ry:82},
  {x:943,y:899,rx:86,ry:99},
  {x:1113,y:878,rx:62,ry:81},
  {x:1233,y:867,rx:59,ry:78}
 ];
 function drawWheels(angle){
  if(!wheelContext||!cleanRover.complete||!cleanRover.naturalWidth)return;
  wheelContext.clearRect(0,0,1536,1024);
  for(const wheel of wheels){
   const {x,y,rx,ry}=wheel;
   wheelContext.save();wheelContext.beginPath();wheelContext.ellipse(x,y,rx,ry,0,0,Math.PI*2);wheelContext.clip();
   wheelContext.translate(x,y);wheelContext.rotate(wheel.stuck?0:angle);
   wheelContext.drawImage(cleanRover,x-rx,y-ry,rx*2,ry*2,-rx,-ry,rx*2,ry*2);
   wheelContext.restore();
  }
 }
 function positionSoil(){
  const scene=surface.getBoundingClientRect(),body=rover.getBoundingClientRect();
  const x=body.left-scene.left+body.width*(285/1536),y=body.top-scene.top+body.height*(982/1024);
  silica.style.left=(x+18)+'px';silica.style.top=(y-4)+'px';
  trail.style.left=(x-22)+'px';trail.style.top=(y+4)+'px';
 }
 window.addEventListener('resize',()=>{updateChargePointer();if(root.classList.contains('mars-backward-complete'))positionSoil();});
 character.addEventListener('load',updateChargePointer);
 function setReady(value){ready=value;root.classList.toggle('mars-continue-ready',value);}
 function typeBeat(text,done){
  line.textContent='';if(reduced){line.textContent=text;done();return;}
  const words=text.split(' ');let word=0;
  setTimeout(function nextWord(){line.textContent+=(word?' ':'')+words[word++];if(word<words.length)setTimeout(nextWord,62);else done();},320);
 }
 function showBeat(next){
  setReady(false);root.classList.remove('mars-blow-ready','mars-forward-ready','mars-backward-ready','mars-chapter4-ready','mars-charge-question','mars-speaker-mira','mars-speaker-vance');
  const beat=beats[next];index=next;speaker.textContent=beat.speaker;swapStoryPose(character,beat.image,beat.alt);
  if(index===9){root.classList.add('mars-charge-question');requestAnimationFrame(updateChargePointer);}
  root.classList.add('mars-story-active','mars-speaker-'+beat.side);
  typeBeat(beat.text,()=>{if(index===5)root.classList.add('mars-blow-ready');else if(beat.action)root.classList.add('mars-'+beat.action+'-ready');else if(index<beats.length-1)setReady(true);});
 }
 function advance(){if(ready&&root.classList.contains('mars-story-active'))showBeat(index+1);}
 root.addEventListener('mars-arrived',()=>{if(started)return;started=true;setTimeout(()=>showBeat(0),reduced?200:600);});
 surface.addEventListener('click',advance);
 document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&ready&&root.classList.contains('mars-story-active')&&event.target.tagName!=='BUTTON'){event.preventDefault();advance();}});
 continueButton.addEventListener('click',event=>{event.stopPropagation();advance();});
 blowButton.addEventListener('click',event=>{
  event.stopPropagation();if(!root.classList.contains('mars-blow-ready'))return;
  root.classList.remove('mars-blow-ready');root.classList.add('mars-wind-active');blowButton.disabled=true;
  if(reduced){batteryValue.textContent='93%';batteryFill.style.width='93%';}
  else{
   const start=performance.now(),duration=1800;
   function charge(now){const progress=Math.min((now-start)/duration,1),value=Math.round(60+33*progress);batteryValue.textContent=value+'%';batteryFill.style.width=value+'%';if(progress<1)requestAnimationFrame(charge);}
   requestAnimationFrame(charge);
  }
  setTimeout(()=>{root.classList.add('mars-panels-clean');showBeat(6);},reduced?700:2400);
 });
 function drive(direction){
  if(!root.classList.contains('mars-'+direction+'-ready'))return;
  if(direction==='backward')positionSoil();
  root.classList.remove('mars-forward-ready','mars-backward-ready');
  root.classList.add('mars-rover-moving','mars-driving-'+direction);
  if(direction==='backward')root.classList.remove('mars-forward-complete');
  if(direction==='forward')stuckTag.setAttribute('aria-label','Front wheel stuck');
  const duration=reduced?350:1900,start=performance.now();
  function frame(now){
   const progress=Math.min((now-start)/duration,1);
   drawWheels(progress*(direction==='forward'?-1:1)*Math.PI*5);
   if(progress<1)requestAnimationFrame(frame);
   else{
    root.classList.remove('mars-driving-'+direction);
    root.classList.add('mars-'+direction+'-complete');
    wheelContext?.clearRect(0,0,1536,1024);
    if(direction==='backward')positionSoil();
    setTimeout(()=>{showBeat(direction==='forward'?19:24);root.classList.remove('mars-rover-moving');},reduced?100:450);
   }
  }
  requestAnimationFrame(frame);
 }
 forwardButton.addEventListener('click',event=>{event.stopPropagation();drive('forward');});
 backwardButton.addEventListener('click',event=>{event.stopPropagation();drive('backward');});
 chapter4Button.addEventListener('click',event=>{
  event.stopPropagation();if(!root.classList.contains('mars-chapter4-ready'))return;
  root.classList.remove('mars-chapter4-ready');root.classList.add('chapter4-entering');chapter4Button.disabled=true;
  const arrive=()=>{root.classList.add('chapter4-landed');document.getElementById('phoenix-surface').focus({preventScroll:true});root.dispatchEvent(new CustomEvent('phoenix-arrived'));};
  if(reduced)arrive();else setTimeout(arrive,2050);
 });
})();
// Chapter 4: Phoenix exposes buried ice, then four simulated days show it sublimating.
(function createPhoenixChapter(){
 const root=document.documentElement;
 const surface=document.getElementById('phoenix-surface');
 const speaker=document.getElementById('phoenix-speaker');
 const line=document.getElementById('phoenix-line');
 const character=document.getElementById('phoenix-character');
 const continueButton=document.getElementById('phoenix-continue');
 const digButton=document.getElementById('phoenix-dig-button');
 const waitButton=document.getElementById('phoenix-wait-button');
 const journeyButton=document.getElementById('phoenix-journey-button');
 const summary=document.getElementById('journey-summary');
 const replayButton=document.getElementById('journey-replay');
 const dayValue=document.getElementById('phoenix-day-value');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const beats=[
  {speaker:'MIRA',side:'mira',image:'mira-winter.webp',alt:'Mira in a blue winter coat, scarf, and mittens',text:'Brrr! It looks freezing here! Wait—what is this 3-legged robot?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-winter.webp',alt:'Dr. Vance in a warm white coat and teal scarf',text:"That's Phoenix! NASA sent it to Mars' icy north pole in 2008."},
  {speaker:'MIRA',side:'mira',image:'mira-winter.webp',alt:'Mira searching for ice on Mars',text:'Cool! So where is all the ice?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-winter.webp',alt:'Dr. Vance explaining the ice is underground',text:'Hiding right under the dirt!'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-winter.webp',alt:'Dr. Vance inviting Mira to dig for ice',text:'Tap DIG FOR ICE to scoop the ground.',action:'dig'},
  {speaker:'MIRA',side:'mira',image:'mira-winter.webp',alt:'Mira noticing bright white chunks in the trench',text:'Whoa, white chunks! Is that salt or real ice?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-winter.webp',alt:'Dr. Vance asking Mira to wait four days',text:"Let's check in 4 days! Tap WAIT 4 DAYS.",action:'wait'},
  {speaker:'MIRA',side:'mira',image:'mira-winter.webp',alt:'Mira surprised that the white chunks vanished',text:'Hey! Where did the white chunks go?!'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-winter.webp',alt:'Dr. Vance explaining how exposed ice vanished',text:'They turned straight into invisible gas in the thin Mars air—only real water ice does that!'},
  {speaker:'MIRA',side:'mira',image:'mira-winter.webp',alt:'Mira amazed by Phoenix finding water ice',text:'WHOA! So Phoenix really found real water ice on Mars!'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-winter.webp',alt:'Dr. Vance describing the arrival of winter',text:"Yes! And when Mars' freezing winter came, Phoenix went quiet too."},
  {speaker:'MIRA',side:'mira',image:'mira-winter.webp',alt:'Mira remembering the silent machines',text:'Wait... so the Moon mirror, Surveyor 3, the Moon buggy, Spirit, and Phoenix are all just sitting out there in the dark?'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-winter.webp',alt:'Dr. Vance reassuring Mira',text:'Quiet, yes—but never forgotten.'},
  {speaker:'DR. VANCE',side:'vance',image:'vance-winter.webp',alt:'Dr. Vance connecting every mission',text:'Every single one passed the baton so we could go farther.',action:'journey'}
 ];
 let index=-1,ready=false,started=false;
 function setReady(value){ready=value;root.classList.toggle('phoenix-continue-ready',value);}
 function typeBeat(text,done){
  line.textContent='';if(reduced){line.textContent=text;done();return;}
  const words=text.split(' ');let word=0;
  setTimeout(function nextWord(){line.textContent+=(word?' ':'')+words[word++];if(word<words.length)setTimeout(nextWord,62);else done();},320);
 }
 function showBeat(next){
  setReady(false);root.classList.remove('phoenix-dig-ready','phoenix-wait-ready','phoenix-journey-ready','phoenix-speaker-mira','phoenix-speaker-vance');
  const beat=beats[next];index=next;speaker.textContent=beat.speaker;swapStoryPose(character,beat.image,beat.alt);
  root.classList.add('phoenix-story-active','phoenix-speaker-'+beat.side);
  typeBeat(beat.text,()=>{if(beat.action)root.classList.add('phoenix-'+beat.action+'-ready');else if(index<beats.length-1)setReady(true);});
 }
 function advance(){if(ready&&root.classList.contains('phoenix-story-active'))showBeat(index+1);}
 root.addEventListener('phoenix-arrived',()=>{if(started)return;started=true;setTimeout(()=>showBeat(0),reduced?150:450);});
 surface.addEventListener('click',advance);
 document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&ready&&root.classList.contains('phoenix-story-active')&&event.target.tagName!=='BUTTON'){event.preventDefault();advance();}});
 continueButton.addEventListener('click',event=>{event.stopPropagation();advance();});
 digButton.addEventListener('click',event=>{
  event.stopPropagation();if(!root.classList.contains('phoenix-dig-ready'))return;
  root.classList.remove('phoenix-dig-ready');root.classList.add('phoenix-action-running','phoenix-digging');digButton.disabled=true;
  setTimeout(()=>{root.classList.remove('phoenix-action-running','phoenix-digging');root.classList.add('phoenix-dug');showBeat(5);},reduced?300:2300);
 });
 waitButton.addEventListener('click',event=>{
  event.stopPropagation();if(!root.classList.contains('phoenix-wait-ready'))return;
  root.classList.remove('phoenix-wait-ready','phoenix-dug');root.classList.add('phoenix-action-running','phoenix-waiting');waitButton.disabled=true;
  dayValue.textContent='DAY 0';
  const step=reduced?170:760;
  for(let day=1;day<=4;day++)setTimeout(()=>{dayValue.textContent='DAY '+day;},step*day);
  setTimeout(()=>{root.classList.remove('phoenix-action-running','phoenix-waiting');root.classList.add('phoenix-waited');showBeat(7);},step*4+(reduced?100:260));
 });
 journeyButton.addEventListener('click',event=>{
  event.stopPropagation();if(!root.classList.contains('phoenix-journey-ready'))return;
  root.classList.remove('phoenix-journey-ready');root.classList.add('journey-open');
  summary.setAttribute('aria-hidden','false');document.getElementById('journey-title').focus({preventScroll:true});
 });
 replayButton.addEventListener('click',()=>setTimeout(()=>window.location.reload(),400));
})();
// Render a true spherical Moon with a slowly rotating surface and fixed light.
(async function createMoon(){
 const canvas=document.getElementById('moon-globe');
 const host=document.getElementById('moon');
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
 if(!gl)return;
 const vertex='attribute vec2 position; varying vec2 v; void main(){v=position;gl_Position=vec4(position,0.,1.);}';
 const fragment=`precision highp float;
 varying vec2 v;uniform sampler2D moonMap;uniform float rotation;
 void main(){
  float r2=dot(v,v);if(r2>1.){gl_FragColor=vec4(0.);return;}
  vec3 n=vec3(v.x,v.y,sqrt(max(0.,1.-r2)));
  vec2 uv=vec2(atan(n.x,n.z)/6.2831853+.5+rotation,asin(n.y)/3.14159265+.5);
  vec3 surface=texture2D(moonMap,uv).rgb;
  vec3 light=normalize(vec3(-.52,.64,.82));
  float diffuse=max(dot(n,light),0.);
  float earthshine=.11+max(dot(n,vec3(.35,-.25,.9)),0.)*.07;
  float rim=pow(1.-n.z,4.);
  vec3 color=surface*(earthshine+diffuse*.98);
  color+=vec3(.46,.58,.76)*rim*.12;
  color=pow(color,vec3(.9));
  gl_FragColor=vec4(color,1.);
 }`;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Moon shader failed');return s;}
 try{
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{gl.activeTexture(gl.TEXTURE0);const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,'moonMap'),0);resolve();};image.onerror=reject;image.src='assets/moon-surface.jpg';});
  const rotation=gl.getUniformLocation(program,'rotation');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let turn=.02,last=0,frame=0;
  function draw(){const size=Math.min(512,Math.ceil(host.clientWidth*Math.min(devicePixelRatio||1,2)));if(canvas.width!==size||canvas.height!==size){canvas.width=size;canvas.height=size;gl.viewport(0,0,size,size);}gl.uniform1f(rotation,turn);gl.drawArrays(gl.TRIANGLES,0,6);}
  function tick(now){frame=0;if(last)turn=(turn+Math.min((now-last)/1000,.1)/36)%1;last=now;draw();if(!document.hidden&&!motion.matches)frame=requestAnimationFrame(tick);}
  function sync(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;draw();if(!document.hidden&&!motion.matches)frame=requestAnimationFrame(tick);}
  new ResizeObserver(draw).observe(host);document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(frame)cancelAnimationFrame(frame);host.classList.remove('globe-ready');});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
  draw();host.classList.add('globe-ready');sync();
 }catch(error){console.warn('Moon rendering unavailable; using image fallback.');}
})();
