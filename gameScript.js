/* ── 스프라이트 ── */
const spriteImg = new Image();
let spriteReady = false;
spriteImg.onload = () => { spriteReady = true; };
spriteImg.src = "./images/록금이_뛰는_이미지.png"
const FRAME_W = 768, FRAME_H = 1024, FRAMES = 2;
const DRAW_W  = 72,  DRAW_H  = Math.round(72 * 614 / 356);

/* ── 기본 설정 ── */
const W=560, H=360, FOV=300, SEGS=16, SEG_DEPTH=3;
const WALL_W=1.4, WALL_H=1.2;
const LANE_X=[-0.85, 0, 0.85];
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');

/* ── 게임 상태 ── */
let state='ready', score=0, speed=0.055, camZ=0;
const camY=-0.3;
const ch={ lane:1, x:0, targetX:0, y:0, vy:0, onGround:true,
           moving:false, dead:false, frame:0, tick:0 };
let obstacles=[], nextZ=0;

function spawnObs(){
  const cnt=Math.random()<0.4?2:1;
  const lanes=[0,1,2].sort(()=>Math.random()-0.5);
  for(let i=0;i<cnt;i++)
    obstacles.push({lane:lanes[i], worldZ:nextZ, type:Math.random()<0.5?'block':'hole'});
  nextZ += 18+Math.random()*12;
}

const STARS=Array.from({length:55},()=>({x:Math.random()*W, y:Math.random()*(H*.48), r:Math.random()*1.1+0.3}));
const keys={};

document.addEventListener('keydown', e=>{
  if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  if(keys[e.key]) return;
  keys[e.key]=true;
  handleKey(e.key);
});
document.addEventListener('keyup', e=>{ keys[e.key]=false; });

function handleKey(k){
  if(state==='ready'||state==='dead'){ startGame(); return; }
  if(state!=='playing') return;
  if(!ch.moving){
    if((k==='ArrowLeft'||k==='a')&&ch.lane>0){ ch.lane--; ch.targetX=LANE_X[ch.lane]; ch.moving=true; }
    if((k==='ArrowRight'||k==='d')&&ch.lane<2){ ch.lane++; ch.targetX=LANE_X[ch.lane]; ch.moving=true; }
  }
  if((k===' '||k==='ArrowUp'||k==='w')&&ch.onGround){ ch.vy=-0.026; ch.onGround=false; }
}

function startGame(){
  state='playing'; score=0; speed=0.055; camZ=0;
  obstacles=[]; nextZ=camZ+25;
  Object.assign(ch,{lane:1,x:LANE_X[1],targetX:LANE_X[1],y:0,vy:0,onGround:true,
                    moving:false,dead:false,frame:0,tick:0});
  for(let i=0;i<5;i++) spawnObs();
  document.getElementById('msg').textContent='';
}

function project(x3d,y3d,z3d){
  const d=Math.max(0.1,z3d-camZ), sc=FOV/d;
  return { sx:(x3d-ch.x*0.05)*sc+W/2, sy:(y3d-camY)*sc+H/2, sc, d };
}

function lerpColor(h1,h2,t){
  const p=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const [r1,g1,b1]=p(h1),[r2,g2,b2]=p(h2);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

function drawCorridor(){
  for(let seg=SEGS-1;seg>=0;seg--){
    const zF=camZ+1+seg*SEG_DEPTH, zN=zF-SEG_DEPTH;
    const fog=Math.min(1,seg/(SEGS*0.88));
    const TLn=project(-WALL_W,-WALL_H,zN), TRn=project(WALL_W,-WALL_H,zN);
    const BLn=project(-WALL_W,WALL_H,zN),  BRn=project(WALL_W,WALL_H,zN);
    const TLf=project(-WALL_W,-WALL_H,zF), TRf=project(WALL_W,-WALL_H,zF);
    const BLf=project(-WALL_W,WALL_H,zF),  BRf=project(WALL_W,WALL_H,zF);
    const poly=(pts,c)=>{ ctx.fillStyle=c; ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p.sx,p.sy):ctx.moveTo(p.sx,p.sy)); ctx.closePath(); ctx.fill(); };
    poly([TLn,TRn,TRf,TLf], lerpColor('#091a30','#163a6a',1-fog));
    poly([BLn,BRn,BRf,BLf], lerpColor('#163060','#265090',1-fog));
    poly([TLn,BLn,BLf,TLf], lerpColor('#081428','#122858',1-fog));
    poly([TRn,BRn,BRf,TRf], lerpColor('#081428','#122858',1-fog));
    ctx.strokeStyle=`rgba(80,140,255,${0.18*(1-fog)})`; ctx.lineWidth=0.8;
    [[TLn,TRn],[BLn,BRn],[TLn,BLn],[TRn,BRn]].forEach(([a,b])=>{ ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.stroke(); });
    ctx.strokeStyle=`rgba(60,120,220,${0.12*(1-fog)})`; ctx.lineWidth=0.6;
    [-0.45,0.45].forEach(lx=>{ const a=project(lx,WALL_H,zN),b=project(lx,WALL_H,zF); ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.stroke(); });
    obstacles.forEach(ob=>{
      const oz=ob.worldZ;
      if(oz<zN||oz>zF) return;
      const lx=LANE_X[ob.lane], hw=0.38, al=Math.max(0,1-fog*1.2);
      if(ob.type==='block'){
        const TL=project(lx-hw,WALL_H-1.1,oz),TR=project(lx+hw,WALL_H-1.1,oz),BL=project(lx-hw,WALL_H,oz),BR=project(lx+hw,WALL_H,oz);
        ctx.fillStyle=`rgba(220,80,40,${al*.9})`; ctx.fillRect(TL.sx,TL.sy,TR.sx-TL.sx,BL.sy-TL.sy);
        ctx.strokeStyle=`rgba(255,140,80,${al})`; ctx.lineWidth=1.5; ctx.strokeRect(TL.sx,TL.sy,TR.sx-TL.sx,BL.sy-TL.sy);
      } else {
        const Hn=project(lx-hw,WALL_H,oz-1.5),Hnn=project(lx+hw,WALL_H,oz-1.5);
        const Hf=project(lx-hw,WALL_H,oz+1.5),Hff=project(lx+hw,WALL_H,oz+1.5);
        ctx.fillStyle=`rgba(0,0,0,${al*.95})`; ctx.beginPath();
        ctx.moveTo(Hn.sx,Hn.sy); ctx.lineTo(Hnn.sx,Hnn.sy); ctx.lineTo(Hff.sx,Hff.sy); ctx.lineTo(Hf.sx,Hf.sy);
        ctx.closePath(); ctx.fill();
      }
    });
  }
}

