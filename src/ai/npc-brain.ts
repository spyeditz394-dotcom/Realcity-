export type PedestrianPersonality = 'commuter'|'explorer'|'social'|'cautious';
export type PedestrianState = 'walk'|'idle'|'recover';
export interface PedestrianBrain { id:number; seed:number; state:PedestrianState; previousState:PedestrianState; goalX:number; goalZ:number; speed:number; turnRate:number; phase:number; decisionAt:number; idleUntil:number; stuckFor:number; lastX:number; lastZ:number; history:number; personality:PedestrianPersonality; }
type Agent={position:{x:number;z:number};rotation:{y:number};userData:Record<string,any>};
export function createPedestrianBrain(id:number,seed:number,goal:{x:number;z:number},now=0):PedestrianBrain{
 const random=rng(seed),types:PedestrianPersonality[]=['commuter','explorer','social','cautious'];
 return {id,seed,state:'walk',previousState:'walk',goalX:goal.x,goalZ:goal.z,speed:.55+random()*.42,turnRate:1.3+random()*.9,phase:random()*Math.PI*2,decisionAt:now+random()*1.7,idleUntil:0,stuckFor:0,lastX:NaN,lastZ:NaN,history:0,personality:types[Math.floor(random()*types.length)]};
}
function rng(seed:number){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
const angleDelta=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
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
  else {const goal=ctx.chooseGoal(b.personality==='explorer'?170:120);b.goalX=goal.x;b.goalZ=goal.z;b.previousState=b.state;b.state='walk';b.history++;b.decisionAt=ctx.now+(b.personality==='commuter'?4:2.5)+rng(b.seed+b.history)()*4}
 }
 if(b.state==='idle')return {gd,nearPed:false,nx:p.x,nz:p.z,dir:agent.rotation.y,moving:false};
 const desired=Math.atan2(b.goalX-p.x,b.goalZ-p.z),turn=angleDelta(desired-agent.rotation.y),speed=b.speed*(Math.abs(turn)>1.05?.5:1);
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
