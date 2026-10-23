export type PedestrianPersonality = 'commuter'|'explorer'|'social'|'cautious';
export type PedestrianState = 'walk'|'idle'|'recover';
export interface PedestrianBrain { id:number; seed:number; state:PedestrianState; previousState:PedestrianState; goalX:number; goalZ:number; speed:number; turnRate:number; phase:number; decisionAt:number; idleUntil:number; stuckFor:number; lastX:number; lastZ:number; history:number; personality:PedestrianPersonality; viaX:boolean; cornerX:number; cornerZ:number; unreachableLogged:boolean; retryCount:number; }
type Agent={position:{x:number;z:number};rotation:{y:number};userData:Record<string,any>};
export function createPedestrianBrain(id:number,seed:number,goal:{x:number;z:number},now=0):PedestrianBrain{
 const random=rng(seed),types:PedestrianPersonality[]=['commuter','explorer','social','cautious'];
 return {id,seed,state:'walk',previousState:'walk',goalX:goal.x,goalZ:goal.z,speed:.55+random()*.42,turnRate:1.3+random()*.9,phase:random()*Math.PI*2,decisionAt:now+random()*1.7,idleUntil:0,stuckFor:0,lastX:NaN,lastZ:NaN,history:0,personality:types[Math.floor(random()*types.length)],viaX:true,cornerX:goal.x,cornerZ:goal.z,unreachableLogged:false,retryCount:0};
}
function rng(seed:number){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
const angleDelta=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
function segmentClear(x1:number,z1:number,x2:number,z2:number,blocked:StepContext['blocked']){
 const length=Math.hypot(x2-x1,z2-z1),steps=Math.max(1,Math.ceil(length/1.25));
 for(let i=1;i<=steps;i++){const t=i/steps;if(blocked(x1+(x2-x1)*t,z1+(z2-z1)*t,.42))return false}
 return true;
}
function routeClear(x:number,z:number,gx:number,gz:number,viaX:boolean,blocked:StepContext['blocked']){
 const cx=viaX?gx:x,cz=viaX?z:gz;
 return segmentClear(x,z,cx,cz,blocked)&&segmentClear(cx,cz,gx,gz,blocked);
}
function assignReachableGoal(b:PedestrianBrain,p:{x:number;z:number},ctx:StepContext,distance:number){
 for(let attempt=0;attempt<8;attempt++){
  const goal=ctx.chooseGoal(distance),viaX=attempt%2===0;
  if(routeClear(p.x,p.z,goal.x,goal.z,viaX,ctx.blocked)||routeClear(p.x,p.z,goal.x,goal.z,!viaX,ctx.blocked)){
   b.goalX=goal.x;b.goalZ=goal.z;b.viaX=routeClear(p.x,p.z,goal.x,goal.z,viaX,ctx.blocked)?viaX:!viaX;
   b.cornerX=b.viaX?goal.x:p.x;b.cornerZ=b.viaX?p.z:goal.z;b.retryCount=0;return true;
  }
 }
 // Bounded deterministic fallback around the current walkable position avoids repeatedly
 // sampling only distant goals when city corridors make those routes unreachable.
 const offsets=[{x:8,z:0},{x:-8,z:0},{x:0,z:8},{x:0,z:-8},{x:12,z:12},{x:-12,z:12},{x:12,z:-12},{x:-12,z:-12}];
 for(const offset of offsets){
  const goal={x:p.x+offset.x,z:p.z+offset.z};
  for(const viaX of [true,false]){
   if(!routeClear(p.x,p.z,goal.x,goal.z,viaX,ctx.blocked))continue;
   b.goalX=goal.x;b.goalZ=goal.z;b.viaX=viaX;
   b.cornerX=viaX?goal.x:p.x;b.cornerZ=viaX?p.z:goal.z;
   b.retryCount=0;return true;
  }
 }
 return false;
}
export interface StepContext {now:number;dt:number;agents:Agent[];blocked:(x:number,z:number,r?:number)=>boolean;chooseGoal:(distance?:number)=>{x:number;z:number};frame:number;}
export interface StepResult {gd:number;nearPed:boolean;nx:number;nz:number;dir:number;moving:boolean}
export function stepPedestrian(agent:Agent,ctx:StepContext):StepResult{
 const b=agent.userData.brain as PedestrianBrain,dt=Math.min(ctx.dt,.05),p=agent.position,u=agent.userData;
 if(!b)return {gd:0,nearPed:false,nx:p.x,nz:p.z,dir:agent.rotation.y,moving:false};
 if(Number.isFinite(b.lastX)){const moved=Math.hypot(p.x-b.lastX,p.z-b.lastZ);if(b.state==='walk'&&moved<.006)b.stuckFor+=dt;else b.stuckFor=Math.max(0,b.stuckFor-dt*2)}
 b.lastX=p.x;b.lastZ=p.z;
 if(b.stuckFor>1){b.state='recover';b.stuckFor=0;b.history++}
 let gd=Math.hypot(b.goalX-p.x,b.goalZ-p.z);
 // Idle is timed, never terminal: explicitly resume navigation when its timer expires.
 if(b.state==='idle'){
  if(ctx.now<b.idleUntil)return {gd,nearPed:false,nx:p.x,nz:p.z,dir:agent.rotation.y,moving:false};
  b.state='walk';b.previousState='idle';b.decisionAt=ctx.now;
 }
 if(b.state==='recover'||(b.state==='walk'&&gd<1.2)||ctx.now>=b.decisionAt){
  if(b.state==='walk'&&gd<1.2&&rng(b.seed+b.history+Math.floor(ctx.now*10))()<.16){b.previousState=b.state;b.state='idle';b.idleUntil=ctx.now+.8+rng(b.seed+b.history+1)()*1.8}
  else {const reached=assignReachableGoal(b,p,ctx,b.personality==='explorer'?170:120);b.previousState=b.state;b.state=reached?'walk':'recover';b.history++;if(!reached){b.retryCount++;if(!b.unreachableLogged){b.unreachableLogged=true;console.warn('[REALCITY NPC] No reachable pedestrian destination after bounded retries; keeping NPC in recover state',{id:b.id,x:p.x,z:p.z,retries:8})}}b.decisionAt=ctx.now+(reached?(b.personality==='commuter'?4:2.5)+rng(b.seed+b.history)()*4:Math.min(2,.15*b.retryCount))}
 }
 if(b.state==='idle')return {gd,nearPed:false,nx:p.x,nz:p.z,dir:agent.rotation.y,moving:false};
 const cornerDistance=Math.hypot(b.cornerX-p.x,b.cornerZ-p.z);
 const targetX=cornerDistance>1.1?b.cornerX:b.goalX,targetZ=cornerDistance>1.1?b.cornerZ:b.goalZ;
 const desired=Math.atan2(targetX-p.x,targetZ-p.z),turn=angleDelta(desired-agent.rotation.y),speed=b.speed*(Math.abs(turn)>1.05?.5:1);
 let dir=agent.rotation.y+Math.max(-b.turnRate*dt,Math.min(b.turnRate*dt,turn));
 let nx=p.x+Math.sin(dir)*speed*dt,nz=p.z+Math.cos(dir)*speed*dt,nearPed=false;
 for(const other of ctx.agents){if(other===agent)continue;const dx=other.position.x-nx,dz=other.position.z-nz;if(dx*dx+dz*dz<.95*.95){nearPed=true;break}}
 if(nearPed||ctx.blocked(nx,nz,.42)){
  let found=false;
  for(const off of [Math.PI/2,-Math.PI/2,Math.PI/4,-Math.PI/4,Math.PI]){
   const candidate=agent.rotation.y+off,x=p.x+Math.sin(candidate)*Math.max(.4,speed*dt),z=p.z+Math.cos(candidate)*Math.max(.4,speed*dt);
   if(!ctx.blocked(x,z,.42)&&ctx.agents.every(o=>o===agent||Math.hypot(o.position.x-x,o.position.z-z)>.85)){dir=candidate;nx=x;nz=z;found=true;break}
  }
  if(!found){b.state='recover';b.decisionAt=ctx.now+.1;return {gd,nearPed:true,nx:p.x,nz:p.z,dir:agent.rotation.y,moving:false}}
 }
 if(ctx.blocked(nx,nz,.42)){b.state='recover';b.decisionAt=ctx.now+.1;return {gd,nearPed,nx:p.x,nz:p.z,dir:agent.rotation.y,moving:false}}
 return {gd,nearPed,nx,nz,dir,moving:true};
}