function drawChar(){
  const cx=W/2+ch.x*95, baseY=H*0.65, cy=baseY+ch.y*200;
  /* 그림자 */
  const sc=1+ch.y*(-0.5);
  ctx.save(); ctx.globalAlpha=0.3*Math.max(0.2,1+ch.y*0.8);
  ctx.fillStyle='#000'; ctx.beginPath();
  ctx.restore();
  if(!spriteReady) return;
  ctx.save();
  if(ch.dead){ ctx.globalAlpha=0.55; ctx.translate(cx,cy+DRAW_H*.5); ctx.rotate(Math.PI/2); ctx.translate(-cx,-(cy+DRAW_H*.5)); }
  ctx.drawImage(spriteImg, ch.frame*FRAME_W,0, FRAME_W,FRAME_H, cx-DRAW_W/2,cy, DRAW_W,DRAW_H);
  ctx.restore();
}

function checkCollision(){
  if(ch.dead) return;
  obstacles.forEach(ob=>{
    const dist=ob.worldZ-camZ;
    if(dist<1.5||dist>5) return;
    if(ob.lane!==ch.lane) return;
    if(ob.type==='block'&&ch.y>-0.2) triggerDeath();
    if(ob.type==='hole'&&ch.onGround) triggerDeath();
  });
}

function triggerDeath(){
  if(ch.dead) return;
  ch.dead=true; state='dead';
  setTimeout(()=>{ document.getElementById('msg').innerHTML=`GAME OVER<br><span style="font-size:14px;color:#fa0">점수: ${score} &nbsp;|&nbsp; 아무 키나 눌러 재시작</span>`; },500);
}

function update(){
  if(state!=='playing') return;
  camZ+=speed; score=Math.floor(camZ*3);
  speed=Math.min(0.16,0.055+score*0.000035);
  document.getElementById('scoreEl').textContent=score;
  ch.x+=(ch.targetX-ch.x)*0.18;
  if(Math.abs(ch.targetX-ch.x)<0.005){ ch.x=ch.targetX; ch.moving=false; }
  if(!ch.onGround){ ch.vy+=0.0018; ch.y+=ch.vy; if(ch.y>=0){ ch.y=0; ch.vy=0; ch.onGround=true; } }
  ch.tick++;
  if(ch.tick>=Math.round(60/8)){ ch.frame=(ch.frame+1)%FRAMES; ch.tick=0; }
  obstacles=obstacles.filter(ob=>ob.worldZ>camZ-2);
  while(nextZ<camZ+SEGS*SEG_DEPTH+10) spawnObs();
  checkCollision();
}

function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#040810'; ctx.fillRect(0,0,W,H/2);
  ctx.fillStyle='#1a3560'; ctx.fillRect(0,H/2,W,H/2);
  ctx.fillStyle='rgba(255,255,255,0.65)';
  STARS.forEach(s=>{ ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); });
  drawCorridor();
  drawChar();
}

(function loop(){ update(); draw(); requestAnimationFrame(loop); })();
document.getElementById('msg').innerHTML='🏃 록금이 RUNNER<br><span style="font-size:13px;color:#fa0">아무 키나 눌러 시작</span>';