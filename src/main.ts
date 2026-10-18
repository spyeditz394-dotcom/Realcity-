
import * as THREE from 'three';
const $=id=>document.getElementById(id),root=$('game'),load=$('loading'),loadfill=$('loadfill'),loadnote=$('loadnote');
let startupErrorShown=false;
function reportStartupFailure(reason){
 if(startupErrorShown||!load||!load.isConnected)return;
 startupErrorShown=true;
 const detail=String(reason||'Unknown startup error').slice(0,220);
 if(loadfill)loadfill.style.width='100%';
 if(loadnote)loadnote.textContent='Startup failed: '+detail;
 const card=load.querySelector('.loadcard');
 if(card&&!card.querySelector('[data-startup-retry]')){
  const hint=document.createElement('div');hint.style.cssText='font-size:11px;line-height:1.5;color:#ffd4c8;margin-top:12px';hint.textContent='The game could not finish starting. Reload to retry; if this repeats, share this error.';
  const retry=document.createElement('button');retry.dataset.startupRetry='1';retry.textContent='RELOAD GAME';retry.style.cssText='margin-top:14px;padding:12px 20px;border:1px solid #6ce0cc;border-radius:10px;background:#173039;color:#f4ffff;font-weight:800';
  retry.addEventListener('click',()=>location.reload());card.append(hint,retry);
 }
 console.error('REALCITY startup failure:',reason);
}
addEventListener('error',e=>reportStartupFailure(e.message||e.error?.message||'JavaScript error'));
addEventListener('unhandledrejection',e=>reportStartupFailure(e.reason?.message||e.reason||'Asynchronous initialization failed'));
setTimeout(()=>{if(load?.isConnected&&getComputedStyle(load).opacity!=='0')reportStartupFailure('Startup timed out after 20 seconds');},20000);
let quality=2,paused=false,fpsFrames=0,fpsElapsed=0,shownFps=0;const saved=(()=>{try{const raw=localStorage.getItem('realcity-settings');const data=raw?JSON.parse(raw):{};return data&&typeof data==='object'&&!Array.isArray(data)?data:{}}catch{return {}}})();quality=Number.isInteger(saved.quality)&&saved.version>=7?Math.max(0,Math.min(3,saved.quality)):1;const scene=new THREE.Scene();
function makeSkyTexture(top,horizon,glow){const canvas=document.createElement('canvas');canvas.width=4;canvas.height=512;const ctx=canvas.getContext('2d');if(!ctx)return null;const gradient=ctx.createLinearGradient(0,0,0,512);gradient.addColorStop(0,top);gradient.addColorStop(.52,horizon);gradient.addColorStop(.78,glow);gradient.addColorStop(1,horizon);ctx.fillStyle=gradient;ctx.fillRect(0,0,4,512);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture}
const skyDay=makeSkyTexture('#527c9d','#9fb9c3','#d8d7c7'),skyNight=makeSkyTexture('#07101f','#172338','#3b4858');scene.background=skyDay||new THREE.Color(0x9fb9c3);scene.fog=new THREE.FogExp2(0x9fb9c3,.00145);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,420);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,[1.0,Math.min(devicePixelRatio,1.25),Math.min(devicePixelRatio,1.5),Math.min(devicePixelRatio,2.0)][quality]));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=quality>=1;renderer.shadowMap.type=THREE.PCFSoftShadowMap;root.appendChild(renderer.domElement);
const hemi=new THREE.HemisphereLight(0xdff6ff,0x5c6554,2.0);scene.add(hemi);const sun=new THREE.DirectionalLight(0xffedce,3.0);sun.position.set(-48,85,34);sun.castShadow=true;sun.shadow.mapSize.set(quality>=2?1536:1024,quality>=2?1536:1024);sun.shadow.camera.left=-85;sun.shadow.camera.right=85;sun.shadow.camera.top=85;sun.shadow.camera.bottom=-85;sun.shadow.bias=-.0005;scene.add(sun);scene.add(sun.target);
const mat=(c,r=.85,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
// Small procedural detail maps are generated locally: no external downloads and safe fallbacks.
function makeDetailMap(seed,count,base=208){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d');if(!c)return null;c.fillStyle=`rgb(${base},${base},${base})`;c.fillRect(0,0,256,256);let state=seed>>>0;const rnd=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296};for(let i=0;i<count;i++){const v=Math.floor(115+rnd()*125),a=.08+rnd()*.34;c.fillStyle=`rgba(${v},${v},${v},${a})`;const x=rnd()*256,y=rnd()*256,w=.5+rnd()*2.5,h=.5+rnd()*2.5;c.fillRect(x,y,w,h)}const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;return t}
const asphaltDetail=makeDetailMap(431,6200,205),concreteDetail=makeDetailMap(982,4600,216),facadeDetail=makeDetailMap(713,3500,224);
const concrete=mat(0x929890,.92),asphalt=mat(0x30383c,.98),asphaltAlt=mat(0x353b3e,.96),curbMat=mat(0x858b86,.88),paint=mat(0xe4d7a0,.8),grass=mat(0x47684b),trunkMat=mat(0x65452e),leafMats=[mat(0x2d6545),mat(0x39744d),mat(0x477b4a)],glass=new THREE.MeshStandardMaterial({color:0x6aabb9,roughness:.28,metalness:.15,transparent:true,opacity:.38,depthWrite:false}),windowMats=[mat(0x8fc8d3,.28,.12),mat(0x3f606b,.32,.1),mat(0xd7b988,.4,.05)];
if(asphaltDetail){asphalt.map=asphaltDetail;asphaltAlt.map=asphaltDetail;asphalt.needsUpdate=asphaltAlt.needsUpdate=true}
if(concreteDetail){concrete.map=concreteDetail;curbMat.map=concreteDetail;concrete.needsUpdate=curbMat.needsUpdate=true}
const windowBuckets=windowMats.map(material=>({material,matrices:[]})),windowGeometry=new THREE.BoxGeometry(.56,.88,.055),windowDummy=new THREE.Object3D();
// Instanced architectural trim gives each district a readable facade rhythm without multiplying draw calls.
const architectureBatches=[{material:mat(0x3d4b50,.78,.16),matrices:[]},{material:mat(0x667d80,.68,.12),matrices:[]},{material:mat(0x6bd0bd,.58,.08),matrices:[]}],architectureGeometry=new THREE.BoxGeometry(1,1,1),architectureDummy=new THREE.Object3D();
function queueArchitecture(kind,x,y,z,sx,sy,sz,rotation=0){architectureDummy.position.set(x,y,z);architectureDummy.rotation.set(0,rotation,0);architectureDummy.scale.set(sx,sy,sz);architectureDummy.updateMatrix();architectureBatches[kind].matrices.push(architectureDummy.matrix.clone())}
function queueWindow(index,x,y,z,rotation=0){windowDummy.position.set(x,y,z);windowDummy.rotation.set(0,rotation,0);windowDummy.scale.set(1,1,1);windowDummy.updateMatrix();windowBuckets[index].matrices.push(windowDummy.matrix.clone())}
const roadMarkMaterial=mat(0xb8b7a7),roadMarkGeometry=new THREE.BoxGeometry(.12,.14,2.5),roadMarkMatrices=[],roadMarkDummy=new THREE.Object3D();
function queueRoadMark(x,y,z,rotation=0){roadMarkDummy.position.set(x,y,z);roadMarkDummy.rotation.set(0,rotation,0);roadMarkDummy.scale.set(1,1,1);roadMarkDummy.updateMatrix();roadMarkMatrices.push(roadMarkDummy.matrix.clone())}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(360,360),mat(0x697a68));ground.rotation.x=-Math.PI/2;ground.position.y=-.13;ground.receiveShadow=true;scene.add(ground);
const buildings=[],pedestrians=[],vehicles=[],solid=[],windowMeshes=[],streetBulbs=[],nightPointLights=[],carLamps=[],cameraBlockers=[],cityStaticMeshes=[],doors=[],worldObjects=[],interiorMeshes=[];let interiorMode=false,currentInteriorDoorIndex=-1;
const boxGeometryCache=new Map();
function getBoxGeometry(w,h,d){const key=`${w}|${h}|${d}`;let geometry=boxGeometryCache.get(key);if(!geometry){geometry=new THREE.BoxGeometry(w,h,d);boxGeometryCache.set(key,geometry)}return geometry}
function box(w,h,d,m,x,y,z,cast=false,receive=true){const o=new THREE.Mesh(getBoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=receive;o.userData.cityStatic=true;if(w>80||d>80)o.userData.alwaysVisible=true;scene.add(o);cityStaticMeshes.push(o);return o}
function addSolid(x,z,w,d,h=12){solid.push({x,z,w,d,h})}
function randFactory(){let s=17031;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}const rand=randFactory();
loadfill.style.width='10%';loadnote.textContent='Building road network…';
for(let k=-6;k<=6;k++){let p=k*20,roadMat=(k%2===0?asphalt:asphaltAlt);box(9,.12,340,roadMat,p,-.015,0);box(340,.12,9,roadMat,0,-.015,p);for(const side of [-1,1]){box(.48,.13,340,concrete,p+side*4.76,.01,0);box(340,.13,.48,concrete,0,.01,p+side*4.76);box(.10,.17,340,curbMat,p+side*4.98,.025,0);box(340,.17,.10,curbMat,0,.025,p+side*4.98)}box(.12,.14,340,paint,p-3.1,.02,0);box(340,.14,.12,paint,0,.02,p-3.1);
for(let t=-155;t<155;t+=8){queueRoadMark(p,.02,t,0);queueRoadMark(t,.02,p,Math.PI/2)}}
const roadMarks=new THREE.InstancedMesh(roadMarkGeometry,roadMarkMaterial,roadMarkMatrices.length);for(let i=0;i<roadMarkMatrices.length;i++)roadMarks.setMatrixAt(i,roadMarkMatrices[i]);roadMarks.instanceMatrix.needsUpdate=true;roadMarks.userData.cityStatic=true;roadMarks.userData.alwaysVisible=true;scene.add(roadMarks);cityStaticMeshes.push(roadMarks);
loadfill.style.width='25%';loadnote.textContent='Creating city blocks and buildings…';
const districtPalettes={Downtown:[0x596b78,0x7e929e,0x52616e,0xb0bec5],Market:[0xb58a66,0xc9a982,0x87988c,0xd2c1a3],Residential:[0xb9b4a7,0xd0c9ba,0x9da99f,0xb9c3c0],Civic:[0x9aafb0,0xd8d3c5,0x819698,0xc2cecb],Industrial:[0x687679,0x8b8b80,0xa18b74,0x5d696c]};
function districtFor(gx,gz){if(Math.abs(gx)<=1&&Math.abs(gz)<=1)return 'Downtown';if(gx>=2)return 'Market';if(gx<=-2)return 'Residential';if(gz<=-3)return 'Civic';return 'Industrial'}
for(let gx=-6;gx<6;gx++)for(let gz=-6;gz<6;gz++){const cx=gx*20+10,cz=gz*20+10;
if(rand()<.14){box(10,.18,10,grass,cx,.03,cz);for(let t=0;t<4;t++){let x=cx+(rand()-.5)*7,z=cz+(rand()-.5)*7;box(.32,1.25,.32,trunkMat,x,.7,z,true);let crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.95+rand()*.5,1),leafMats[Math.floor(rand()*leafMats.length)]);crown.position.set(x,1.9,z);crown.castShadow=true;crown.userData.cityStatic=true;scene.add(crown);cityStaticMeshes.push(crown)}continue}
const district=districtFor(gx,gz),w=5.5+rand()*3.2,d=5.5+rand()*3.2,h=district==='Downtown'?20+rand()*27:district==='Industrial'?6+rand()*10:district==='Residential'?5+rand()*10:district==='Market'?9+rand()*15:11+rand()*18,x=cx+(rand()-.5)*2.6,z=cz+(rand()-.5)*2.6;
const palette=districtPalettes[district],wall=mat(palette[Math.floor(rand()*palette.length)],.82,.025);if(facadeDetail)wall.map=facadeDetail;const b=box(w,h,d,wall,x,h/2,z,true);b.receiveShadow=true;cameraBlockers.push(b);buildings.push({x,z,w,d,h});addSolid(x,z,w,d,h);
box(w+.15,.22,d+.15,mat(0x40494a,.86),x,h+.08,z,true);
// Roof parapets, service housings and facade shadow lines give buildings a layered silhouette.
for(const side of [-1,1]){box(.16,.62,d+.12,mat(0x4b565a,.86),x+side*(w/2-.08),h+.36,z,true);box(w+.12,.62,.16,mat(0x4b565a,.86),x,h+.36,z+side*(d/2-.08),true)}
if(h>10){const roofMat=mat(district==='Industrial'?0x505b5d:0x697579,.82,.12);box(w*.24,.55,d*.22,roofMat,x-w*.2,h+.48,z-d*.15,true);box(w*.12,.32,d*.16,roofMat,x+w*.2,h+.36,z+d*.16,true)}

if(h>13&&rand()<.62){const unitMat=mat(0x697477,.82,.18);box(w*.22,.72,d*.24,unitMat,x-w*.18,h+.48,z-d*.12,true);box(w*.12,.42,d*.15,unitMat,x+w*.22,h+.33,z+d*.16,true)}
const floors=Math.max(2,Math.floor((h-1.8)/2.6));
for(let f=0;f<floors;f++){let yy=2+f*2.55;for(let xx=-w/2+.8;xx<w/2-.25;xx+=1.35){queueWindow(Math.floor(rand()*windowMats.length),x+xx,yy,z+d/2+.035,0)}
for(let zz=-d/2+.8;zz<d/2-.25;zz+=1.35){for(let side of [-1,1])queueWindow(Math.floor(rand()*windowMats.length),x+side*(w/2+.035),yy,z+zz,side===1?Math.PI/2:-Math.PI/2)}}
// Continuous floor bands, corner pilasters and occasional balconies break up the plain box-building silhouette.
for(let f=0;f<=floors;f++){const yy=1.12+f*2.55;if(yy<h-.15)queueArchitecture(0,x,yy,z+d/2+.07,w,.095,.13);}
for(const side of [-1,1])queueArchitecture(1,x+side*(w/2-.09),h/2,z+d/2+.065,.13,h,.15);
if(rand()<.78)queueArchitecture(2,x,2.05,z+d/2+.34,w*.62,.12,.62);
if(h>16&&rand()<.72){const by=4.5+rand()*Math.max(1,h-8);queueArchitecture(1,x,by,z+d/2+.15,w*.48,.08,.48);queueArchitecture(0,x,by+.36,z+d/2+.37,w*.48,.07,.07);for(const side of [-1,1])queueArchitecture(0,x+side*w*.24,by+.18,z+d/2+.37,.07,.36,.07)}
if(rand()<.78){box(w*.68,1.4,.1,mat(0x334e51),x,1.1,z+d/2+.08);box(w*.42,.09,.12,mat(0x6dd8c5),x,1.82,z+d/2+.14);for(let q=-1;q<=1;q++)box(.05,.72,.14,mat(0xb5b7ae),x+q*w*.16,1.1,z+d/2+.16)}
if(((gx+6)*12+(gz+6))%4===0){const doorPanel=box(1.02,1.9,.075,mat(0x273d42),x,1.02,z+d/2+.23,true);box(.11,2.08,.12,mat(0x87999a),x-.57,1.04,z+d/2+.22,true);box(.11,2.08,.12,mat(0x87999a),x+.57,1.04,z+d/2+.22,true);box(1.25,.12,.12,mat(0x70d9c4),x,2.12,z+d/2+.22,true);doors.push({x,z:z+d/2+1.12,outsideX:x,outsideZ:z+d/2+1.12,district,mesh:doorPanel})}
}

