/* ── 스프라이트 ── */
const spriteImg = new Image();
let spriteReady = false;
spriteImg.onload = () => { spriteReady = true; };
spriteImg.src = "./images/록금이_뛰는_이미지.png";
const FRAME_W = 768, FRAME_H = 1024, FRAMES = 2;
const DRAW_W  = 72,  DRAW_H  = Math.round(72 * 614 / 356);

/* ── 기본 설정 ── */
const W=560, H=360, FOV=300, SEGS=16, SEG_DEPTH=3;
const WALL_W=1.4, WALL_H=1.2;
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');

/* ── 게임 상태 ── */
let state='ready', score=0, speed=0.055, camZ=0;
const camY=-0.3;
const ch={
  x:0, vx:0,
  y:0, vy:0,
  onGround:true, dead:false,
  frame:0, tick:0
};

/* ── 회전 상태 ── */
let rotY=0, rotTarget=0, isRotating=false;
const ROT_STEP  = Math.PI/2;
const ROT_SPEED = 0.10;

const MOVE_SPEED = 0.028;
const WALL_LIMIT = 0.82;

let obstacles=[], nextZ=0;

/* ── 국민대 퀴즈 원본 데이터베이스 ── */
const QUIZ_LIST = [
  {
    q: "Q. 국민대 종합복지관 1층에 있는 편의점은?",
    answers: ["이마트24", "CU"],
    correct: "이마트24" 
  },
  {
    q: "Q. 캠퍼스 내에 입점해 있는 주거래 은행은?",
    answers: ["우리은행", "신한은행"],
    correct: "우리은행"
  },
  {
    q: "Q. 국민대학교의 마스코트 캐릭터 이름은?",
    answers: ["록금이", "쿠민이"],
    correct: "록금이"
  },
  {
    q: "Q. 복지관 3층에 위치한 식당의 이름은?", 
    answers: ["학생 식당", "기숙사 식당"], // <-- [수정] 1층 교직원 식당과 혼동되지 않게 오답 변경!
    correct: "학생 식당" 
  },
  {
    q: "Q. 국민대 정문 옆에 자리 잡고 있는 커다란 건물은?",
    answers: ["북악관", "본부관"],
    correct: "북악관" 
  }
];

let quizState = 'none';    
let quizTimer = 0;         
let currentQuiz = null;    
let savedSpeed = 0.055;    


function getSideFromAngle(angle) {
  let side = Math.round(angle / ROT_STEP) % 4;
  if (side < 0) side += 4;
  return side;
}

/* ── 장애물 스폰 ── */
function spawnObs(){
  if (state === 'dead') return;

  const cnt = Math.random() < 0.4 ? 2 : 1;
  const offsets = [-0.85, 0, 0.85].sort(() => Math.random() - 0.5);

  for(let i=0; i<cnt; i++){
    const lx = Math.max(-WALL_W+0.4, Math.min(WALL_W-0.4, ch.x + offsets[i]));
    const randomSide = Math.floor(Math.random() * 4);

    obstacles.push({ 
      lx, 
      worldZ: nextZ, 
      type: 'obstacle',
      side: randomSide 
    });
  }
  nextZ += 18 + Math.random() * 12;
}

function spawnPenaltyObstacles() {
  obstacles = []; 
  for(let zIdx = 0; zIdx < 5; zIdx++) {
    let targetZ = camZ + 3 + (zIdx * 4);
    for(let side = 0; side < 4; side++) {
      [-0.85, 0, 0.85].forEach(lx => {
        obstacles.push({ lx, worldZ: targetZ, type: 'obstacle', side });
      });
    }
  }
}

const STARS=Array.from({length:55},()=>({
  x:Math.random()*W, y:Math.random()*(H*.48), r:Math.random()*1.1+0.3
}));
const keys={};

/* ── 키 입력 이벤트 ── */
document.addEventListener('keydown', e=>{
  if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
  if(keys[e.key]) return;
  keys[e.key]=true;

  if(state==='ready'||state==='dead'){ startGame(); return; }

  if(quizState === 'active') {
    if(e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      handleQuizAnswer('up');
    } else if(e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      handleQuizAnswer('down');
    }
    return; 
  }

  if((e.key===' '||e.key==='ArrowUp'||e.key==='w')&&ch.onGround){
    ch.vy=-0.026; ch.onGround=false;
  }
});
document.addEventListener('keyup', e=>{ keys[e.key]=false; });