for(const bucket of windowBuckets){if(!bucket.matrices.length)continue;const inst=new THREE.InstancedMesh(windowGeometry,bucket.material,bucket.matrices.length);for(let i=0;i<bucket.matrices.length;i++)inst.setMatrixAt(i,bucket.matrices[i]);inst.instanceMatrix.needsUpdate=true;inst.userData.cityStatic=true;inst.userData.alwaysVisible=true;scene.add(inst);cityStaticMeshes.push(inst);windowMeshes.push(inst)}
for(const batch of architectureBatches){if(!batch.matrices.length)continue;const inst=new THREE.InstancedMesh(architectureGeometry,batch.material,batch.matrices.length);for(let i=0;i<batch.matrices.length;i++)inst.setMatrixAt(i,batch.matrices[i]);inst.instanceMatrix.needsUpdate=true;inst.castShadow=true;inst.receiveShadow=true;inst.userData.cityStatic=true;inst.userData.alwaysVisible=true;scene.add(inst);cityStaticMeshes.push(inst)}
loadfill.style.width='45%';loadnote.textContent='Adding trees, street furniture and lighting…';
for(let k=-6;k<=6;k++)for(let n=-6;n<=6;n++){const x=k*20+5,z=n*20+5;if((k+n)%2===0){box(.15,3.8,.15,mat(0x364346),x,1.9,z,true);const bulb=box(.95,.14,.36,mat(0xfbe5b0),x,3.76,z);bulb.material.emissive.setHex(0xffc96b);bulb.material.emissiveIntensity=.08;streetBulbs.push(bulb);box(.08,.5,.08,mat(0x303d40),x+.38,3.55,z,true)}}
// A small pool of real point lights makes nearby streets and facades receive light at night.
for(const [x,z] of [[-15,-15],[5,-15],[25,-15],[-15,5],[5,5],[25,5]]){const light=new THREE.PointLight(0xffc98b,0,20,2);light.position.set(x,4.05,z);scene.add(light);nightPointLights.push(light)}
// Extra street life: crosswalks, parking bays, benches, bus shelters, bins and rooftop equipment
const stripeMat=mat(0xe6e5d9),metalMat=mat(0x424f52),woodMat=mat(0x80664c),signMat=mat(0x1c5555);
for(let k=-5;k<=5;k+=2){const p=k*20;
 for(let i=0;i<7;i++){const q=-4.2+i*1.25;box(.72,.145,.18,stripeMat,p+q,.055,p+5.7);box(.18,.145,.72,stripeMat,p+5.7,.055,p+q)}
 for(let i=0;i<5;i++){const q=-3.8+i*1.6;box(1.25,.14,.10,paint,p+q,.05,p-6.6);box(.10,.14,1.25,paint,p-6.6,.05,p+q)}
}
for(let i=0;i<34;i++){const x=(rand()-.5)*230,z=(rand()-.5)*230;
 if(Math.abs((x/20)-Math.round(x/20))<.23||Math.abs((z/20)-Math.round(z/20))<.23)continue;
 if(i%3===0){box(1.55,.12,.42,woodMat,x,.55,z,true);for(const dx of [-.55,.55])box(.10,.52,.10,metalMat,x+dx,.28,z,true);for(const zz of [-.15,.15])box(1.55,.06,.06,woodMat,x,.82,z+zz)}
 else if(i%3===1){box(.48,.85,.48,metalMat,x,.43,z,true);box(.52,.09,.52,mat(0x5f7778),x,.88,z)}
 else {box(1.5,2.3,.16,metalMat,x,1.15,z,true);box(1.35,.78,.08,signMat,x,1.5,z+.11);box(.12,.7,.12,mat(0xd6b66b),x-.5,1.5,z+.17)}
}
for(let i=0;i<28;i++){const x=(rand()-.5)*225,z=(rand()-.5)*225;if(blocked(x,z,2))continue;const post=box(.12,1.2,.12,metalMat,x,.6,z,true);box(.45,.16,.42,mat(0x8ca7a6),x,1.22,z)}
function addCityKiosk(x,z){const shell=box(.72,1.42,.58,mat(0x2c454a),x,.71,z,true),screen=box(.48,.58,.055,mat(0x6bd9c6,.35,.1),x,.94,z+.32,true);screen.material.emissive.setHex(0x1f806f);screen.material.emissiveIntensity=.65;box(.78,.1,.64,mat(0x6b7e7c),x,1.47,z,true);worldObjects.push({type:'kiosk',x,z,mesh:shell,screen})}
for(const [x,z] of [[-4.2,-120],[-4.2,-80],[-4.2,-40],[-4.2,0],[-4.2,40],[-4.2,80],[4.2,120]])addCityKiosk(x,z);
function interiorBox(w,h,d,m,x,y,z){const o=box(w,h,d,m,x,y,z,true);o.userData.cityStatic=false;o.userData.interior=true;o.visible=false;interiorMeshes.push(o);return o}
let roomX=500,roomZ=500;const interiorRooms=[{district:'Downtown',x:500,z:500},{district:'Market',x:526,z:500},{district:'Residential',x:552,z:500},{district:'Civic',x:578,z:500},{district:'Industrial',x:604,z:500}];
// Each district entrance leads to its own furnished, themed interior instead of one shared room.
for(let i=0;i<interiorRooms.length;i++){const room=interiorRooms[i],rx=room.x,rz=room.z,palette=[{floor:0x656e68,wall:0xd1c8b8,back:0xc8c0b2,sofa:0x477b78,wood:0x6e5946,screen:0x6bd9c6},{floor:0x777064,wall:0xd8c2a4,back:0xc5a984,sofa:0x9b5d43,wood:0x78543b,screen:0xe4b86b},{floor:0x6a7168,wall:0xc6c5b7,back:0xb6b9ad,sofa:0x547b53,wood:0x80664c,screen:0x7eb6c4},{floor:0x626c70,wall:0xd3d9d6,back:0xb8c6c5,sofa:0x477b78,wood:0x59696a,screen:0x78c9c2},{floor:0x5c625f,wall:0xb7b5a9,back:0x989e9b,sofa:0x58636a,wood:0x4c504d,screen:0xd5a55c}][i];
interiorBox(10,.18,10,mat(palette.floor),rx,-.1,rz);
interiorBox(.18,3.3,10,mat(palette.wall),rx-4.95,1.55,rz);interiorBox(.18,3.3,10,mat(palette.wall),rx+4.95,1.55,rz);
interiorBox(10,3.3,.18,mat(palette.back),rx,1.55,rz-4.95);interiorBox(10,3.3,.18,mat(palette.back),rx,1.55,rz+4.95);
interiorBox(2.8,.12,1.5,mat(palette.wood),rx-1.6,.65,rz-1.5);interiorBox(2.8,.72,.18,mat(palette.wood),rx-1.6,1.05,rz-2.12);
interiorBox(1.8,.82,.8,mat(palette.sofa),rx+2.3,.41,rz-1.6);interiorBox(.7,1.7,.7,mat(0x6a8e6b),rx+3.3,.85,rz+2.5);
interiorBox(2.2,1.8,.16,mat(0x374d55),rx,1.15,rz-4.72);interiorBox(1.4,1.1,.08,mat(palette.screen),rx,1.3,rz-4.61);interiorBox(1.4,.08,.08,mat(0xb9d3cf),rx,1.9,rz-4.6);
interiorBox(1.25,.85,.75,mat(palette.wood),rx-2.7,.43,rz+1.7);interiorBox(.18,1.6,.18,mat(0x4a5553),rx-3.15,.8,rz+1.7);interiorBox(.18,1.6,.18,mat(0x4a5553),rx-2.25,.8,rz+1.7);
interiorBox(.55,1.2,.55,mat(0x6a8e6b),rx+3.4,.6,rz-2.7);interiorBox(.9,.1,.7,mat(palette.wood),rx+.7,.55,rz+1.8);
}
function person(color){
 // Procedural human fallback: shaped torso, layered facial features, fitted clothing and articulated hand geometry.
 // This is an in-project model, not a downloaded/licensed AAA asset; keep it compatible with the existing gait controller.
 const g=new THREE.Group(),shirt=mat(color,.78),pants=mat([0x263440,0x39434a,0x51483e,0x303d35,0x4a3b4a][Math.floor(rand()*5)],.88),skin=mat([0xf0c8a4,0xd6a77f,0xb9825e,0x8d6049,0xe0b08b,0x9d6d50][Math.floor(rand()*6)],.88),shoe=mat([0x20262a,0x3a3029,0x171d21,0x4b4740][Math.floor(rand()*4)],.76),hairMat=mat([0x30251f,0x17191b,0x5c3d2a,0x74604a,0x272d34][Math.floor(rand()*5)],.94),seamMat=mat(0x202b30,.9),bodyScale=0.94+rand()*.12,legScale=.94+rand()*.12,shoulderScale=.92+rand()*.16;
 const addMesh=(parent,geometry,material,x,y,z,sx=1,sy=1,sz=1,cast=true)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m};
 // Torso layers give a clearer shoulder/chest-to-waist silhouette than a single capsule.
 const torso=addMesh(g,new THREE.CapsuleGeometry(.255,.48,5,12),shirt,0,1.13,0,1.02*shoulderScale,1,.88);
 addMesh(g,new THREE.SphereGeometry(1,14,10),shirt,0,1.34,0,.32*shoulderScale,.19,.205);
 addMesh(g,new THREE.SphereGeometry(1,14,10),shirt,0,.99,.006,.245,.19,.19);
 const collar=addMesh(g,new THREE.CylinderGeometry(.105,.12,.07,12),seamMat,0,1.445,0);
 const neck=addMesh(g,new THREE.CylinderGeometry(.085,.105,.18,12),skin,0,1.51,.012);
 // Head shape, ears, nose, lips, eyes and brows are separate readable forms.
 addMesh(g,new THREE.SphereGeometry(1,20,16),skin,0,1.735,.012,.177,.225,.16);
 addMesh(g,new THREE.SphereGeometry(1,12,10),skin,-.176,1.72,0,.035,.06,.045);
 addMesh(g,new THREE.SphereGeometry(1,12,10),skin,.176,1.72,0,.035,.06,.045);
 addMesh(g,new THREE.SphereGeometry(1,12,10),skin,0,1.72,.163,.038,.052,.05);
 const mouth=addMesh(g,new THREE.BoxGeometry(.07,.012,.012),mat(0x784b45,.9),0,1.648,.158,.95,1,1,false);
 for(const side of [-1,1]){
   addMesh(g,new THREE.SphereGeometry(1,10,8),mat(0xf1e9db,.55),side*.067,1.765,.151,.035,.024,.012,false);
   addMesh(g,new THREE.SphereGeometry(1,10,8),mat(0x263039,.45),side*.067,1.765,.163,.014,.018,.008,false);
   const brow=addMesh(g,new THREE.CapsuleGeometry(.012,.045,3,6),hairMat,side*.067,1.801,.15,1,1,1,false);brow.rotation.z=side*.12;
 }
 // Hair cap plus a short rear hair volume avoids the featureless spherical head.
 addMesh(g,new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI*.54),hairMat,0,1.82,.002,.184,.15,.17);
 addMesh(g,new THREE.SphereGeometry(1,12,8),hairMat,0,1.755,-.105,.16,.13,.09);
 // Belt, waistband, cuffs and seams provide clothing separation.
 addMesh(g,new THREE.CylinderGeometry(.225,.24,.075,14),mat(0x35302b,.82),0,.82,0);
 addMesh(g,new THREE.BoxGeometry(.075,.055,.025),mat(0xc2a66a,.55,.5),0,.82,.239,1,1,1,false);
 const legs=[],arms=[],hands=[];
 for(let i=0;i<2;i++){
   const side=i===0?1:-1,hip=new THREE.Group();hip.position.set(side*.125,.81,0);g.add(hip);
   addMesh(hip,new THREE.CapsuleGeometry(.105,.31,4,8),pants,0,-.205,0,1,1,.98);
   addMesh(hip,new THREE.SphereGeometry(1,12,9),pants,0,-.405,.005,.082,.09,.082);
   addMesh(hip,new THREE.CapsuleGeometry(.073,.29,4,8),pants,0,-.49,.008,1,1,.96);
   addMesh(hip,new THREE.CylinderGeometry(.078,.075,.045,10),seamMat,0,-.62,.012);
   // Foot/shoe includes a shaped upper, toe box and visible sole.
   addMesh(hip,new THREE.SphereGeometry(1,12,9),shoe,0,-.675,.07,.09,.07,.16);
   addMesh(hip,new THREE.BoxGeometry(.18,.035,.29),mat(0x101619,.95),0,-.716,.065);
   legs.push(hip);
   const arm=new THREE.Group();arm.position.set(side*.285,1.355,0);g.add(arm);
   addMesh(arm,new THREE.SphereGeometry(1,12,10),shirt,side*.008,-.045,0,.105,.12,.11);
   const upper=addMesh(arm,new THREE.CapsuleGeometry(.071,.245,4,8),shirt,0,-.185,0,1,1,.98);
   const elbow=addMesh(arm,new THREE.SphereGeometry(1,12,9),shirt,0,-.33,.006,.068,.075,.07);
   const fore=addMesh(arm,new THREE.CapsuleGeometry(.055,.23,4,8),skin,0,-.425,.014,1,1,.95);
   // Sleeve cuff and palm are sized separately so the hand reads as a hand, not a ball.
   addMesh(arm,new THREE.CylinderGeometry(.063,.06,.055,10),shirt,0,-.34,.012);
   const palm=addMesh(arm,new THREE.SphereGeometry(1,14,10),skin,0,-.535,.025,.073,.087,.043);
   const fingerGroups=[];
   const fingerDefs=[{x:-.047,len:.078,r:.012},{x:-.019,len:.095,r:.013},{x:.011,len:.101,r:.013},{x:.039,len:.085,r:.011}];
   for(let fi=0;fi<fingerDefs.length;fi++){
     const fd=fingerDefs[fi],fg=new THREE.Group();fg.position.set(fd.x,-.585,.027);fg.rotation.z=(fd.x/.05)*-.08;arm.add(fg);
     addMesh(fg,new THREE.CapsuleGeometry(fd.r,fd.len*.52,3,6),skin,0,-fd.len*.28,0,1,1,.9);
     addMesh(fg,new THREE.SphereGeometry(fd.r*1.03,8,6),skin,0,-fd.len*.56,0);
     const distal=addMesh(fg,new THREE.CapsuleGeometry(fd.r*.78,fd.len*.30,3,6),skin,0,-fd.len*.72,.001,1,1,.9);
     fingerGroups.push(fg);
   }
   // Opposing, angled thumb with two segments and a knuckle.
   const thumb=new THREE.Group();thumb.position.set(side*.063,-.535,.035);thumb.rotation.z=side*-.72;arm.add(thumb);
   addMesh(thumb,new THREE.CapsuleGeometry(.014,.055,3,6),skin,side*.015,-.025,0,1,1,.9);
   addMesh(thumb,new THREE.SphereGeometry(.014,8,6),skin,side*.03,-.058,.002);
   addMesh(thumb,new THREE.CapsuleGeometry(.011,.04,3,6),skin,side*.035,-.079,.002,1,1,.9);
   fingerGroups.push(thumb);
   arms.push(arm);hands.push({palm,fingers:fingerGroups,side});
 }
 // Backpack, shoulder seams, pocket and shoe accents add silhouette and fabric detail.
 addMesh(g,new THREE.BoxGeometry(.27,.37,.12),mat(0x384b49,.92),0,1.13,-.235);
 addMesh(g,new THREE.BoxGeometry(.11,.16,.018),mat(0x4d6260,.95),-.11,1.04,.205);
 addMesh(g,new THREE.BoxGeometry(.11,.16,.018),mat(0x4d6260,.95),.11,1.04,.205);
 g.scale.set(bodyScale,legScale,bodyScale);g.userData={legs,arms,hands,torso,phase:rand()*7,speed:.78+rand()*.48,dir:rand()*Math.PI*2};
 return g
}
for(let i=0;i<22;i++){const p=person([0x278d82,0xb86d43,0x4e659a,0x925d7c,0x547b53,0xb8a052,0x687e8b][i%7]);const spawn=pickPedestrianWaypoint(i<14?{x:0,z:23}:null,i<14?65:180,p)??{x:4.72,z:24.72};p.position.set(spawn.x,0,spawn.z);p.userData.dir=Math.atan2(Math.sin(i*2.399),Math.cos(i*2.399));const goal=nextPedestrianWaypoint(p,spawn.x,spawn.z)??spawn;p.userData.goalX=goal.x;p.userData.goalZ=goal.z;p.userData.pause=.25+rand()*.5;p.userData.speed=.78+rand()*.48;scene.add(p);pedestrians.push(p)}
loadfill.style.width='65%';loadnote.textContent='Preparing player and vehicles…';
function car(color,x,z,rot=0){
 const g=new THREE.Group(),bodyMat=new THREE.MeshPhysicalMaterial({color,roughness:.25,metalness:.34,clearcoat:.62,clearcoatRoughness:.24}),trim=mat(0x20282c,.62,.1),tire=mat(0x14191d,.96),rim=mat(0x9ca8ab,.24,.78),rubberTrim=mat(0x303638,.78,.05);
 const body=new THREE.Mesh(new THREE.BoxGeometry(1.9,.58,3.75),bodyMat);body.position.y=.72;body.castShadow=true;g.add(body);
 const hood=new THREE.Mesh(new THREE.BoxGeometry(1.72,.20,1.05),bodyMat);hood.position.set(0,1.02,1.12);hood.castShadow=true;g.add(hood);
 const trunk=new THREE.Mesh(new THREE.BoxGeometry(1.68,.18,.78),bodyMat);trunk.position.set(0,.99,-1.35);g.add(trunk);
 const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.43,.62,1.82),glass);cabin.position.set(0,1.28,-.22);cabin.castShadow=true;g.add(cabin);
 const roof=new THREE.Mesh(new THREE.BoxGeometry(1.27,.10,1.12),bodyMat);roof.position.set(0,1.61,-.26);g.add(roof);
 const dash=new THREE.Mesh(new THREE.BoxGeometry(1.27,.17,.36),trim);dash.position.set(0,1.02,.55);g.add(dash);
 const consoleBox=new THREE.Mesh(new THREE.BoxGeometry(.28,.25,.48),trim);consoleBox.position.set(0,.91,-.08);g.add(consoleBox);
 for(const side of [-1,1]){const seat=new THREE.Mesh(new THREE.BoxGeometry(.48,.16,.48),mat(0x30383a,.9));seat.position.set(side*.39,.86,-.48);g.add(seat);const back=new THREE.Mesh(new THREE.BoxGeometry(.46,.52,.16),mat(0x30383a,.9));back.position.set(side*.39,1.13,-.67);g.add(back);const headrest=new THREE.Mesh(new THREE.BoxGeometry(.23,.19,.13),trim);headrest.position.set(side*.39,1.48,-.67);g.add(headrest)}
 const wheelStem=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.23,8),trim);wheelStem.rotation.x=.38;wheelStem.position.set(-.40,1.18,.37);g.add(wheelStem);const steering=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,6,16),trim);steering.position.set(-.40,1.29,.45);g.add(steering);
 const cluster=new THREE.Mesh(new THREE.BoxGeometry(.32,.07,.025),mat(0x6b9f99,.3,.1));cluster.position.set(-.18,1.12,.73);g.add(cluster);
 for(const side of [-1,1]){const mirror=new THREE.Mesh(new THREE.BoxGeometry(.15,.12,.23),trim);mirror.position.set(side*.83,1.17,.47);g.add(mirror);
  const headlamp=new THREE.Mesh(new THREE.BoxGeometry(.36,.13,.06),mat(0xffedbd,.22,.05));headlamp.material.emissive.setHex(0xffd38a);headlamp.material.emissiveIntensity=.05;headlamp.position.set(side*.56,.78,1.90);g.add(headlamp);carLamps.push({mesh:headlamp,kind:'head'});
  const tail=new THREE.Mesh(new THREE.BoxGeometry(.30,.13,.06),mat(0xc52f32,.28));tail.material.emissive.setHex(0xff1c14);tail.material.emissiveIntensity=.15;tail.position.set(side*.57,.77,-1.91);g.add(tail);carLamps.push({mesh:tail,kind:'tail'});
  const wheels=[];for(const zz of [-1.22,1.22]){const wg=new THREE.Group();wg.position.set(side*.96,.36,zz);const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.22,14),tire);wheel.rotation.z=Math.PI/2;wheel.castShadow=true;wg.add(wheel);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.235,10),rim);hub.rotation.z=Math.PI/2;wg.add(hub);g.add(wg);wheels.push(wg)}
  if(!g.userData.wheels)g.userData.wheels=[];g.userData.wheels.push(...wheels);
 }
 // Body-side seams, handles, lower rocker trim and wheel-arch lips add silhouette detail without changing physics.