/* ── 퀴즈 정답 선택 처리 함수 ── */
function handleQuizAnswer(choice) {
  if(!currentQuiz) return;

  if(choice === currentQuiz.correct) {
    quizState = 'none';  
    quizTimer = 0;       
    speed = savedSpeed;  
    currentQuiz = null;
  } else {
    quizState = 'none';
    spawnPenaltyObstacles(); 
    triggerDeath();
  }
}

function startGame(){
  state='playing'; score=0; speed=0.055; camZ=0;
  obstacles=[]; nextZ=camZ+25;
  rotY=0; rotTarget=0; isRotating=false;
  
  quizState = 'none';
  quizTimer = 0;
  currentQuiz = null;

  Object.assign(ch,{x:0,vx:0,y:0,vy:0,onGround:true,dead:false,frame:0,tick:0});
  for(let i=0; i<5; i++) spawnObs();
  document.getElementById('msg').textContent='';
}

/* ── 투영 ── */
function project(x3d, y3d, z3d){
  const d  = Math.max(0.1, z3d - camZ);
  const sc = FOV / d;
  return {
    sx: (x3d - ch.x * 0.05) * sc + W/2,
    sy: (y3d - camY) * sc + H/2,
    sc, d
  };
}

function lerpColor(h1,h2,t){
  const p=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const [r1,g1,b1]=p(h1),[r2,g2,b2]=p(h2);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

function drawCorridor(){
  for(let seg=SEGS-1;seg>=0;seg--){
    const zF = camZ+1+seg*SEG_DEPTH;
    const zN = zF - SEG_DEPTH;
    const fog = Math.min(1, seg/(SEGS*0.88));

    const TLn=project(-WALL_W,-WALL_H,zN), TRn=project( WALL_W,-WALL_H,zN);
    const BLn=project(-WALL_W, WALL_H,zN), BRn=project( WALL_W, WALL_H,zN);
    const TLf=project(-WALL_W,-WALL_H,zF), TRf=project( WALL_W,-WALL_H,zF);
    const BLf=project(-WALL_W, WALL_H,zF), BRf=project( WALL_W, WALL_H,zF);

    const poly=(pts,c)=>{
      ctx.fillStyle=c; ctx.beginPath();
      pts.forEach((p,i)=>i?ctx.lineTo(p.sx,p.sy):ctx.moveTo(p.sx,p.sy));
      ctx.closePath(); ctx.fill();
    };

    poly([TLn,TRn,TRf,TLf], lerpColor('#091a30','#163a6a',1-fog));
    poly([BLn,BRn,BRf,BLf], lerpColor('#163060','#265090',1-fog));
    poly([TLn,BLn,BLf,TLf], lerpColor('#081428','#122858',1-fog));
    poly([TRn,BRn,BRf,TRf], lerpColor('#081428','#122858',1-fog));

    ctx.strokeStyle=`rgba(80,140,255,${0.18*(1-fog)})`; ctx.lineWidth=0.8;
    [[TLn,TRn],[BLn,BRn],[TLn,BLn],[TRn,BRn]].forEach(([a,b])=>{
      ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.stroke();
    });
    ctx.strokeStyle=`rgba(60,120,220,${0.12*(1-fog)})`; ctx.lineWidth=0.6;
    [-0.45,0.45].forEach(lx=>{
      const a=project(lx,WALL_H,zN), b=project(lx,WALL_H,zF);
      ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.stroke(); 
    });

    /* ── 사다리꼴 평면 장애물 렌더링 ── */
    obstacles.forEach(ob=>{
      const oz = ob.worldZ;
      if(oz<zN||oz>zF) return;
      const lx=ob.lx, hw=0.38, al=Math.max(0,1-fog*1.2);

      ctx.save();
      ctx.translate(W/2, H/2);
      ctx.rotate(ob.side * ROT_STEP);
      ctx.translate(-W/2, -H/2);

      const length = 0.8; 
      const zFront = oz;
      const zBack  = oz + length;

      const F_Left  = project(lx - hw, WALL_H, zFront);
      const F_Right = project(lx + hw, WALL_H, zFront);
      const B_Right = project(lx + hw, WALL_H, zBack);
      const B_Left  = project(lx - hw, WALL_H, zBack);

      ctx.fillStyle=`rgba(0,0,0,${al})`;
      ctx.beginPath();
      ctx.moveTo(F_Left.sx, F_Left.sy);   ctx.lineTo(F_Right.sx, F_Right.sy);
      ctx.lineTo(B_Right.sx, B_Right.sy); ctx.lineTo(B_Left.sx, B_Left.sy);
      ctx.closePath(); ctx.fill();

      ctx.strokeStyle=`rgba(255,40,40,${al*0.95})`; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(F_Left.sx, F_Left.sy);   ctx.lineTo(F_Right.sx, F_Right.sy);
      ctx.lineTo(B_Right.sx, B_Right.sy); ctx.lineTo(B_Left.sx, B_Left.sy);
      ctx.closePath(); ctx.stroke();

      ctx.restore();
    });
  }
}

function drawChar(){
  const cx = W/2 + ch.x * 95;
  const cy = H*0.65 + ch.y*200;
  if(!spriteReady) return;
  ctx.save();
  if(ch.dead){
    ctx.globalAlpha=0.55;
    ctx.translate(cx, cy+DRAW_H*.5);
    ctx.rotate(Math.PI/2);
    ctx.translate(-cx, -(cy+DRAW_H*.5));
  }
  ctx.drawImage(spriteImg, ch.frame*FRAME_W,0, FRAME_W,FRAME_H, cx-DRAW_W/2, cy, DRAW_W, DRAW_H);
  ctx.restore();
}

/* ── 퀴즈 UI 그리기 함수 ── */
function drawQuizUI() {
  if(quizState !== 'active' || !currentQuiz) return;

  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#112244";
  ctx.strokeStyle = "#5588ff";
  ctx.lineWidth = 3;
  ctx.fillRect(W/2 - 220, H/2 - 30, 440, 60);
  ctx.strokeRect(W/2 - 220, H/2 - 30, 440, 60);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(currentQuiz.q, W/2, H/2);

  ctx.fillStyle = "rgba(20, 40, 80, 0.9)";
  ctx.strokeStyle = "#00ffcc";
  ctx.lineWidth = 2;
  ctx.fillRect(W/2 - 140, 40, 280, 45);
  ctx.strokeRect(W/2 - 140, 40, 280, 45);

  ctx.fillStyle = "#00ffcc";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("▲ [W 키 / 위 방향키] " + currentQuiz.up, W/2, 62);

  ctx.fillStyle = "rgba(20, 40, 80, 0.9)";
  ctx.strokeStyle = "#ffbb00";
  ctx.lineWidth = 2;
  ctx.fillRect(W/2 - 140, H - 85, 280, 45);
  ctx.strokeRect(W/2 - 140, H - 85, 280, 45);

  ctx.fillStyle = "#ffbb00";
  ctx.fillText("▼ [S 키 / 아래 방향키] " + currentQuiz.down, W/2, H - 62);
}

/* ── 충돌판정 ── */
function checkCollision(){
    if(ch.dead) return;
    if(isRotating) return; 

    const currentPlayerSide = getSideFromAngle(rotTarget);

    obstacles.forEach((ob, idx)=>{
        if(ob.side !== currentPlayerSide) return;

        const dist = ob.worldZ - camZ;
        if(dist < 0.0 || dist > 0.9) return;

        const xDiff = Math.abs(ch.x - ob.lx);
        if(xDiff > 0.45) return;

        if(ch.onGround){
            triggerDeath();
        }
    });
}

function triggerDeath(){
  if(ch.dead) return;
  ch.dead=true; state='dead';
  setTimeout(()=>{
    document.getElementById('msg').innerHTML=
      `GAME OVER<br><span style="font-size:14px;color:#fa0">점수: ${score} &nbsp;|&nbsp; 아무 키나 눌러 재시작</span>`;
  },500);
}

function update(){
  if(state!=='playing') return;

  /* ── 퀴즈 주기적 발생 루프 시스템 ── */
  if(quizState === 'none') {
    quizTimer++;
    if(quizTimer >= 420) {
      quizState = 'active';
      savedSpeed = speed; 
      speed = 0;          
      
      const rawQuiz = QUIZ_LIST[Math.floor(Math.random() * QUIZ_LIST.length)];
      const shuffle = Math.random() < 0.5;
      
      currentQuiz = {
        q: rawQuiz.q,
        up: shuffle ? rawQuiz.answers[0] : rawQuiz.answers[1],
        down: shuffle ? rawQuiz.answers[1] : rawQuiz.answers[0],
        correct: ""
      };
      
      currentQuiz.correct = (currentQuiz.up === rawQuiz.correct) ? "up" : "down";
    }
  }

  /* ── 회전 보간 ── */
  if(isRotating){
    const diff = rotTarget - rotY;
    rotY += diff * ROT_SPEED;
    if(Math.abs(diff) < 0.003){ rotY=rotTarget; isRotating=false; }
  }

  camZ+=speed; score=Math.floor(camZ*3);
  if(quizState !== 'active') {
    speed=Math.min(0.16,0.055+score*0.000035);
  }
  document.getElementById('scoreEl').textContent=score;

  if(quizState !== 'active') {
    /* ── 좌우 이동 ── */
    const moveLeft  = keys['ArrowLeft']  || keys['a'];
    const moveRight = keys['ArrowRight'] || keys['d'];
    if(moveLeft)  ch.vx -= 0.004;
    if(moveRight) ch.vx += 0.004;
    if(!moveLeft&&!moveRight) ch.vx *= 0.78;
    ch.vx = Math.max(-MOVE_SPEED, Math.min(MOVE_SPEED, ch.vx));
    ch.x += ch.vx;

    /* ── 벽 도달 → 90도 회전 ── */
    if(ch.x >= WALL_LIMIT && moveRight && !isRotating){
      ch.x = 0; ch.vx = 0;
      rotTarget += ROT_STEP;
      isRotating = true;
    }
    if(ch.x <= -WALL_LIMIT && moveLeft && !isRotating){
      ch.x = 0; ch.vx = 0;
      rotTarget -= ROT_STEP;
      isRotating = true;
    }

    /* ── 점프 ── */
    if(!ch.onGround){ ch.vy+=0.0018; ch.y+=ch.vy; if(ch.y>=0){ ch.y=0; ch.vy=0; ch.onGround=true; } }

    /* ── 애니메이션 ── */
    ch.tick++;
    if(ch.tick>=Math.round(60/8)){ ch.frame=(ch.frame+1)%FRAMES; ch.tick=0; }
  }

  /* ── 장애물 관리 ── */
  obstacles = obstacles.filter(ob => ob.worldZ > camZ - 2);
  
  if(nextZ < camZ+SEGS*SEG_DEPTH+10 && state==='playing' && quizState !== 'active') {
    spawnObs();
  }

  checkCollision();
}

function draw(){
  ctx.clearRect(0,0,W,H);

  /* ── 맵 배경 및 복도 회전 ── */
  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.rotate(rotY);
  ctx.translate(-W/2, -H/2);

  ctx.fillStyle='#040810'; ctx.fillRect(0,0,W,H/2);
  ctx.fillStyle='#1a3560'; ctx.fillRect(0,H/2,W,H/2);
  ctx.fillStyle='rgba(255,255,255,0.65)';
  STARS.forEach(s=>{ ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); });
  
  drawCorridor();

  ctx.restore();

  /* ── 캐릭터 ── */
  drawChar();

  /* ── 퀴즈 레이어 화면 출력 ── */
  drawQuizUI();
}

(function loop(){ update(); draw(); requestAnimationFrame(loop); })();
document.getElementById('msg').innerHTML='🏃 록금이 RUNNER<br><span style="font-size:13px;color:#fa0">아무 키나 눌러 시작</span>';