for(const side of [-1,1]){
 const rocker=new THREE.Mesh(new THREE.BoxGeometry(.045,.13,2.15),rubberTrim);rocker.position.set(side*.955,.48,-.05);g.add(rocker);
 for(const zz of [-.72,.48]){const seam=new THREE.Mesh(new THREE.BoxGeometry(.025,.38,.025),trim);seam.position.set(side*.957,.79,zz);g.add(seam)}
 for(const zz of [-.43,.79]){const handle=new THREE.Mesh(new THREE.BoxGeometry(.035,.045,.19),rim);handle.position.set(side*.969,1.00,zz);g.add(handle)}
 for(const zz of [-1.22,1.22]){const arch=new THREE.Mesh(new THREE.TorusGeometry(.365,.035,5,18),rubberTrim);arch.rotation.y=Math.PI/2;arch.position.set(side*.965,.37,zz);g.add(arch)}
}
const frontGrille=new THREE.Mesh(new THREE.BoxGeometry(.55,.14,.055),trim);frontGrille.position.set(0,.70,1.91);g.add(frontGrille);
 const plate=new THREE.Mesh(new THREE.BoxGeometry(.42,.12,.04),mat(0xe4e7df));plate.position.set(0,.65,-1.91);g.add(plate);
 g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);const v={g,speed:0,steer:0,health:100,trafficData:null,lastCollisionTime:-10};vehicles.push(v);return v
}
car(0xb9473e,5,17,.1);car(0x347f9d,-35,24,Math.PI/2);car(0xc3a64b,39,-23,-Math.PI/2);
// Ambient traffic: lightweight lane-following cars on the existing road grid.
const traffic=[];
const trafficSpecs=[
 {axis:'z',lane:-2.1,dir:1,z:-118,color:0x477d9b},
 {axis:'z',lane:2.1,dir:-1,z:82,color:0x9eaaad},
 {axis:'z',lane:38,dir:1,z:22,color:0x6c8b64},
 {axis:'z',lane:-42,dir:-1,z:-44,color:0xc08b50},
 {axis:'x',lane:-2.1,dir:1,z:42,color:0x8b687c},
 {axis:'x',lane:2.1,dir:-1,z:-82,color:0x4c8990},
 {axis:'x',lane:58,dir:1,z:2,color:0x9c594a},
 {axis:'x',lane:-62,dir:-1,z:2,color:0xb7b9b1}
];
for(const spec of trafficSpecs){
 const v=car(spec.color,spec.axis==='x'?spec.z:spec.lane,spec.axis==='z'?spec.z:spec.lane,spec.axis==='z'?(spec.dir>0?0:Math.PI):(spec.dir>0?Math.PI/2:-Math.PI/2));
 (v as any).traffic=true;(v as any).trafficData={axis:spec.axis,lane:spec.lane,dir:spec.dir,speed:3.2+rand()*2.1};traffic.push(v as any);
}
const player=person(0x20b7a5);let spawnX=Number.isFinite(saved.spawnX)?Math.max(-165,Math.min(165,saved.spawnX)):0,spawnZ=Number.isFinite(saved.spawnZ)?Math.max(-165,Math.min(165,saved.spawnZ)):23;if(saved.interior===true&&Number.isInteger(saved.interiorDoorIndex)&&doors[saved.interiorDoorIndex]){interiorMode=true;currentInteriorDoorIndex=saved.interiorDoorIndex;const room=interiorRooms.find(r=>r.district===doors[currentInteriorDoorIndex].district)||interiorRooms[0];roomX=room.x;roomZ=room.z;spawnX=roomX;spawnZ=roomZ;interiorMeshes.forEach(o=>o.visible=true)}if(blocked(spawnX,spawnZ,.55)){spawnX=0;spawnZ=23}player.position.set(spawnX,0,spawnZ);scene.add(player);

let playerAssetStatus='Loading rigged human…',playerAssetLoadMs=0,playerFingerBoneCount=0;
const playerAssetStarted=performance.now();
function getFingerKind(name){const n=name.toLowerCase().replace(/[^a-z0-9]/g,'');if(n.includes('thumb'))return 'thumb';if(n.includes('index'))return 'index';if(n.includes('middle'))return 'middle';if(n.includes('ring'))return 'ring';if(n.includes('pinky')||n.includes('little'))return 'little';return null}
function getHandSide(name){const raw=name.toLowerCase(),n=raw.replace(/[^a-z0-9]/g,'');if(n.includes('left')||n.startsWith('lhand')||n.startsWith('lthumb')||n.startsWith('lindex')||n.startsWith('lmiddle')||n.startsWith('lring')||n.startsWith('lpinky')||n.startsWith('llittle')||/(?:^|[._ -])l(?:$|[._ -])/.test(raw)||/(?:^|[._ -])left(?:$|[._ -])/.test(raw))return 'left';if(n.includes('right')||n.startsWith('rhand')||n.startsWith('rthumb')||n.startsWith('rindex')||n.startsWith('rmiddle')||n.startsWith('rring')||n.startsWith('rpinky')||n.startsWith('rlittle')||/(?:^|[._ -])r(?:$|[._ -])/.test(raw)||/(?:^|[._ -])right(?:$|[._ -])/.test(raw))return 'right';return null}
function fingerPoseValue(pose){return ({relaxed:.08,open:0,curled:1.05,gripping:.82})[pose]??0}
function setPlayerFingerPose(pose='relaxed',side='both',finger='all'){
 const rig=player.userData.rig;if(!rig)return false;const amount=fingerPoseValue(pose);let changed=0;
 for(const item of rig.fingerBones){if(side!=='both'&&item.side!==side)continue;if(finger!=='all'&&item.kind!==finger)continue;
   item.pose=pose;
   const angle=amount*(item.segment===0?.62:item.segment===1?1:item.segment===2?.92:.45);
   item.bone.quaternion.copy(item.rest).multiply(new THREE.Quaternion().setFromAxisAngle(item.axis,angle));changed++;
 }
 return changed>0
}
function animateRiggedPlayer(gait,moving,time,dt){
 const rig=player.userData.rig;if(!rig)return;
 if(rig.mixer){
   const airborne=player.position.y>.08;
   const desired=airborne?rig.actions.jump:(moving?(Math.abs(gait)>.65?rig.actions.run:rig.actions.walk):rig.actions.idle);
   if(desired&&desired!==rig.activeAction){
     desired.reset().play();
     if(rig.activeAction)rig.activeAction.crossFadeTo(desired,.18,true);
     rig.activeAction=desired;
   }
   rig.mixer.update(dt);
 }else{
   for(const item of rig.bodyBones){const b=item.bone;b.quaternion.copy(item.rest);let angle=0;
     if(item.kind==='leftLeg')angle=gait*.9;else if(item.kind==='rightLeg')angle=-gait*.9;
     else if(item.kind==='leftArm')angle=-gait*.58;else if(item.kind==='rightArm')angle=gait*.58;
     else if(item.kind==='leftForearm')angle=-Math.max(0,gait)*.18;else if(item.kind==='rightForearm')angle=Math.max(0,gait)*.18;
     else if(item.kind==='spine')angle=Math.sin(time*2.4)*.018;
     if(angle)b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(item.axis,angle));
   }
 }
 // Apply finger pose AFTER the animation mixer so clips cannot silently overwrite it.
 // This is a procedural pose overlay on the actual recognized rig bones, not a claim that
 // every third-party skeleton's local finger axis has been visually validated.
 for(const item of rig.fingerBones){
   const base=fingerPoseValue(item.pose||'relaxed')*(item.segment===0?.62:item.segment===1?1:item.segment===2?.92:.45);
   const wiggle=moving&&(!item.pose||item.pose==='relaxed')?Math.sin(time*5+item.index*.8+(item.side==='left'?1:0))*.018:0;
   item.bone.quaternion.copy(item.rest).multiply(new THREE.Quaternion().setFromAxisAngle(item.axis,base+wiggle));
 }
}
function installRiggedPlayer(gltf){
 const model=gltf.scene;model.updateMatrixWorld(true);
 // Reject the upstream matte-jade mannequin: it has one untextured material and is the reason
 // the visible player can regress to a pale, featureless placeholder. Keep the detailed fallback
 // until a visually qualified, licensed character is supplied.
 let hasTextureOrVertexColor=false,materialCount=0;
 model.traverse(o=>{if(!o.isMesh)return;const materials=Array.isArray(o.material)?o.material:[o.material];for(const material of materials){if(!material)continue;materialCount++;if(material.map||material.normalMap||material.roughnessMap||material.metalnessMap||material.emissiveMap)hasTextureOrVertexColor=true}if(o.geometry?.getAttribute('color'))hasTextureOrVertexColor=true});
 // Do not accept a bare rig merely because its bones and material colors exist. A usable player asset must have authored texture maps or vertex colors; otherwise the clothed in-project fallback stays visible.
 if(!hasTextureOrVertexColor)throw new Error('Visual quality gate: rig has no texture maps or vertex colors ('+materialCount+' material slots); keeping clothed procedural character');
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
 if(!Number.isFinite(size.y)||size.y<.25)throw new Error('Humanoid model has invalid bounds');
 const modelRoot=new THREE.Group(),scale=1.78/size.y;model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale;modelRoot.add(model);
 const bones=[];model.traverse(o=>{if(o.isBone)bones.push(o)});
 const fingerBones=[];
 for(const bone of bones){const kind=getFingerKind(bone.name),side=getHandSide(bone.name);if(!kind||!side)continue;
   const match=bone.name.match(/(?:[._ -]?)([0-4])$/),segment=match?Number(match[1]):Math.min(3,fingerBones.filter(x=>x.side===side&&x.kind===kind).length);
   fingerBones.push({bone,kind,side,segment,rest:bone.quaternion.clone(),axis:new THREE.Vector3(1,0,0),index:fingerBones.length,pose:'relaxed'});
 }
 if(bones.length<20||fingerBones.length<20){const names=bones.map(b=>b.name).filter(n=>/thumb|index|middle|ring|pinky|little/i.test(n));throw new Error('Rig validation: '+bones.length+' bones, '+fingerBones.length+' recognized finger joints; candidates: '+(names.slice(0,12).join(', ')||'none'))}
 const bodyBones=[];
 for(const bone of bones){const n=bone.name.toLowerCase().replace(/[^a-z0-9]/g,'');let kind=null;
   if((n.includes('left')||n.startsWith('l'))&&/(upleg|thigh|upperleg)/.test(n))kind='leftLeg';
   else if((n.includes('right')||n.startsWith('r'))&&/(upleg|thigh|upperleg)/.test(n))kind='rightLeg';
   else if((n.includes('left')||n.startsWith('l'))&&/(upperarm|arm$|shoulder)/.test(n))kind='leftArm';
   else if((n.includes('right')||n.startsWith('r'))&&/(upperarm|arm$|shoulder)/.test(n))kind='rightArm';
   else if((n.includes('left')||n.startsWith('l'))&&/(forearm|lowerarm)/.test(n))kind='leftForearm';
   else if((n.includes('right')||n.startsWith('r'))&&/(forearm|lowerarm)/.test(n))kind='rightForearm';
   else if(/spine1|spine2|chest/.test(n))kind='spine';
   if(kind)bodyBones.push({bone,kind,rest:bone.quaternion.clone(),axis:new THREE.Vector3(1,0,0)});
 }
 const clips=gltf.animations||[];
 const mixer=clips.length?new THREE.AnimationMixer(model):null;
 const actions={idle:null,walk:null,run:null,jump:null};
 if(mixer){
   for(const clip of clips){
     const n=String(clip.name||'').toLowerCase();
     const action=mixer.clipAction(clip);
     action.enabled=true;
     if(/idle|stand|breath|rest/.test(n)&&!actions.idle)actions.idle=action;
     else if(/walk|walking|locomotion/.test(n)&&!actions.walk)actions.walk=action;
     else if(/run|running|sprint/.test(n)&&!actions.run)actions.run=action;
     else if(/jump|land|leap/.test(n)&&!actions.jump)actions.jump=action;
   }
   const fallback=actions.idle||actions.walk||actions.run||mixer.clipAction(clips[0]);
   actions.idle=actions.idle||fallback;
   actions.walk=actions.walk||actions.idle;
   actions.run=actions.run||actions.walk;
   actions.jump=actions.jump||actions.idle;
   for(const action of new Set(Object.values(actions)))if(action){action.setLoop(THREE.LoopRepeat,Infinity);action.clampWhenFinished=false}
   actions.idle.reset().play();
 }
 for(const child of [...player.children]){player.remove(child);child.traverse?.(o=>{if(o.isMesh)o.geometry?.dispose?.()})}
 player.add(modelRoot);player.userData.legs=[];player.userData.arms=[];player.userData.hands=[];
 player.userData.rig={model,modelRoot,bones,fingerBones,bodyBones,mixer,clips,actions,activeAction:actions.idle,actionNames:clips.map(c=>c.name||'(unnamed)')};
 player.userData.riggedAsset=true;player.userData.setFingerPose=setPlayerFingerPose;
 playerFingerBoneCount=fingerBones.length;playerAssetLoadMs=performance.now()-playerAssetStarted;playerAssetStatus='Rigged human loaded · '+bones.length+' bones · '+fingerBones.length+' finger joints';
 setPlayerFingerPose('relaxed');
}
async function loadRiggedPlayer(){try{const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const loader=new GLTFLoader();loader.load('https://raw.githubusercontent.com/programasweights/avatar/main/public/assets/character.glb',gltf=>{try{installRiggedPlayer(gltf)}catch(err){playerAssetStatus='Rig rejected · '+String(err?.message||err).slice(0,92);console.warn('REALCITY character rig integration:',err)}},undefined,err=>{playerAssetStatus='Rig unavailable · network/CORS/load error';console.warn('REALCITY character asset load failed; keeping fallback.',err)})}catch(err){playerAssetStatus='Rig loader unavailable · using procedural fallback';console.warn('REALCITY rig loader import failed; keeping fallback.',err)}}

loadRiggedPlayer();
if(Array.isArray(saved.cars)){const parked=vehicles.filter(v=>!v.traffic);for(let i=0;i<Math.min(parked.length,saved.cars.length);i++){const s=saved.cars[i],v=parked[i];if(!s||typeof s!=='object')continue;const x=Number(s.x),z=Number(s.z),rot=Number(s.rotation);if(Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<=165&&Math.abs(z)<=165&&(!Number.isFinite(rot)||!vehicleBlocked(x,z,rot,v))){v.g.position.x=x;v.g.position.z=z;if(Number.isFinite(rot))v.g.rotation.y=rot}if(Number.isFinite(s.health))v.health=Math.max(0,Math.min(100,s.health))}}
loadfill.style.width='82%';loadnote.textContent='Initializing controls and minimap…';
let yaw=0,pitch=.22,inCar=null,jumpV=0,sprinting=false,stamina=100,toastTimer,nightMode=!!saved.nightMode,dragging=false,lx=0,ly=0;const keys:Record<string,boolean>={};if(!interiorMode&&Number.isInteger(saved.inCarIndex)&&saved.inCarIndex>=0){const parked=vehicles.filter(v=>!v.traffic);const restored=parked[saved.inCarIndex];if(restored){inCar=restored;player.visible=false;$('interact').textContent='EXIT VEHICLE';$('drivepad').classList.add('visible');$('vehicleStatus').style.display='block'}}function clearInputs(){sprinting=false;dragging=false;for(const k of Object.keys(keys))keys[k]=false;document.querySelectorAll('.down').forEach(b=>b.classList.remove('down'))}addEventListener('blur',()=>{clearInputs();saveSettings()});addEventListener('focus',clearInputs);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();saveSettings()}});const cameraRay=new THREE.Raycaster();const clock=new THREE.Clock();let elapsed=0,aiFrame=0,worldCullElapsed=0;
function say(s){$('toast').textContent=s;$('toast').style.opacity='1';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity='0',1900)}
let saveWarningShown=false;function saveSettings(){try{const t=player.position,finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback,payload={version:7,quality,nightMode,interior:interiorMode,interiorDoorIndex:interiorMode?currentInteriorDoorIndex:-1,inCarIndex:interiorMode?-1:(inCar?vehicles.filter(v=>!v.traffic).indexOf(inCar):-1),spawnX:interiorMode?roomX:Math.max(-165,Math.min(165,finite(t.x))),spawnZ:interiorMode?roomZ:Math.max(-165,Math.min(165,finite(t.z))),cars:vehicles.filter(v=>!v.traffic).map(v=>({x:Math.max(-165,Math.min(165,finite(v.g.position.x))),z:Math.max(-165,Math.min(165,finite(v.g.position.z))),rotation:finite(v.g.rotation.y),health:Math.max(0,Math.min(100,finite(v.health,100)))}))};localStorage.setItem('realcity-settings',JSON.stringify(payload));return true}catch(e){if(!saveWarningShown){saveWarningShown=true;if(typeof say==='function')say('Save unavailable · browser storage could not be written')}return false}}
function setNight(on){nightMode=on;scene.background=on?(skyNight||new THREE.Color(0x101c30)):(skyDay||new THREE.Color(0x9bc4d1));for(const v of traffic){if(v.trafficData){v.trafficData.cityPeriod=on?'night':'day';v.trafficData.targetDensity=on?.78:1}}scene.fog.color.setHex(on?0x172338:0x9fb9c3);scene.fog.density=on?.0038:[.0021,.00165,.0013,.0011][quality];hemi.intensity=on?.62:2.0;sun.intensity=on?.28:3.0;sun.color.setHex(on?0x9bb8ff:0xffedce);sun.position.set(on?34:-48,on?28:85,on?-26:34);renderer.toneMappingExposure=on?1.28:1.15;for(const w of windowMeshes){w.material.emissive.setHex(on?0xffb85c:0x12252a);w.material.emissiveIntensity=on?.95:.18}for(const l of streetBulbs)l.material.emissiveIntensity=on?2.2:.08;for(const light of nightPointLights)light.intensity=on?34:0;for(const l of carLamps)l.mesh.material.emissiveIntensity=l.kind==='head'?(on?2.1:.05):(on?.8:.15);$('timeText').textContent=on?'NIGHT':'DAY';$('timeBtn').textContent=on?'SET DAY':'SET NIGHT';$('menuTimeBtn').textContent='TIME: '+(on?'NIGHT':'DAY');saveSettings();say(on?'Night mode · lights on':'Day mode · natural light restored')}
function d2(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
function closestCar(){let best=null,d=1e9;for(const v of vehicles){if(v.traffic||!v.g?.visible||!Number.isFinite(v.g.position.x)||!Number.isFinite(v.g.position.z))continue;let dd=d2(player.position,v.g.position);if(dd<d){best=v;d=dd}}return [best,d]}
function toggleCar(){if(inCar&&(!vehicles.includes(inCar)||inCar.traffic)){inCar=null;player.visible=true;$('interact').textContent='ENTER VEHICLE';$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none'}if(inCar){if(Math.abs(inCar.speed)>1.2){say('Slow down before exiting');return}const offsets=[-1.8,1.8];let spot=null;for(const side of offsets){const off=new THREE.Vector3(side,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),inCar.g.rotation.y),ex=inCar.g.position.x+off.x,ez=inCar.g.position.z+off.z;if(!blocked(ex,ez,.62,inCar)){spot={x:ex,z:ez};break}}if(!spot){say('No safe space to exit here');return}player.position.set(spot.x,0,spot.z);inCar=null;player.visible=true;$('interact').textContent='ENTER VEHICLE';$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none';saveSettings();say('Exited safely');return}let [v,d]=closestCar();if(v&&d<5.2){inCar=v;player.visible=false;v.speed=0;v.steer=0;$('interact').textContent='EXIT VEHICLE';saveSettings();say('Vehicle entered · use arrows or WASD to drive')}else say('Walk closer to a parked vehicle')}
function enterInterior(index){const door=doors[index];if(!door||inCar)return;if(d2(player.position,door)<2.7){interiorMode=true;currentInteriorDoorIndex=index;const room=interiorRooms.find(r=>r.district===door.district)||interiorRooms[0];roomX=room.x;roomZ=room.z;player.position.set(roomX,0,roomZ);player.visible=true;interiorMeshes.forEach(o=>o.visible=true);yaw=0;pitch=.16;saveSettings();say('Entered '+door.district+' building · use INTERACT to exit')}else say('Move closer to the entrance')}
function exitInterior(){const door=doors[currentInteriorDoorIndex];interiorMode=false;interiorMeshes.forEach(o=>o.visible=false);player.position.set(door?.outsideX??0,0,door?.outsideZ??23);currentInteriorDoorIndex=-1;saveSettings();say('Exited building · back in the city')}
function nearestInteraction(){if(inCar)return {type:'carExit',distance:0};if(interiorMode)return {type:'interiorExit',distance:0};let best=null;const [v,cd]=closestCar();if(v&&cd<5.2)best={type:'car',distance:cd};for(let i=0;i<doors.length;i++){const d=doors[i],dd=d2(player.position,d);if(dd<2.7&&(!best||dd<best.distance))best={type:'door',distance:dd,index:i}}for(const obj of worldObjects){const dd=d2(player.position,obj);if(dd<2.7&&(!best||dd<best.distance))best={type:obj.type,distance:dd,object:obj}}return best}
function performInteraction(){if(inCar){toggleCar();return}if(interiorMode){exitInterior();return}const target=nearestInteraction();if(!target){say('No interaction nearby · approach a parked car, marked door, or city kiosk');return}if(target.type==='car'){toggleCar();return}if(target.type==='door'){enterInterior(target.index);return}if(target.type==='kiosk'){setNight(!nightMode);return}}
$('interact').addEventListener('click',performInteraction);function serviceVehicle(){let v=inCar;if(!v){let near=null,d=1e9;for(const candidate of vehicles){if(candidate.traffic||!candidate.g?.visible)continue;const dd=d2(player.position,candidate.g.position);if(dd<d){near=candidate;d=dd}}if(!near||d>14){say('Move within 14 m of a parked vehicle to service it');return}v=near}v.health=100;v.speed=0;v.steer=0;saveSettings();if(inCar===v)say('Vehicle serviced · condition restored to 100%');else say('Nearby parked vehicle repaired · condition 100%')}$('serviceBtn').addEventListener('click',serviceVehicle);$('timeBtn').addEventListener('click',()=>setNight(!nightMode));$('jump').addEventListener('click',()=>{if(!inCar&&player.position.y<.06)jumpV=5.1});
$('sprint').addEventListener('pointerdown',e=>{e.preventDefault();sprinting=true});['pointerup','pointercancel','pointerleave'].forEach(ev=>$('sprint').addEventListener(ev,()=>sprinting=false));
document.querySelectorAll<HTMLElement>('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=true;b.classList.add('down');b.setPointerCapture((e as PointerEvent).pointerId)});const off=()=>{keys[k]=false;b.classList.remove('down')};['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,off))});
addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(k==='escape'){setPaused(!paused);e.preventDefault();return}if(paused)return;keys[k]=true;if(k.startsWith('arrow')||k===' ')e.preventDefault();if(k===' '&&!inCar&&player.position.y<.06)jumpV=5.1;if(k==='e'&&!e.repeat)performInteraction()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
renderer.domElement.addEventListener('pointerdown',e=>{if(e.target.closest?.('button'))return;dragging=true;lx=e.clientX;ly=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-lx)*.006;pitch=Math.max(-.08,Math.min(.72,pitch+(e.clientY-ly)*.003));lx=e.clientX;ly=e.clientY});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>renderer.domElement.addEventListener(ev,()=>dragging=false));
function staticBlocked(x,z,r){for(const b of solid){if(Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r)return true}return false}
function blocked(x,z,r=.65,ignoreVehicle=null){if(interiorMode)return Math.abs(x-roomX)>4.35-r||Math.abs(z-roomZ)>4.35-r;if(Math.abs(x)>169-r||Math.abs(z)>169-r)return true;if(staticBlocked(x,z,r))return true;for(const v of vehicles){if(v===ignoreVehicle)continue;const dx=x-v.g.position.x,dz=z-v.g.position.z,ang=v.g.rotation.y,c=Math.cos(ang),s=Math.sin(ang),lx=dx*c-dz*s,lz=dx*s+dz*c;if(Math.abs(lx)<1.05+r*.35&&Math.abs(lz)<2.0+r*.45)return true}return false}
function vehicleBlocked(x,z,angle,vehicle){if(Math.abs(x)>167||Math.abs(z)>167)return true;const c=Math.cos(angle),s=Math.sin(angle),hw=1,hl=1.9;for(const b of solid){const dx=x-b.x,dz=z-b.z,aw=b.w/2,ad=b.d/2;if(Math.abs(dx)>aw+hw*Math.abs(c)+hl*Math.abs(s))continue;if(Math.abs(dz)>ad+hw*Math.abs(s)+hl*Math.abs(c))continue;if(Math.abs(dx*c-dz*s)>hw+aw*Math.abs(c)+ad*Math.abs(s))continue;if(Math.abs(dx*s+dz*c)>hl+aw*Math.abs(s)+ad*Math.abs(c))continue;return true}for(const other of vehicles){if(other===vehicle)continue;const dx=other.g.position.x-x,dz=other.g.position.z-z;if(Math.abs(dx)<2.1&&Math.abs(dz)<3.6)return true}return false}

function pedestrianCrowded(x,z,ignore=null,radius=1.05){for(const other of pedestrians){if(other===ignore)continue;const dx=other.position.x-x,dz=other.position.z-z;if(dx*dx+dz*dz<radius*radius)return true}return false}
function pickPedestrianWaypoint(origin=null,maxDistance=180,ignore=null){
 for(let attempt=0;attempt<64;attempt++){
  const k=Math.floor(rand()*15)-7,j=Math.floor(rand()*15)-7;
  const sx=rand()<.5?-1:1,sz=rand()<.5?-1:1;
  const x=k*20+sx*4.72,z=j*20+sz*4.72;
  if(Math.abs(x)>160||Math.abs(z)>160||blocked(x,z,.42)||pedestrianCrowded(x,z,ignore,1.15))continue;
  if(origin&&Math.hypot(x-origin.x,z-origin.z)>maxDistance)continue;
  return {x,z};
 }
 return null;
}
function nextPedestrianWaypoint(p,fromX=p.position.x,fromZ=p.position.z){
 const candidates=[{x:fromX+20,z:fromZ},{x:fromX-20,z:fromZ},{x:fromX,z:fromZ+20},{x:fromX,z:fromZ-20}];
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}
 for(const node of candidates){if(Math.abs(node.x)>160||Math.abs(node.z)>160)continue;if(blocked(node.x,node.z,.42)||pedestrianCrowded(node.x,node.z,p,1.1))continue;return node}
 return pickPedestrianWaypoint(p.position,45,p);
}
const map=$('map') as HTMLCanvasElement,ctx=map?.getContext('2d');function drawMap(t){if(!map||!ctx)return;const W=map.width,H=map.height,sc=.72;ctx.clearRect(0,0,W,H);ctx.fillStyle='#18302f';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2-t.x*sc,H/2-t.z*sc);ctx.scale(sc,sc);ctx.fillStyle='#3d4a4d';for(let k=-6;k<=6;k++){ctx.fillRect(k*20-4,-190,8,380);ctx.fillRect(-190,k*20-4,380,8)}ctx.fillStyle='#85918a';for(const b of buildings)ctx.fillRect(b.x-b.w/2,b.z-b.d/2,b.w,b.d);ctx.fillStyle='#d8b55b';for(const p of pedestrians)ctx.fillRect(p.position.x-1,p.position.z-1,2,2);for(const v of vehicles){ctx.fillStyle=v===inCar?'#fff':'#d75b4b';ctx.fillRect(v.g.position.x-1.2,v.g.position.z-2,2.4,4)}ctx.fillStyle='#61f0d2';ctx.beginPath();ctx.arc(t.x,t.z,2.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#61f0d2';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(t.x,t.z);ctx.lineTo(t.x+Math.sin(yaw)*7,t.z+Math.cos(yaw)*7);ctx.stroke();ctx.restore()}
function update(dt){if(paused)return;elapsed+=dt;aiFrame++;
if(!interiorMode)for(const v of traffic){if(v===inCar)continue;const td=v.trafficData;if(!td)continue;const p=v.g.position;const target=inCar?inCar.g.position:player.position;const dx=p.x-target.x,dz=p.z-target.z,userGap=Math.hypot(dx,dz),userAcross=td.axis==='z'?Math.abs(target.x-td.lane):Math.abs(target.z-td.lane);let gap=1e9;for(const other of traffic){if(other===v||other.trafficData.axis!==td.axis)continue;const op=other.g.position;const along=td.axis==='z'?(op.z-p.z)*td.dir:(op.x-p.x)*td.dir;const across=td.axis==='z'?Math.abs(op.x-p.x):Math.abs(op.z-p.z);if(along>0&&along<16&&across<2.8)gap=Math.min(gap,along)}if(userAcross<3.2&&userGap<7)gap=Math.min(gap,Math.max(0,userGap-1.2));const baseSpeed=td.speed*(nightMode?.78:1);const desiredSpeed=gap<2.8?0:gap<5.5?Math.min(baseSpeed,(gap-2.0)*.55):gap<12?baseSpeed*Math.min(1,(gap-5.5)/6.5):baseSpeed;td.state=desiredSpeed<.05?'stopped':desiredSpeed<baseSpeed*.78?'braking':gap<16?'following':'cruise';td.currentSpeed=THREE.MathUtils.damp(td.currentSpeed??baseSpeed,desiredSpeed,desiredSpeed<(td.currentSpeed??baseSpeed)?3.8:1.5,dt);const speed=Math.max(0,td.currentSpeed);if(td.axis==='z'){p.x=td.lane;p.z+=td.dir*speed*dt;if(p.z>164)p.z=-164;if(p.z< -164)p.z=164;v.g.rotation.y=td.dir>0?0:Math.PI}else{p.z=td.lane;p.x+=td.dir*speed*dt;if(p.x>164)p.x=-164;if(p.x< -164)p.x=164;v.g.rotation.y=td.dir>0?Math.PI/2:-Math.PI/2}const playerDistSq=(p.x-target.x)**2+(p.z-target.z)**2;v.g.visible=playerDistSq<150*150;}
const f=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),s=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
if(inCar){$('drivepad').classList.add('visible');$('vehicleStatus').style.display='block';$('vehicleHealth').style.width=inCar.health+'%';$('vehicleHealthText').textContent=Math.round(inCar.health)+'%';const v=inCar;const throttle=f>0?1:f<0?-0.72:0;v.speed+=throttle*dt*(v.speed<0?7.2:8.5);if(Math.abs(v.speed)<.12&&f===0)v.speed=0;else if(f===0)v.speed*=Math.pow(.975,dt*60);v.speed=Math.max(-5.5,Math.min(14.5,v.speed));const speedFactor=Math.min(1,Math.abs(v.speed)/5);v.steer+=(s-v.steer)*Math.min(1,dt*5);v.g.rotation.y+=v.steer*dt*(.16+speedFactor*.88)*(v.speed<-.1?-1:1);const nx=v.g.position.x+Math.sin(v.g.rotation.y)*v.speed*dt,nz=v.g.position.z+Math.cos(v.g.rotation.y)*v.speed*dt;let hit=false;if(!vehicleBlocked(nx,v.g.position.z,v.g.rotation.y,v)){v.g.position.x=nx}else hit=true;if(!vehicleBlocked(v.g.position.x,nz,v.g.rotation.y,v)){v.g.position.z=nz}else hit=true;if(hit){if(Math.abs(v.speed)>2.2&&elapsed-(v.lastCollisionTime??-10)>.85){v.health=Math.max(0,v.health-Math.max(1,Math.abs(v.speed)*1.2));v.lastCollisionTime=elapsed;say('Collision · vehicle condition '+Math.round(v.health)+'%')}v.speed*=-.12;v.steer*=.5}const maxSpeed=14.5*(.35+.65*v.health/100);v.speed=Math.max(-Math.min(5.5,maxSpeed*.5),Math.min(maxSpeed,v.speed));for(const wheel of v.g.userData.wheels||[])wheel.rotation.x+=v.speed*dt*2.8;v.g.rotation.z=-v.steer*speedFactor*.035;$('state').textContent='Driving · '+Math.round(Math.abs(v.speed)*7)+' km/h'}
else{$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none';if(sprinting&&(f||s))stamina=Math.max(0,stamina-dt*26);else stamina=Math.min(100,stamina+dt*14);const sp=sprinting&&stamina>0?7.5:4.3,dx=(Math.sin(yaw)*f+Math.cos(yaw)*s)*sp*dt,dz=(Math.cos(yaw)*f-Math.sin(yaw)*s)*sp*dt;let nx=player.position.x+dx,nz=player.position.z+dz;if(!blocked(nx,player.position.z,.52,inCar))player.position.x=nx;if(!blocked(player.position.x,nz,.52,inCar))player.position.z=nz;if(f||s)player.rotation.y=Math.atan2(dx,dz);player.rotation.z=(s||0)*-.035;player.position.y+=jumpV*dt;jumpV-=13*dt;if(player.position.y<0){player.position.y=0;jumpV=0}let moving=!!(f||s);const gait=moving?Math.sin(elapsed*(sprinting?14:10))*(sprinting?.8:.55):0;if(player.userData.riggedAsset){animateRiggedPlayer(gait,moving,elapsed,dt)}else{player.userData.legs[0].rotation.x=gait;player.userData.legs[1].rotation.x=-gait;player.userData.arms[0].rotation.x=-gait*.7;player.userData.arms[1].rotation.x=gait*.7;for(const h of player.userData.hands||[])for(let fi=0;fi<h.fingers.length;fi++)h.fingers[fi].rotation.x=moving?Math.sin(elapsed*5+fi*.8+h.side)*.025:0;if(player.userData.torso){player.userData.torso.position.y=1.13+(moving?Math.abs(gait)*.025:0);player.userData.torso.rotation.z=Math.sin(elapsed*2.4)*.012}}$('state').textContent=sprinting&&stamina>0?'Sprinting':'On foot · Exploring'}
$('stamina').style.width=stamina+'%';$('staminaText').textContent=Math.round(stamina)+'%';
if(!interiorMode)for(const p of pedestrians){if(d2(p.position,inCar?inCar.g.position:player.position)>90&&aiFrame%4!==0)continue;const u=p.userData;u.phase+=dt;let gx=u.goalX-p.position.x,gz=u.goalZ-p.position.z,gd=Math.hypot(gx,gz);if(gd<1.15){const next=nextPedestrianWaypoint(p,u.goalX,u.goalZ);if(next){u.goalX=next.x;u.goalZ=next.z;u.stuckTime=0}else{u.stuckTime=(u.stuckTime||0)+dt;if(u.stuckTime>1.5){const reroute=pickPedestrianWaypoint(p.position,45,p);if(reroute){u.goalX=reroute.x;u.goalZ=reroute.z}u.stuckTime=0}}gx=u.goalX-p.position.x;gz=u.goalZ-p.position.z;gd=Math.hypot(gx,gz)}const desired=Math.atan2(gx,gz),turn=Math.atan2(Math.sin(desired-u.dir),Math.cos(desired-u.dir));u.dir+=Math.max(-dt*1.8,Math.min(dt*1.8,turn));const pace=u.speed*(Math.abs(turn)>1.1?.42:1),nx=p.position.x+Math.sin(u.dir)*pace*dt,nz=p.position.z+Math.cos(u.dir)*pace*dt;const blockedAhead=blocked(nx,nz,.42)||pedestrianCrowded(nx,nz,p,.9);if(blockedAhead){u.stuckTime=(u.stuckTime||0)+dt;if(u.stuckTime>.55){const next=nextPedestrianWaypoint(p);if(next){u.goalX=next.x;u.goalZ=next.z;u.dir=Math.atan2(next.x-p.position.x,next.z-p.position.z)}else{const reroute=pickPedestrianWaypoint(p.position,40,p);if(reroute){u.goalX=reroute.x;u.goalZ=reroute.z}}u.stuckTime=0}}else{p.position.x=nx;p.position.z=nz;u.stuckTime=0}p.rotation.y=u.dir;const actuallyMoving=!blockedAhead&&gd>.12;u.state=blockedAhead?'avoiding':actuallyMoving?(Math.abs(turn)>.75?'turning':'walking'):'idle';const gait=actuallyMoving?Math.sin(elapsed*(5.5+pace*1.15)+u.phase)*.42:Math.sin(elapsed*1.7+u.phase)*.025;u.animationSpeed=actuallyMoving?pace:0;u.legs[0].rotation.x=gait;u.legs[1].rotation.x=-gait;u.arms[0].rotation.x=-gait*.72;u.arms[1].rotation.x=gait*.72;for(const h of p.userData.hands||[])for(let fi=0;fi<h.fingers.length;fi++)h.fingers[fi].rotation.x=Math.sin(elapsed*2.4+fi*.7+h.side+u.phase)*.012;if(u.torso){u.torso.position.y=1.13+Math.abs(gait)*.025;u.torso.rotation.z=actuallyMoving?Math.sin(elapsed*2+u.phase)*.012:Math.sin(elapsed*1.3+u.phase)*.006}}
const t=inCar?inCar.g.position:player.position;if(elapsed-worldCullElapsed>.35){worldCullElapsed=elapsed;const limit2=135*135;for(const o of cityStaticMeshes){if(!o.userData?.cityStatic)continue;if(o.userData.alwaysVisible){o.visible=true;continue}const dx=o.position.x-t.x,dz=o.position.z-t.z;o.visible=dx*dx+dz*dz<=limit2}for(const p of pedestrians){const dx=p.position.x-t.x,dz=p.position.z-t.z;p.visible=!interiorMode&&dx*dx+dz*dz<90*90}}const look=new THREE.Vector3(t.x,t.y+(inCar?1.1:1.35),t.z),dist=interiorMode?3.6:(inCar?9:7)+(inCar?Math.min(2,Math.abs(inCar.speed)*.07):0);const pos=new THREE.Vector3(t.x-Math.sin(yaw)*Math.cos(pitch)*dist,t.y+2.1+Math.sin(pitch)*dist,t.z-Math.cos(yaw)*Math.cos(pitch)*dist);const camDir=pos.clone().sub(look),camDistance=camDir.length();camDir.normalize();cameraRay.set(look,camDir);cameraRay.near=.25;cameraRay.far=camDistance;const camHits=cameraRay.intersectObjects(cameraBlockers,false);if(camHits.length)pos.copy(look).addScaledVector(camDir,Math.max(1,camHits[0].distance-.4));camera.position.lerp(pos,1-Math.pow(.001,dt));camera.lookAt(look);drawMap(t);const target=nearestInteraction();$('interact').textContent=target?({car:'ENTER VEHICLE',carExit:'EXIT VEHICLE',door:'ENTER BUILDING',interiorExit:'EXIT INTERIOR',kiosk:'USE CITY KIOSK'}[target.type]||'INTERACT'):'INTERACT'}
function applyQuality(q){quality=Math.max(0,Math.min(3,q));const names=['LOW','BALANCED','HIGH','ULTRA'];renderer.setPixelRatio(Math.min(devicePixelRatio,[1.0,Math.min(devicePixelRatio,1.25),Math.min(devicePixelRatio,1.5),Math.min(devicePixelRatio,2.0)][quality]));renderer.toneMappingExposure=[1.02,1.08,1.12,1.16][quality];scene.fog.density=nightMode?.0038:[.0021,.00165,.0013,.0011][quality];const maxAniso=renderer.capabilities.getMaxAnisotropy();for(const tex of [asphaltDetail,concreteDetail,facadeDetail])if(tex)tex.anisotropy=Math.min(maxAniso,quality>=3?8:quality>=2?4:quality>=1?2:1);renderer.shadowMap.enabled=quality>=1;renderer.shadowMap.type=quality>=2?THREE.PCFSoftShadowMap:THREE.BasicShadowMap;sun.shadow.mapSize.set(quality>=3?2048:quality>=2?1536:quality>=1?1024:512,quality>=3?2048:quality>=2?1536:quality>=1?1024:512);sun.shadow.needsUpdate=true;$('qualityText').textContent=names[quality];$('menuQualityBtn').textContent='GRAPHICS: '+names[quality];$('perf').textContent='FPS '+(shownFps||'--')+' · '+names[quality]+' · '+playerAssetStatus;saveSettings()}
function setPaused(v){paused=v;$('pauseMenu').classList.toggle('open',paused);$('pauseBtn').textContent=paused?'▶ RESUME':'Ⅱ PAUSE';if(paused)clearInputs();say(paused?'Game paused':'Back to the city')}
function recover(){if(inCar){const v=inCar;v.speed=0;v.steer=0;v.health=100;let spot=null;for(const side of [-1.8,1.8]){const off=new THREE.Vector3(side,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),v.g.rotation.y),x=v.g.position.x+off.x,z=v.g.position.z+off.z;if(!blocked(x,z,.62,v)){spot={x,z};break}}if(spot)player.position.set(spot.x,0,spot.z);else player.position.set(0,0,23);inCar=null;player.visible=true;$('interact').textContent='ENTER VEHICLE'}else{player.position.set(0,0,23);for(const v of vehicles){v.speed=0;v.health=100}}jumpV=0;stamina=100;$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none';yaw=0;pitch=.22;setPaused(false);saveSettings();say('Recovery complete')}
$('pauseBtn').addEventListener('click',()=>setPaused(!paused));$('resumeBtn').addEventListener('click',()=>setPaused(false));$('recoverBtn').addEventListener('click',recover);$('restartBtn').addEventListener('click',()=>{saveSettings();location.reload()});$('menuQualityBtn').addEventListener('click',()=>applyQuality((quality+1)%4));$('menuTimeBtn').addEventListener('click',()=>setNight(!nightMode));
$('qualityBtn').addEventListener('click',()=>{applyQuality((quality+1)%4);say('Graphics preset: '+$('qualityText').textContent)});
function bindHold(id,key){const el=$(id);const on=e=>{e.preventDefault();keys[key]=true;el.classList.add('down');try{el.setPointerCapture(e.pointerId)}catch{}};const off=()=>{keys[key]=false;el.classList.remove('down')};el.addEventListener('pointerdown',on);['pointerup','pointercancel','lostpointercapture','pointerleave'].forEach(ev=>el.addEventListener(ev,off))}
bindHold('gasBtn','w');bindHold('brakeBtn','s');
addEventListener('pagehide',()=>{clearInputs();saveSettings()});let autosaveElapsed=0,cpuMsSum=0,cpuMsSamples=0,cpuMsPeak=0;let shadowFollowElapsed=0;function frame(){requestAnimationFrame(frame);const workStart=performance.now();let dt=Math.min(clock.getDelta(),.04);shadowFollowElapsed+=dt;if(!interiorMode&&shadowFollowElapsed>=.2){shadowFollowElapsed=0;const targetX=inCar?inCar.g.position.x:player.position.x,targetZ=inCar?inCar.g.position.z:player.position.z;sun.position.set(targetX+(nightMode?34:-48),nightMode?28:85,targetZ+(nightMode?-26:34));sun.target.position.set(targetX,0,targetZ);sun.target.updateMatrixWorld();sun.updateMatrixWorld()}autosaveElapsed+=dt;if(autosaveElapsed>=12){autosaveElapsed=0;saveSettings()}fpsElapsed+=dt;fpsFrames++;if(fpsElapsed>=.5){shownFps=Math.round(fpsFrames/fpsElapsed);const avgCpu=cpuMsSamples?cpuMsSum/cpuMsSamples:0;$('perf').textContent='FPS '+shownFps+' · JS '+avgCpu.toFixed(1)+'/'+cpuMsPeak.toFixed(1)+'ms · DC '+renderer.info.render.calls+' · TRI '+renderer.info.render.triangles+' · GEO '+renderer.info.memory.geometries+' · TEX '+renderer.info.memory.textures+' · MEM: n/a · '+['LOW','BALANCED','HIGH','ULTRA'][quality]+' · '+playerAssetStatus;fpsFrames=0;fpsElapsed=0;cpuMsSum=0;cpuMsSamples=0;cpuMsPeak=0}if(!paused){update(dt);renderer.render(scene,camera)}const cpuMs=performance.now()-workStart;cpuMsSum+=cpuMs;cpuMsSamples++;cpuMsPeak=Math.max(cpuMsPeak,cpuMs)}frame();if(saved.version>=7)applyQuality(quality);else applyQuality(1);if(nightMode)setNight(true);
// One four-preset graphics controller is shared by the HUD and pause menu.
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,[1.0,Math.min(devicePixelRatio,1.25),Math.min(devicePixelRatio,1.5),Math.min(devicePixelRatio,2.0)][quality]));renderer.setSize(innerWidth,innerHeight)});
loadfill.style.width='100%';loadnote.textContent='City ready · entering world';setTimeout(()=>{load.style.opacity='0';setTimeout(()=>load.remove(),550);say('REALCITY PART 11 · Visual realism overhaul ready')},450);
