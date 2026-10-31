
import * as THREE from 'three';
declare const __REALCITY_BUILD_SHA__: string;
import { createPedestrianBrain, stepPedestrian } from './ai/npc-brain.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
const $=id=>document.getElementById(id),root=$('game'),load=$('loading'),loadfill=$('loadfill'),loadnote=$('loadnote');const yieldFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
const buildSha=typeof __REALCITY_BUILD_SHA__==='string'?__REALCITY_BUILD_SHA__:'development';(window as any).__BUILD_SHA__=buildSha;const debugPerf=new URLSearchParams(location.search).get('debug')==='perf';const debugFrameTimes:number[]=[];let debugOverlay:HTMLDivElement|null=null;
const deviceMemoryGB=(navigator as Navigator & {deviceMemory?:number}).deviceMemory;const touchMobileViewport=innerWidth<=600&&(navigator.maxTouchPoints>0||new URLSearchParams(location.search).has('qa'));const mobileSafeDefault=matchMedia('(pointer: coarse)').matches||touchMobileViewport||(typeof deviceMemoryGB==='number'&&deviceMemoryGB<=4)||navigator.hardwareConcurrency<=4;let quality=1,paused=false,fpsFrames=0,fpsElapsed=0,shownFps=0,mobileRenderScale=1,adaptiveScaleElapsed=0,adaptiveLowElapsed=0,adaptiveHighElapsed=0;const saved=(()=>{try{const raw=localStorage.getItem('realcity-settings');const data=raw?JSON.parse(raw):{};return data&&typeof data==='object'&&!Array.isArray(data)?data:{}}catch{return {}}})();quality=Number.isInteger(saved.quality)&&saved.version>=4?Math.max(0,Math.min(3,saved.quality)):(mobileSafeDefault?1:2);const scene=new THREE.Scene();scene.background=new THREE.Color(0x9bc4d1);scene.fog=new THREE.FogExp2(0xa3c3ca,.00028);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,520);
// Reuse camera math vectors to avoid three short-lived Vector3 allocations on every frame.
const cameraLookTarget=new THREE.Vector3(),cameraPositionTarget=new THREE.Vector3(),cameraDirectionTarget=new THREE.Vector3();
const renderer=new THREE.WebGLRenderer({antialias:!mobileSafeDefault,powerPreference:'high-performance',alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,mobileSafeDefault?mobileRenderScale:[1.0,1.25,1.5,2.0][quality]));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=quality>=1&&!mobileSafeDefault;renderer.shadowMap.type=quality>=2?THREE.PCFSoftShadowMap:THREE.BasicShadowMap;root.appendChild(renderer.domElement);
if(debugPerf){debugOverlay=document.createElement('div');debugOverlay.id='realcity-debug-perf';debugOverlay.style.cssText='position:fixed;z-index:20;left:8px;bottom:8px;max-width:calc(100vw - 16px);padding:8px 10px;background:rgba(0,0,0,.82);color:#b9fff0;border:1px solid #7be3d4;border-radius:8px;font:12px/1.45 ui-monospace,monospace;white-space:pre-wrap;pointer-events:none';document.body.appendChild(debugOverlay);}
function applyRendererResolution(){const limits=mobileSafeDefault?[1.0,1.1,1.25,1.5][quality]:[1.0,1.25,1.5,2.0][quality];if(mobileSafeDefault)mobileRenderScale=Math.min(mobileRenderScale,limits);renderer.setPixelRatio(Math.min(devicePixelRatio,mobileSafeDefault?Math.min(limits,mobileRenderScale):limits));renderer.setSize(innerWidth,innerHeight)}
const hemi=new THREE.HemisphereLight(0xdff6ff,0x5c6554,2.0);scene.add(hemi);const sun=new THREE.DirectionalLight(0xffedce,3.0);sun.position.set(-48,85,34);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-85;sun.shadow.camera.right=85;sun.shadow.camera.top=85;sun.shadow.camera.bottom=-85;sun.shadow.bias=-.0005;scene.add(sun);
const mat=(c,r=.85,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
// Small procedural detail maps are generated locally: no external downloads and safe fallbacks.
function makeDetailMap(seed,count,base=208){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d');if(!c)return null;c.fillStyle=`rgb(${base},${base},${base})`;c.fillRect(0,0,256,256);let state=seed>>>0;const rnd=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296};for(let i=0;i<count;i++){const v=Math.floor(115+rnd()*125),a=.08+rnd()*.34;c.fillStyle=`rgba(${v},${v},${v},${a})`;const x=rnd()*256,y=rnd()*256,w=.5+rnd()*2.5,h=.5+rnd()*2.5;c.fillRect(x,y,w,h)}const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),mobileSafeDefault?2:8);return t}
const asphaltDetail=makeDetailMap(431,6200,205),concreteDetail=makeDetailMap(982,4600,216),facadeDetail=makeDetailMap(713,3500,224);
// Restore coherent PBR response while preserving base colors and any valid embedded maps.
function styleImportedMaterial(source:THREE.Material,meshName:string,role:'character'|'vehicle',tint?:THREE.Color):THREE.Material{
 const copy=source.clone(),label=(meshName+' '+source.name).toLowerCase();
 if(!(copy instanceof THREE.MeshStandardMaterial))return copy;
 if(tint)copy.color.multiply(tint);
 if(role==='character'){
  copy.metalness=0;
  if(/skin|face|head|hand/i.test(label))copy.roughness=.74;
  else if(/hair|beard/i.test(label))copy.roughness=.9;
  else if(/shoe|boot/i.test(label))copy.roughness=.86;
  else {copy.roughness=.84}
 }else{
  if(/wheel|tire|rubber/i.test(label)){copy.roughness=.94;copy.metalness=0}
  else if(/glass|window|windshield/i.test(label)){copy.roughness=.24;copy.metalness=.12}
  else {copy.roughness=Math.min(copy.roughness||.7,.48);copy.metalness=Math.max(copy.metalness,.08)}
 }
 copy.needsUpdate=true;return copy;
}
const concrete=mat(0x929890,.92),asphalt=mat(0x30383c,.98),asphaltAlt=mat(0x353b3e,.96),curbMat=mat(0x858b86,.88),paint=mat(0xe4d7a0,.8),grass=mat(0x47684b),trunkMat=mat(0x65452e),leafMats=[mat(0x2d6545),mat(0x39744d),mat(0x477b4a)],glass=new THREE.MeshStandardMaterial({color:0x6aabb9,roughness:.28,metalness:.15,transparent:true,opacity:.38,depthWrite:false}),windowMats=[mat(0x8fc8d3,.28,.12),mat(0x3f606b,.32,.1),mat(0xd7b988,.4,.05)];
if(asphaltDetail){asphalt.map=asphaltDetail;asphaltAlt.map=asphaltDetail;asphalt.needsUpdate=asphaltAlt.needsUpdate=true}
if(concreteDetail){concrete.map=concreteDetail;curbMat.map=concreteDetail;concrete.needsUpdate=curbMat.needsUpdate=true}
const windowBuckets=new Map(),windowGeometry=new THREE.BoxGeometry(.56,.88,.055),windowDummy=new THREE.Object3D(),WINDOW_CHUNK_SIZE=60;
function queueWindow(index,x,y,z,rotation=0){const cx=Math.floor(x/WINDOW_CHUNK_SIZE),cz=Math.floor(z/WINDOW_CHUNK_SIZE),key=index+':'+cx+':'+cz;let bucket=windowBuckets.get(key);if(!bucket){bucket={material:windowMats[index],matrices:[],cullX:(cx+.5)*WINDOW_CHUNK_SIZE,cullZ:(cz+.5)*WINDOW_CHUNK_SIZE};windowBuckets.set(key,bucket)}windowDummy.position.set(x,y,z);windowDummy.rotation.set(0,rotation,0);windowDummy.scale.set(1,1,1);windowDummy.updateMatrix();bucket.matrices.push(windowDummy.matrix.clone())}
const roadMarkMaterial=mat(0xb8b7a7),roadMarkGeometry=new THREE.BoxGeometry(.12,.14,2.5),roadMarkMatrices=[],roadMarkDummy=new THREE.Object3D();
function queueRoadMark(x,y,z,rotation=0){roadMarkDummy.position.set(x,y,z);roadMarkDummy.rotation.set(0,rotation,0);roadMarkDummy.scale.set(1,1,1);roadMarkDummy.updateMatrix();roadMarkMatrices.push(roadMarkDummy.matrix.clone())}
const CITY_BLOCKS=32,CITY_HALF=CITY_BLOCKS/2,CITY_EXTENT=CITY_BLOCKS*20;const ground=new THREE.Mesh(new THREE.PlaneGeometry(CITY_EXTENT+40,CITY_EXTENT+40),mat(0x697a68));ground.rotation.x=-Math.PI/2;ground.position.y=-.13;ground.receiveShadow=true;scene.add(ground);
const buildings=[],pedestrians=[],vehicles=[],solid=[],windowMeshes=[],streetBulbs=[],carLamps=[],cameraBlockers=[],cityStaticMeshes=[],doors=[],worldObjects=[],interiorMeshes=[],importedBuildingCandidates=[],landmarkLabels=[];let interiorMode=false,currentInteriorDoorIndex=-1,importedBuildingCount=0;
let phase10StaticBatchStats={eligibleSourceMeshes:0,batchedSourceMeshes:0,batchesCreated:0,instanceCount:0,estimatedDrawCallsSaved:0};
const SPATIAL_CELL_SIZE=20,staticCollisionGrid=new Map<string,typeof solid>(),cameraBlockerGrid=new Map<string,THREE.Object3D[]>();let spatialGridReady=false,staticCollisionCandidateChecks=0,staticCollisionQueryCount=0,cameraRayCandidateChecks=0,cameraRayQueryCount=0;const nearbyCameraBlockerBuffer:THREE.Object3D[]=[];
const spatialKey=(x:number,z:number)=>Math.floor(x/SPATIAL_CELL_SIZE)+':'+Math.floor(z/SPATIAL_CELL_SIZE);
function buildWorldSpatialGrids(){staticCollisionGrid.clear();cameraBlockerGrid.clear();for(const b of solid){const key=spatialKey(b.x,b.z);let bucket=staticCollisionGrid.get(key);if(!bucket){bucket=[];staticCollisionGrid.set(key,bucket)}bucket.push(b)}for(const object of cameraBlockers){const key=spatialKey(object.position.x,object.position.z);let bucket=cameraBlockerGrid.get(key);if(!bucket){bucket=[];cameraBlockerGrid.set(key,bucket)}bucket.push(object)}spatialGridReady=true;let maxCell=0;for(const items of staticCollisionGrid.values())maxCell=Math.max(maxCell,items.length);console.info('REALCITY Phase 10 spatial grids:',JSON.stringify({solidBuildings:solid.length,collisionCells:staticCollisionGrid.size,cameraBlockerCells:cameraBlockerGrid.size,maxBuildingsPerCell:maxCell}))}
function staticCollisionQuery(x:number,z:number,halfX:number,halfZ:number,hit:(b:typeof solid[number])=>boolean){staticCollisionQueryCount++;if(!spatialGridReady){for(const b of solid){staticCollisionCandidateChecks++;if(hit(b))return true}return false}const padX=halfX+6.5,padZ=halfZ+6.5,minX=Math.floor((x-padX)/SPATIAL_CELL_SIZE),maxX=Math.floor((x+padX)/SPATIAL_CELL_SIZE),minZ=Math.floor((z-padZ)/SPATIAL_CELL_SIZE),maxZ=Math.floor((z+padZ)/SPATIAL_CELL_SIZE);for(let gz=minZ;gz<=maxZ;gz++)for(let gx=minX;gx<=maxX;gx++){const bucket=staticCollisionGrid.get(gx+':'+gz);if(!bucket)continue;for(const b of bucket){staticCollisionCandidateChecks++;if(hit(b))return true}}return false}
function nearbyCameraBlockers(x:number,z:number,reach:number){const out=nearbyCameraBlockerBuffer;out.length=0;cameraRayQueryCount++;if(!spatialGridReady)return cameraBlockers;const minX=Math.floor((x-reach)/SPATIAL_CELL_SIZE),maxX=Math.floor((x+reach)/SPATIAL_CELL_SIZE),minZ=Math.floor((z-reach)/SPATIAL_CELL_SIZE),maxZ=Math.floor((z+reach)/SPATIAL_CELL_SIZE),reachSq=reach*reach;for(let gz=minZ;gz<=maxZ;gz++)for(let gx=minX;gx<=maxX;gx++){const bucket=cameraBlockerGrid.get(gx+':'+gz);if(!bucket)continue;for(const object of bucket){cameraRayCandidateChecks++;const dx=object.position.x-x,dz=object.position.z-z;if(dx*dx+dz*dz<=reachSq)out.push(object)}}return out}
function rayBoxHitDistance(origin:THREE.Vector3,direction:THREE.Vector3,object:THREE.Object3D,maxDistance:number,nearDistance=.25){const mesh=object as THREE.Mesh;if(!(mesh.geometry instanceof THREE.BoxGeometry))return Infinity;const p=mesh.geometry.parameters,minX=mesh.position.x-p.width/2,maxX=mesh.position.x+p.width/2,minY=mesh.position.y-p.height/2,maxY=mesh.position.y+p.height/2,minZ=mesh.position.z-p.depth/2,maxZ=mesh.position.z+p.depth/2;let entry=-Infinity,exit=Infinity;let a:number,b:number;if(Math.abs(direction.x)<1e-8){if(origin.x<minX||origin.x>maxX)return Infinity}else{a=(minX-origin.x)/direction.x;b=(maxX-origin.x)/direction.x;if(a>b){const t=a;a=b;b=t}entry=Math.max(entry,a);exit=Math.min(exit,b);if(exit<entry)return Infinity}if(Math.abs(direction.y)<1e-8){if(origin.y<minY||origin.y>maxY)return Infinity}else{a=(minY-origin.y)/direction.y;b=(maxY-origin.y)/direction.y;if(a>b){const t=a;a=b;b=t}entry=Math.max(entry,a);exit=Math.min(exit,b);if(exit<entry)return Infinity}if(Math.abs(direction.z)<1e-8){if(origin.z<minZ||origin.z>maxZ)return Infinity}else{a=(minZ-origin.z)/direction.z;b=(maxZ-origin.z)/direction.z;if(a>b){const t=a;a=b;b=t}entry=Math.max(entry,a);exit=Math.min(exit,b);if(exit<entry)return Infinity}const distance=entry>=nearDistance?entry:exit;return distance>=nearDistance&&distance<=maxDistance?distance:Infinity}
const boxGeometryCache=new Map();function box(w,h,d,m,x,y,z,cast=false,receive=true){const key=w+','+h+','+d;let geometry=boxGeometryCache.get(key);if(!geometry){geometry=new THREE.BoxGeometry(w,h,d);boxGeometryCache.set(key,geometry)}const o=new THREE.Mesh(geometry,m);o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=receive;o.userData.cityStatic=true;if(w>80||d>80)o.userData.alwaysVisible=true;scene.add(o);cityStaticMeshes.push(o);return o}
function addSolid(x,z,w,d,h=12){solid.push({x,z,w,d,h})}
function randFactory(){let s=17031;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}const rand=randFactory();
async function loadImportedBuildingAssets(){
 if(!importedBuildingCandidates.length)return;
 const loader=new GLTFLoader();
 const urls=['/models/realcity-building-d.glb','/models/realcity-building-e.glb','/models/realcity-building-n.glb'];
 const loadModel=(url)=>new Promise<THREE.Group>((resolve,reject)=>loader.load(url,gltf=>resolve(gltf.scene),undefined,reject));
 const templates=await Promise.all(urls.map(loadModel));
 for(let i=0;i<importedBuildingCandidates.length;i++){
  const candidate=importedBuildingCandidates[i],root=templates[candidate.variant%templates.length].clone(true);
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  if(size.x<=0||size.y<=0||size.z<=0)throw new Error('Imported building has invalid bounds');
  const sx=candidate.w/size.x,sy=candidate.h/size.y,sz=candidate.d/size.z;
  root.scale.set(sx,sy,sz);
  root.position.set(candidate.x-center.x*sx,-bounds.min.y*sy,candidate.z-center.z*sz);
  root.userData.cityStatic=true;root.userData.cullX=candidate.x;root.userData.cullZ=candidate.z;root.userData.importedEnvironmentAsset=true;
  root.traverse(object=>{if((object as THREE.Mesh).isMesh){const mesh=object as THREE.Mesh;mesh.castShadow=quality>=3;mesh.receiveShadow=quality>=2;mesh.userData.importedEnvironmentAssetMesh=true;mesh.frustumCulled=true}});
  scene.add(root);cityStaticMeshes.push(root);candidate.mesh.visible=false;candidate.mesh.userData.cityStatic=false;importedBuildingCount++;
 }
 console.info('REALCITY imported CC0 building assets:',importedBuildingCount);
}
loadfill.style.width='10%';loadnote.textContent='Building road network…';
for(let k=-CITY_HALF;k<=CITY_HALF;k++){let p=k*20,roadMat=(k%2===0?asphalt:asphaltAlt),roadSpan=CITY_EXTENT+40;box(9,.12,roadSpan,roadMat,p,-.015,0);box(roadSpan,.12,9,roadMat,0,-.015,p);for(const side of [-1,1]){box(.48,.13,roadSpan,concrete,p+side*4.76,.01,0);box(roadSpan,.13,.48,concrete,0,.01,p+side*4.76);box(.10,.17,roadSpan,curbMat,p+side*4.98,.025,0);box(roadSpan,.17,.10,curbMat,0,.025,p+side*4.98)}box(.12,.14,roadSpan,paint,p-3.1,.02,0);box(roadSpan,.14,.12,paint,0,.02,p-3.1);
for(let t=-CITY_EXTENT/2;t<CITY_EXTENT/2;t+=8){queueRoadMark(p,.02,t,0);queueRoadMark(t,.02,p,Math.PI/2)}if(k%2===0)await yieldFrame()}
const roadMarks=new THREE.InstancedMesh(roadMarkGeometry,roadMarkMaterial,roadMarkMatrices.length);for(let i=0;i<roadMarkMatrices.length;i++)roadMarks.setMatrixAt(i,roadMarkMatrices[i]);roadMarks.instanceMatrix.needsUpdate=true;roadMarks.userData.cityStatic=true;roadMarks.userData.alwaysVisible=true;scene.add(roadMarks);cityStaticMeshes.push(roadMarks);
loadfill.style.width='25%';loadnote.textContent='Creating city blocks and buildings…';
const districtPalettes={Downtown:[0x6d7d87,0x8999a1,0x64717d,0xadb8bd],Market:[0xb78b63,0xc2a17b,0x8f9d91,0xc7b99b],Residential:[0xb3afa2,0xc7c1b3,0x9eaa9d,0xb2b9b5],Civic:[0x9eafad,0xd0cbbd,0x879a9a,0xbac6c2],Industrial:[0x707a7c,0x8b887d,0x9a826c,0x656e70],Luxury:[0xc9c3b2,0xd9d0bc,0x8a9d91,0xc0b8a8],Parks:[0x8d9c83,0xa2ad91,0x778d7a,0xb5b79d],Suburbs:[0xb7a994,0xd0c5b1,0x9caa9c,0xc1b6a5]};
const generatedDistricts=new Set<string>();
function districtFor(gx,gz){if(Math.abs(gx)<=1&&Math.abs(gz)<=1)return 'Downtown';if(gx>=2&&Math.abs(gz)<=5)return 'Market';if(gx<=-2&&Math.abs(gz)<=5)return 'Residential';if(gz<=-6&&gx>=-5&&gx<=5)return 'Civic';if(gz>=6&&gx>=-5&&gx<=5)return 'Industrial';if(gx>=6&&gz< -5)return 'Luxury';if(gx<=-6&&gz< -5)return 'Parks';if(gx>=6&&gz>5)return 'Suburbs';return 'Residential'}
const foliageCrownGeometry=new THREE.IcosahedronGeometry(1,1),flowerGeometry=new THREE.SphereGeometry(.13,7,5),foliageTrunkGeometry=new THREE.BoxGeometry(1,1,1),flowerMats=[mat(0xd95b72),mat(0xf2c94c),mat(0xf4eee0),mat(0xc75c9b)];
const foliageInstanceBuckets=new Map<string,{kind:'trunk'|'crown'|'flower';geometry:THREE.BufferGeometry;material:THREE.Material;matrices:THREE.Matrix4[];cullX:number;cullZ:number}>();
const foliageDummy=new THREE.Object3D();
function queueFoliage(kind:'trunk'|'crown'|'flower',materialIndex:number,x:number,y:number,z:number,sx:number,sy:number,sz:number){
 const chunkSize=80,chunkX=Math.floor((x+CITY_EXTENT/2)/chunkSize),chunkZ=Math.floor((z+CITY_EXTENT/2)/chunkSize),key=kind+':'+materialIndex+':'+chunkX+':'+chunkZ;
 let bucket=foliageInstanceBuckets.get(key);
 if(!bucket){const material=kind==='trunk'?trunkMat:kind==='crown'?leafMats[materialIndex]:flowerMats[materialIndex],geometry=kind==='trunk'?foliageTrunkGeometry:kind==='crown'?foliageCrownGeometry:flowerGeometry;bucket={kind,geometry,material,matrices:[],cullX:-CITY_EXTENT/2+(chunkX+.5)*chunkSize,cullZ:-CITY_EXTENT/2+(chunkZ+.5)*chunkSize};foliageInstanceBuckets.set(key,bucket)}
 foliageDummy.position.set(x,y,z);foliageDummy.rotation.set(0,0,0);foliageDummy.scale.set(sx,sy,sz);foliageDummy.updateMatrix();bucket.matrices.push(foliageDummy.matrix.clone())
}
function flushFoliageInstances(){
 for(const bucket of foliageInstanceBuckets.values()){const inst=new THREE.InstancedMesh(bucket.geometry,bucket.material,bucket.matrices.length);for(let i=0;i<bucket.matrices.length;i++)inst.setMatrixAt(i,bucket.matrices[i]);inst.instanceMatrix.needsUpdate=true;inst.castShadow=bucket.kind==='crown';inst.receiveShadow=false;inst.userData.cityStatic=true;inst.userData.cullX=bucket.cullX;inst.userData.cullZ=bucket.cullZ;inst.userData.cullPadding=57;inst.userData.foliageKind=bucket.kind;scene.add(inst);cityStaticMeshes.push(inst)}
}
const landmarkSpecs=[[-2,-8,'POLICE',0x3f78a5],[0,-8,'HOSPITAL',0xd8e3df],[2,-8,'FIRE',0xb84d40],[-10,2,'SCHOOL',0xd8b45e],[10,2,'FUEL',0x38a8a0],[10,0,'MARKET',0xc58d54],[10,-10,'VILLAS',0x8b9e78]] as const;
for(let gx=-CITY_HALF;gx<CITY_HALF;gx++){for(let gz=-CITY_HALF;gz<CITY_HALF;gz++){const cx=gx*20+10,cz=gz*20+10,district=districtFor(gx,gz);generatedDistricts.add(district);const landmarkSpec=landmarkSpecs.find(v=>v[0]===gx&&v[1]===gz);
if(!landmarkSpec&&rand()<(district==='Parks' ? .72 : .19)){box(10,.18,10,grass,cx,.03,cz);for(let t=0;t<4;t++){let x=cx+(rand()-.5)*7,z=cz+(rand()-.5)*7;queueFoliage('trunk',0,x,.7,z,.32,1.25,.32);const crownScale=.95+rand()*.5;queueFoliage('crown',Math.floor(rand()*leafMats.length),x,1.9*crownScale,z,crownScale,crownScale,crownScale)}if(district==='Parks'){for(let f=0;f<7;f++){const fx=cx+(rand()-.5)*8,fz=cz+(rand()-.5)*8;queueFoliage('flower',Math.floor(rand()*flowerMats.length),fx,.22,fz,.75,1.25,.75)}}if(((gx+CITY_HALF)*CITY_BLOCKS+(gz+CITY_HALF))%16===0)await yieldFrame();continue}
const w=district==='Luxury'?8+rand()*2:district==='Parks'?4+rand()*2:5.5+rand()*3.2,d=district==='Luxury'?8+rand()*2:district==='Parks'?4+rand()*2:5.5+rand()*3.2,h=district==='Downtown'?20+rand()*27:district==='Industrial'?6+rand()*10:district==='Residential'?5+rand()*10:district==='Market'?9+rand()*15:district==='Luxury'?4+rand()*4:district==='Parks'?3+rand()*5:district==='Suburbs'?5+rand()*8:11+rand()*18,useImportedBuilding=((gx+CITY_HALF)*CITY_BLOCKS+(gz+CITY_HALF))%9===0&&h<=15,x=cx+(rand()-.5)*2.6,z=cz+(rand()-.5)*2.6;
const palette=districtPalettes[district],wall=mat(palette[Math.floor(rand()*palette.length)],.9);if(facadeDetail)wall.map=facadeDetail;const b=box(w,h,d,wall,x,h/2,z,true);b.receiveShadow=true;cameraBlockers.push(b);buildings.push({x,z,w,d,h});addSolid(x,z,w,d,h);
const landmark=landmarkSpec;if(landmark){landmarkLabels.push(landmark[2]);const sign=box(w*.72,.8,.12,mat(landmark[3],.72),x,h*.58,z+d/2+.13,true);box(w*.78,.09,.15,mat(0xf2f2e9),x,h*.58+.46,z+d/2+.14,true);if(landmark[2]==='HOSPITAL'){box(.18,1.05,.16,mat(0xf4f5ef),x,h*.58,z+d/2+.23,true);box(.72,.18,.16,mat(0xf4f5ef),x,h*.58,z+d/2+.23,true)}worldObjects.push({type:'landmark',name:landmark[2],x,z:z+d/2+2.5,buildingX:x,buildingZ:z,mesh:sign})}
if(useImportedBuilding){importedBuildingCandidates.push({mesh:b,x,z,w,d,h,variant:((gx+CITY_HALF)+(gz+CITY_HALF))%3})}else{box(w+.15,.22,d+.15,mat(0x40494a,.86),x,h+.08,z,true);
if(h>13&&rand()<.62){const unitMat=mat(0x697477,.82,.18);box(w*.22,.72,d*.24,unitMat,x-w*.18,h+.48,z-d*.12,true);box(w*.12,.42,d*.15,unitMat,x+w*.22,h+.33,z+d*.16,true)}
const floors=Math.max(2,Math.floor((h-1.8)/2.6));
for(let f=0;f<floors;f++){let yy=2+f*2.55;for(let xx=-w/2+.8;xx<w/2-.25;xx+=1.35){queueWindow(Math.floor(rand()*windowMats.length),x+xx,yy,z+d/2+.035,0)}
for(let zz=-d/2+.8;zz<d/2-.25;zz+=1.35){for(let side of [-1,1])queueWindow(Math.floor(rand()*windowMats.length),x+side*(w/2+.035),yy,z+zz,side===1?Math.PI/2:-Math.PI/2)}}
if(rand()<.78){box(w*.68,1.4,.1,mat(0x334e51),x,1.1,z+d/2+.08);box(w*.42,.09,.12,mat(0x6dd8c5),x,1.82,z+d/2+.14);for(let q=-1;q<=1;q++)box(.05,.72,.14,mat(0xb5b7ae),x+q*w*.16,1.1,z+d/2+.16)}
if(((gx+CITY_HALF)*CITY_BLOCKS+(gz+CITY_HALF))%4===0){const doorPanel=box(1.02,1.9,.075,mat(0x273d42),x,1.02,z+d/2+.23,true);box(.11,2.08,.12,mat(0x87999a),x-.57,1.04,z+d/2+.22,true);box(.11,2.08,.12,mat(0x87999a),x+.57,1.04,z+d/2+.22,true);box(1.25,.12,.12,mat(0x70d9c4),x,2.12,z+d/2+.22,true);doors.push({x,z:z+d/2+1.12,outsideX:x,outsideZ:z+d/2+1.12,district,mesh:doorPanel})}}if(((gx+CITY_HALF)*CITY_BLOCKS+(gz+CITY_HALF))%16===0){loadfill.style.width=(25+Math.round(((gx+CITY_HALF)*CITY_BLOCKS+(gz+CITY_HALF))/(CITY_BLOCKS*CITY_BLOCKS)*20))+'%';await yieldFrame()}}}

const marketService=worldObjects.find(o=>o.type==='landmark'&&o.name==='MARKET');
if(marketService){
 const addServiceMarker=(type,name,offset,color)=>{
  const sx=marketService.x+offset,sz=marketService.z+1.1;
  const board=box(2.35,.92,.14,mat(color,.66,.18),sx,1.65,sz,true);
  box(2.48,.12,.18,mat(0xe4e3d8,.72),sx,2.18,sz,true);
  box(.12,.7,.16,mat(0xd0d0c5,.68),sx-1.02,1.18,sz,true);
  box(.12,.7,.16,mat(0xd0d0c5,.68),sx+1.02,1.18,sz,true);
  worldObjects.push({type,name,x:sx,z:sz+1.35,mesh:board});
 };
 addServiceMarker('dealership','AUTO DEALER',5.4,0x347f9d);
 addServiceMarker('gearStore','GEAR & PROP SHOP',-5.4,0x8b6847);
}
await loadImportedBuildingAssets();
buildWorldSpatialGrids();
flushFoliageInstances();
loadfill.style.width='68%';loadnote.textContent='Finishing city collision data…';await yieldFrame();
for(const bucket of windowBuckets.values()){if(!bucket.matrices.length)continue;const inst=new THREE.InstancedMesh(windowGeometry,bucket.material,bucket.matrices.length);for(let i=0;i<bucket.matrices.length;i++)inst.setMatrixAt(i,bucket.matrices[i]);inst.instanceMatrix.needsUpdate=true;inst.userData.cityStatic=true;inst.userData.cullX=bucket.cullX;inst.userData.cullZ=bucket.cullZ;scene.add(inst);cityStaticMeshes.push(inst);windowMeshes.push(inst)}
loadfill.style.width='45%';loadnote.textContent='Adding trees, street furniture and lighting…';
for(let k=-CITY_HALF;k<=CITY_HALF;k++){for(let n=-CITY_HALF;n<=CITY_HALF;n++){const x=k*20+5,z=n*20+5;if((k+n)%2===0){box(.15,3.8,.15,mat(0x364346),x,1.9,z,true);const bulb=box(.95,.14,.36,mat(0xfbe5b0),x,3.76,z);bulb.material.emissive.setHex(0xffc96b);bulb.material.emissiveIntensity=.08;streetBulbs.push(bulb);box(.08,.5,.08,mat(0x303d40),x+.38,3.55,z,true)}}if(k%2===0){loadfill.style.width=(47+Math.round((k+CITY_HALF)/(CITY_BLOCKS)*12))+'%';loadnote.textContent='Adding street lighting…';await yieldFrame()}}
// Extra street life across the expanded map: crosswalks, parking bays, benches, bus shelters, bins and rooftop equipment
const stripeMat=mat(0xe6e5d9),metalMat=mat(0x424f52),woodMat=mat(0x80664c),signMat=mat(0x1c5555);
for(let k=-CITY_HALF+1;k<CITY_HALF;k+=2){const p=k*20;
 for(let i=0;i<7;i++){const q=-4.2+i*1.25;box(.72,.145,.18,stripeMat,p+q,.055,p+5.7);box(.18,.145,.72,stripeMat,p+5.7,.055,p+q)}
 for(let i=0;i<5;i++){const q=-3.8+i*1.6;box(1.25,.14,.10,paint,p+q,.05,p-6.6);box(.10,.14,1.25,paint,p-6.6,.05,p+q)}
}
for(let i=0;i<Math.round(CITY_BLOCKS*CITY_BLOCKS*.24);i++){const x=(rand()-.5)*(CITY_EXTENT-20),z=(rand()-.5)*(CITY_EXTENT-20);
 if(Math.abs((x/20)-Math.round(x/20))<.23||Math.abs((z/20)-Math.round(z/20))<.23)continue;
 if(i%3===0){box(1.55,.12,.42,woodMat,x,.55,z,true);for(const dx of [-.55,.55])box(.10,.52,.10,metalMat,x+dx,.28,z,true);for(const zz of [-.15,.15])box(1.55,.06,.06,woodMat,x,.82,z+zz)}
 else if(i%3===1){box(.48,.85,.48,metalMat,x,.43,z,true);box(.52,.09,.52,mat(0x5f7778),x,.88,z)}
 else {box(1.5,2.3,.16,metalMat,x,1.15,z,true);box(1.35,.78,.08,signMat,x,1.5,z+.11);box(.12,.7,.12,mat(0xd6b66b),x-.5,1.5,z+.17)}
}
for(let i=0;i<Math.round(CITY_BLOCKS*CITY_BLOCKS*.20);i++){const x=(rand()-.5)*(CITY_EXTENT-25),z=(rand()-.5)*(CITY_EXTENT-25);if(blocked(x,z,2))continue;const post=box(.12,1.2,.12,metalMat,x,.6,z,true);box(.45,.16,.42,mat(0x8ca7a6),x,1.22,z)}
function addCityKiosk(x,z){const shell=box(.72,1.42,.58,mat(0x343b3b,.72,.12),x,.71,z,true),screen=box(.48,.58,.055,mat(0x8da8a1,.58,.02),x,.94,z+.32,true);box(.78,.1,.64,mat(0x6b716c,.82),x,1.47,z,true);worldObjects.push({type:'kiosk',x,z,mesh:shell,screen})}
for(const [x,z] of [[-4.2,-120],[-4.2,-80],[-4.2,-40],[-4.2,0],[-4.2,40],[-4.2,80],[4.2,120]])addCityKiosk(x,z);
function interiorBox(w,h,d,m,x,y,z){const o=box(w,h,d,m,x,y,z,true);o.userData.cityStatic=false;o.userData.interior=true;o.visible=false;interiorMeshes.push(o);return o}
const roomX=500,roomZ=500;
interiorBox(10,.18,10,mat(0x656e68),roomX,-.1,roomZ);
interiorBox(.18,3.3,10,mat(0xd1c8b8),roomX-4.95,1.55,roomZ);interiorBox(.18,3.3,10,mat(0xd1c8b8),roomX+4.95,1.55,roomZ);
interiorBox(10,3.3,.18,mat(0xc8c0b2),roomX,1.55,roomZ-4.95);interiorBox(10,3.3,.18,mat(0xc8c0b2),roomX,1.55,roomZ+4.95);
interiorBox(2.8,.12,1.5,mat(0x6e5946),roomX-1.6,.65,roomZ-1.5);interiorBox(2.8,.72,.18,mat(0x8a735d),roomX-1.6,1.05,roomZ-2.12);
interiorBox(1.8,.82,.8,mat(0x477b78),roomX+2.3,.41,roomZ-1.6);interiorBox(.7,1.7,.7,mat(0x6a8e6b),roomX+3.3,.85,roomZ+2.5);
interiorBox(2.2,1.8,.16,mat(0x374d55),roomX,1.15,roomZ-4.72);interiorBox(1.4,1.1,.08,mat(0x6bd9c6),roomX,1.3,roomZ-4.61);interiorBox(1.4,.08,.08,mat(0xb9d3cf),roomX,1.9,roomZ-4.6);
const interiorThemeMeshes=new Map<string,THREE.Object3D[]>();let activeInteriorTheme='residential';
function themeBox(theme:string,w:number,h:number,d:number,color:number,x:number,y:number,z:number){const mesh=interiorBox(w,h,d,mat(color,.82),x,y,z);mesh.userData.interiorTheme=theme;mesh.visible=false;const list=interiorThemeMeshes.get(theme)||[];list.push(mesh);interiorThemeMeshes.set(theme,list);return mesh}
function buildInteriorThemes(){
 for(const x of [-2.8,2.8]){themeBox('hospital',1.45,.28,2.25,0xe8ece8,roomX+x,.42,roomZ+1.1);themeBox('hospital',1.5,.12,2.3,0x8db6b0,roomX+x,.61,roomZ+1.1);themeBox('hospital',.72,.62,.22,0x4c6970,roomX+x,1.1,roomZ-.35)}
 themeBox('hospital',3.4,.92,.72,0x7e9e98,roomX,.46,roomZ-2.8);
 for(const z of [-2.8,-.8,1.2])for(const x of [-4.05,4.05]){themeBox('market',.42,1.8,1.55,0x8b6847,roomX+x,.9,roomZ+z);for(const y of [.55,1.08,1.6])themeBox('market',.5,.07,1.52,0xd3b78b,roomX+x,y,roomZ+z)}
 themeBox('market',2.6,.95,.78,0x77543c,roomX,.48,roomZ+3.35);
 themeBox('police',3.6,1,.75,0x354c59,roomX,.5,roomZ-2.9);for(const x of [-3.3,-1.1,1.1,3.3])themeBox('police',.8,1.35,.12,0x52616a,roomX+x,1.05,roomZ+3.9);
 for(const x of [-3.4,-1.15,1.15,3.4])themeBox('fire',.85,2,.62,0xb34b3d,roomX+x,1,roomZ+3.9);themeBox('fire',3.2,.9,.72,0x4b5960,roomX,.45,roomZ-2.8);
 for(const x of [-2.8,0,2.8])for(const z of [-1.8,1.2])themeBox('school',1.15,.12,.72,0x9b7651,roomX+x,.82,roomZ+z);themeBox('school',4,.1,.16,0x344f54,roomX,1.85,roomZ-4.65);
 themeBox('garage',3.5,.92,.82,0x59696b,roomX,.46,roomZ-2.8);for(const x of [-3.5,3.5])themeBox('garage',.8,1.8,.65,0x3f5056,roomX+x,.9,roomZ+2.8);
 themeBox('residential',2.7,.68,.82,0x6d8079,roomX-2.8,.38,roomZ+2.7);themeBox('residential',1.8,.86,.72,0x8b725a,roomX+2.6,.43,roomZ-2.8);
 themeBox('office',3.4,.82,.9,0x6a5748,roomX,.42,roomZ+2.7);for(const x of [-1.5,1.5])themeBox('office',.55,.85,.55,0x52616a,roomX+x,.43,roomZ+1.5);
}
buildInteriorThemes();
function resolveInteriorTheme(door:any){let nearest:any=null,nd=Infinity;for(const o of worldObjects){if(o.type!=='landmark')continue;const d=d2(door,o);if(d<nd){nearest=o;nd=d}}if(nearest&&nd<28){const map:Record<string,string>={HOSPITAL:'hospital',MARKET:'market',POLICE:'police',FIRE:'fire',SCHOOL:'school',FUEL:'garage',VILLAS:'residential'};return map[nearest.name]||'office'}return door.district==='Industrial'?'garage':door.district==='Market'?'market':door.district==='Residential'||door.district==='Suburbs'?'residential':'office'}
function setInteriorTheme(theme:string){activeInteriorTheme=interiorThemeMeshes.has(theme)?theme:'residential';for(const [name,items] of interiorThemeMeshes)for(const item of items)item.visible=interiorMode&&name===activeInteriorTheme}

function batchStaticCityBoxes(){
 // Instance immutable opaque boxes only when no collision, interaction, animation, or gameplay
 // system references the mesh. Equivalent separately-created PBR materials are safely coalesced.
 const protectedMeshes=new Set<THREE.Object3D>();
 for(const list of [cameraBlockers,streetBulbs,carLamps,windowMeshes,interiorMeshes])for(const mesh of list)protectedMeshes.add(mesh);
 for(const door of doors)if(door.mesh)protectedMeshes.add(door.mesh);
 for(const candidate of importedBuildingCandidates)if(candidate.mesh)protectedMeshes.add(candidate.mesh);
 for(const item of worldObjects)for(const value of Object.values(item))if(value&&typeof value==='object'&&(value as any).isObject3D)protectedMeshes.add(value as THREE.Object3D);
 const textureId=(t:THREE.Texture|null|undefined)=>t?t.uuid:'-';
 const materialSignature=(m:THREE.MeshStandardMaterial)=>[
  m.type,m.color.getHex(),m.roughness,m.metalness,m.emissive.getHex(),m.emissiveIntensity,
  m.opacity,m.transparent,m.side,m.blending,m.depthWrite,m.colorWrite,m.alphaTest,
  m.vertexColors,m.flatShading,m.wireframe,m.fog,m.toneMapped,
  textureId(m.map),textureId(m.alphaMap),textureId(m.aoMap),textureId(m.bumpMap),textureId(m.normalMap),
  textureId(m.displacementMap),textureId(m.emissiveMap),textureId(m.roughnessMap),textureId(m.metalnessMap),
  m.normalScale.x,m.normalScale.y,m.bumpScale,m.displacementScale,m.aoMapIntensity
 ].join('|');
 const buckets=new Map<string,{geometry:THREE.BufferGeometry;material:THREE.MeshStandardMaterial;castShadow:boolean;receiveShadow:boolean;alwaysVisible:boolean;chunkX:number;chunkZ:number;items:THREE.Mesh[]}>();
 let eligibleSourceMeshes=0;
 for(const object of cityStaticMeshes){
  if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||!(object.geometry instanceof THREE.BoxGeometry)||protectedMeshes.has(object)||object.userData.cityStatic!==true||object.renderOrder!==0)continue;
  if(Array.isArray(object.material)||!(object.material instanceof THREE.MeshStandardMaterial)||object.material.transparent)continue;
  eligibleSourceMeshes++;
  const material=object.material,alwaysVisible=!!object.userData.alwaysVisible;
  const chunkX=alwaysVisible?0:Math.floor((object.position.x+CITY_EXTENT/2)/80);
  const chunkZ=alwaysVisible?0:Math.floor((object.position.z+CITY_EXTENT/2)/80);
  const key=[object.geometry.uuid,materialSignature(material),Number(object.castShadow),Number(object.receiveShadow),alwaysVisible?'global':chunkX+':'+chunkZ].join('::');
  let bucket=buckets.get(key);
  if(!bucket){bucket={geometry:object.geometry,material,castShadow:object.castShadow,receiveShadow:object.receiveShadow,alwaysVisible,chunkX,chunkZ,items:[]};buckets.set(key,bucket)}
  bucket.items.push(object);
 }
 const removed=new Set<THREE.Object3D>(),oldMaterials=new Set<THREE.Material>(),newBatches:THREE.InstancedMesh[]=[];
 let sourceMeshesBatched=0;
 for(const bucket of buckets.values()){
  if(bucket.items.length<2)continue;
  const instanced=new THREE.InstancedMesh(bucket.geometry,bucket.material,bucket.items.length);
  instanced.name='REALCITY Phase 10 static batch';
  instanced.castShadow=bucket.castShadow;instanced.receiveShadow=bucket.receiveShadow;
  instanced.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  for(let i=0;i<bucket.items.length;i++){
   const source=bucket.items[i];source.updateMatrixWorld(true);
   instanced.setMatrixAt(i,source.matrixWorld);removed.add(source);oldMaterials.add(source.material as THREE.Material);
  }
  instanced.instanceMatrix.needsUpdate=true;
  instanced.userData.cityStatic=true;instanced.userData.phase10StaticBatch=true;instanced.userData.phase10InstanceCount=bucket.items.length;
  if(bucket.alwaysVisible)instanced.userData.alwaysVisible=true;
  else{instanced.userData.cullX=-CITY_EXTENT/2+(bucket.chunkX+.5)*80;instanced.userData.cullZ=-CITY_EXTENT/2+(bucket.chunkZ+.5)*80;instanced.userData.cullPadding=57}
  instanced.computeBoundingBox();instanced.computeBoundingSphere();scene.add(instanced);newBatches.push(instanced);
  sourceMeshesBatched+=bucket.items.length;
 }
 for(const mesh of removed)scene.remove(mesh);
 cityStaticMeshes.splice(0,cityStaticMeshes.length,...cityStaticMeshes.filter(mesh=>!removed.has(mesh)),...newBatches);
 const activeMaterials=new Set<THREE.Material>();
 scene.traverse(object=>{const renderable=object as THREE.Mesh;if(!renderable.isMesh)return;const values=Array.isArray(renderable.material)?renderable.material:[renderable.material];for(const material of values)if(material)activeMaterials.add(material)});
 for(const material of oldMaterials)if(!activeMaterials.has(material))material.dispose();
 phase10StaticBatchStats={eligibleSourceMeshes,batchedSourceMeshes:sourceMeshesBatched,batchesCreated:newBatches.length,instanceCount:sourceMeshesBatched,estimatedDrawCallsSaved:sourceMeshesBatched-newBatches.length};
 console.info('REALCITY Phase 10 static instancing:',JSON.stringify(phase10StaticBatchStats));
}
batchStaticCityBoxes();
// The core city generator below already creates buildings, facades, road markings, street furniture and trees.
// Do not overlay a second independent building grid here: it caused overlapping structures and mismatched collision footprints.
const primitiveGeometryCache=new Map();function reusePrimitiveGeometry(geometry){const key=geometry.type+':'+JSON.stringify(geometry.parameters||{});const cached=primitiveGeometryCache.get(key);if(cached){geometry.dispose();return cached}primitiveGeometryCache.set(key,geometry);return geometry}
function person(color){
 // Procedural human fallback: shaped torso, layered facial features, fitted clothing and articulated hand geometry.
 // This is an in-project model, not a downloaded/licensed AAA asset; keep it compatible with the existing gait controller.
 const g=new THREE.Group(),shirt=mat(color,.78),pants=mat(0x263440,.88),skin=mat(0xd6a77f,.88),shoe=mat(0x20262a,.76),hairMat=mat(0x30251f,.94),seamMat=mat(0x202b30,.9);
 const addMesh=(parent,geometry,material,x,y,z,sx=1,sy=1,sz=1,cast=true)=>{geometry=reusePrimitiveGeometry(geometry);const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m};
 // Torso layers give a clearer shoulder/chest-to-waist silhouette than a single capsule.
 const torso=addMesh(g,new THREE.CapsuleGeometry(.255,.48,5,12),shirt,0,1.13,0,1.02,1,.88);
 addMesh(g,new THREE.SphereGeometry(1,14,10),shirt,0,1.34,0,.32,.19,.205);
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
 const legs=[],knees=[],feet=[],arms=[],elbows=[],hands=[];
 for(let i=0;i<2;i++){
   const side=i===0?1:-1,hip=new THREE.Group();hip.position.set(side*.125,.81,0);g.add(hip);
   addMesh(hip,new THREE.CapsuleGeometry(.105,.31,4,8),pants,0,-.205,0,1,1,.98);
   const knee=new THREE.Group();knee.position.set(0,-.405,0);hip.add(knee);
   addMesh(knee,new THREE.SphereGeometry(1,12,9),pants,0,0,.005,.082,.09,.082);
   addMesh(knee,new THREE.CapsuleGeometry(.073,.29,4,8),pants,0,-.085,.008,1,1,.96);
   addMesh(knee,new THREE.CylinderGeometry(.078,.075,.045,10),seamMat,0,-.215,.012);
   // A separate foot pivot lets the toe lift during swing and settle near foot contact.
   const foot=new THREE.Group();foot.position.set(0,-.27,.07);knee.add(foot);
   addMesh(foot,new THREE.SphereGeometry(1,12,9),shoe,0,0,0,.09,.07,.16);
   addMesh(foot,new THREE.BoxGeometry(.18,.035,.29),mat(0x101619,.95),0,-.041,-.005);
   feet.push(foot);knees.push(knee);legs.push(hip);
   const arm=new THREE.Group();arm.position.set(side*.285,1.355,0);g.add(arm);
   addMesh(arm,new THREE.SphereGeometry(1,12,10),shirt,side*.008,-.045,0,.105,.12,.11);
   addMesh(arm,new THREE.CapsuleGeometry(.071,.245,4,8),shirt,0,-.185,0,1,1,.98);
   const elbowPivot=new THREE.Group();elbowPivot.position.set(0,-.33,.006);arm.add(elbowPivot);
   addMesh(elbowPivot,new THREE.SphereGeometry(1,12,9),shirt,0,0,0,.068,.075,.07);
   addMesh(elbowPivot,new THREE.CapsuleGeometry(.055,.23,4,8),skin,0,-.095,.008,1,1,.95);
   // Sleeve cuff, palm, fingers and thumb follow the elbow pivot as one forearm/hand chain.
   addMesh(elbowPivot,new THREE.CylinderGeometry(.063,.06,.055,10),shirt,0,-.01,.006);
   const palm=addMesh(elbowPivot,new THREE.SphereGeometry(1,14,10),skin,0,-.205,.019,.073,.087,.043);
   const fingerGroups=[];
   const fingerDefs=[{x:-.047,len:.078,r:.012},{x:-.019,len:.095,r:.013},{x:.011,len:.101,r:.013},{x:.039,len:.085,r:.011}];
   for(let fi=0;fi<fingerDefs.length;fi++){
     const fd=fingerDefs[fi],fg=new THREE.Group();fg.position.set(fd.x,-.255,.021);fg.rotation.z=(fd.x/.05)*-.08;elbowPivot.add(fg);
     addMesh(fg,new THREE.CapsuleGeometry(fd.r,fd.len*.52,3,6),skin,0,-fd.len*.28,0,1,1,.9);
     addMesh(fg,new THREE.SphereGeometry(fd.r*1.03,8,6),skin,0,-fd.len*.56,0);
     addMesh(fg,new THREE.CapsuleGeometry(fd.r*.78,fd.len*.30,3,6),skin,0,-fd.len*.72,.001,1,1,.9);
     fingerGroups.push(fg);
   }
   const thumb=new THREE.Group();thumb.position.set(side*.063,-.205,.029);thumb.rotation.z=side*-.72;elbowPivot.add(thumb);
   addMesh(thumb,new THREE.CapsuleGeometry(.014,.055,3,6),skin,side*.015,-.025,0,1,1,.9);
   addMesh(thumb,new THREE.SphereGeometry(.014,8,6),skin,side*.03,-.058,.002);
   addMesh(thumb,new THREE.CapsuleGeometry(.011,.04,3,6),skin,side*.035,-.079,.002,1,1,.9);
   fingerGroups.push(thumb);
   arms.push(arm);elbows.push(elbowPivot);hands.push({palm,fingers:fingerGroups,side});
 }
 // Backpack, shoulder seams, pocket and shoe accents add silhouette and fabric detail.
 addMesh(g,new THREE.BoxGeometry(.27,.37,.12),mat(0x384b49,.92),0,1.13,-.235);
 addMesh(g,new THREE.BoxGeometry(.11,.16,.018),mat(0x4d6260,.95),-.11,1.04,.205);
 addMesh(g,new THREE.BoxGeometry(.11,.16,.018),mat(0x4d6260,.95),.11,1.04,.205);
 g.userData={legs,knees,feet,arms,elbows,hands,torso,appearanceMaterials:{shirt,pants,skin,hair:hairMat},phase:rand()*7,speed:.28+rand()*.3,dir:rand()*Math.PI*2};
 return g
}
// Place pedestrians on walkable street-edge positions instead of arbitrary coordinates
// that can start inside buildings or far outside the camera's useful range.
function pedestrianWaypoint(maxDistance=150){
 for(let attempt=0;attempt<48;attempt++){
  const axis=rand()<.5?'x':'z',limit=Math.max(1,Math.min(6,Math.floor(maxDistance/20))),roadIndex=Math.floor(rand()*(limit*2+1))-limit;
  const offset=(rand()<.5?-1:1)*5.55,along=(rand()-.5)*2*maxDistance;
  const x=axis==='x'?roadIndex*20+offset:along,z=axis==='z'?roadIndex*20+offset:along;
  if(Math.hypot(x,z)<=maxDistance+6&&!blocked(x,z,.48))return{x,z};
 }
 // Safe fallback is bounded and retried by the normal obstruction recovery.
 return{x:Math.max(-150,Math.min(150,5.55)),z:0};
}
const requestedNpcCount=Number(new URLSearchParams(location.search).get('npcCount'));const allowedNpcCounts=[5,10,20,40];const pedestrianCount=new URLSearchParams(location.search).has('qa')&&allowedNpcCounts.includes(requestedNpcCount)?requestedNpcCount:(mobileSafeDefault?12:22);for(let i=0;i<pedestrianCount;i++){
 const p=person([0x278d82,0xb86d43,0x4e659a,0x925d7c,0x547b53,0xb8a052,0x687e8b][i%7]);
 const spawn=pedestrianWaypoint(i<4?24:150),goal=pedestrianWaypoint(150);
 p.position.set(spawn.x,0,spawn.z);p.userData.goalX=goal.x;p.userData.goalZ=goal.z;p.userData.pause=rand()*2;
 p.userData.brain=createPedestrianBrain(i,Math.floor(rand()*4294967295),goal,0);
 scene.add(p);pedestrians.push(p)
}
loadfill.style.width='65%';loadnote.textContent='Preparing player and vehicles…';
function car(color,x,z,rot=0,style='sedan'){
 const isSUV=style==='suv',isVan=style==='van',bodyWidth=isVan?2.02:isSUV?2:1.9,bodyLength=isVan?4.05:isSUV?3.9:3.75,cabinHeight=isVan?.78:isSUV?.72:.62;const g=new THREE.Group();g.userData.vehicleStyle=style;const bodyMat=new THREE.MeshPhysicalMaterial({color,roughness:.25,metalness:.34,clearcoat:.62,clearcoatRoughness:.24}),trim=mat(0x20282c,.62,.1),tire=mat(0x14191d,.96),rim=mat(0x9ca8ab,.24,.78),rubberTrim=mat(0x303638,.78,.05);
 const body=new THREE.Mesh(new THREE.BoxGeometry(bodyWidth,isSUV?.68:.58,bodyLength),bodyMat);body.position.y=isSUV?.78:.72;body.castShadow=true;g.add(body);
 const hood=new THREE.Mesh(new THREE.BoxGeometry(1.72,.20,1.05),bodyMat);hood.position.set(0,1.02,1.12);hood.castShadow=true;g.add(hood);
 const trunk=new THREE.Mesh(new THREE.BoxGeometry(1.68,.18,.78),bodyMat);trunk.position.set(0,.99,-1.35);g.add(trunk);
 const cabin=new THREE.Mesh(new THREE.BoxGeometry(isVan?1.55:isSUV?1.52:1.43,cabinHeight,isVan?2.15:isSUV?1.95:1.82),glass);cabin.position.set(0,isVan?1.42:isSUV?1.38:1.28,isVan?-.05:-.22);cabin.castShadow=true;g.add(cabin);
 const roof=new THREE.Mesh(new THREE.BoxGeometry(isVan?1.48:isSUV?1.36:1.27,.10,isVan?1.7:isSUV?1.45:1.12),bodyMat);roof.position.set(0,isVan?1.84:isSUV?1.78:1.61,isVan?-.05:-.26);g.add(roof);if(isSUV){for(const side of [-1,1]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.055,.06,1.5),trim);rail.position.set(side*.58,1.88,-.24);g.add(rail)}}if(isVan){const cargo=new THREE.Mesh(new THREE.BoxGeometry(1.5,.34,1.05),bodyMat);cargo.position.set(0,1.98,-1.12);g.add(cargo)}
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
 g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);g.userData.bodyMaterial=bodyMat;const v={g,speed:0,steer:0,health:100,upgrades:{engine:0,handling:0,tires:0},paintColor:color,trafficData:null,lastCollisionTime:-10};vehicles.push(v);return v
}
car(0xb9473e,5,17,.1);car(0x347f9d,-35,24,Math.PI/2,'suv');car(0xc3a64b,39,-23,-Math.PI/2,'van');
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
 const v=car(spec.color,spec.axis==='x'?spec.z:spec.lane,spec.axis==='z'?spec.z:spec.lane,spec.axis==='z'?(spec.dir>0?0:Math.PI):(spec.dir>0?Math.PI/2:-Math.PI/2),traffic.length%3===0?'suv':traffic.length%3===1?'van':'sedan');
 (v as any).traffic=true;(v as any).trafficData={axis:spec.axis,lane:spec.lane,dir:spec.dir,speed:3.2+rand()*2.1};traffic.push(v as any);
}
const player=person(0x20b7a5);let spawnX=Number.isFinite(saved.spawnX)?Math.max(-325,Math.min(325,saved.spawnX)):0,spawnZ=Number.isFinite(saved.spawnZ)?Math.max(-325,Math.min(325,saved.spawnZ)):23;if(saved.interior===true&&Number.isInteger(saved.interiorDoorIndex)&&doors[saved.interiorDoorIndex]){interiorMode=true;currentInteriorDoorIndex=saved.interiorDoorIndex;spawnX=roomX;spawnZ=roomZ;interiorMeshes.forEach(o=>o.visible=true);setInteriorTheme(resolveInteriorTheme(doors[currentInteriorDoorIndex]))}if(blocked(spawnX,spawnZ,.55)){spawnX=0;spawnZ=23}player.position.set(spawnX,0,spawnZ);scene.add(player);

let playerAssetStatus='Loading rigged human…',playerAssetLoadMs=0,playerFingerBoneCount=0,playerAssetLoadStarted=false;
const playerAssetStarted=performance.now();
function getFingerKind(name){const n=name.toLowerCase().replace(/[^a-z0-9]/g,'');if(n.includes('thumb'))return 'thumb';if(n.includes('index'))return 'index';if(n.includes('middle'))return 'middle';if(n.includes('ring'))return 'ring';if(n.includes('pinky')||n.includes('little'))return 'little';return null}
function getHandSide(name){const raw=name.toLowerCase(),n=raw.replace(/[^a-z0-9]/g,'');if(n.includes('left')||n.startsWith('lhand')||n.startsWith('lthumb')||n.startsWith('lindex')||n.startsWith('lmiddle')||n.startsWith('lring')||n.startsWith('lpinky')||n.startsWith('llittle')||/(?:^|[._ -])l(?:$|[._ -])/.test(raw)||/(?:^|[._ -])left(?:$|[._ -])/.test(raw))return 'left';if(n.includes('right')||n.startsWith('rhand')||n.startsWith('rthumb')||n.startsWith('rindex')||n.startsWith('rmiddle')||n.startsWith('rring')||n.startsWith('rpinky')||n.startsWith('rlittle')||/(?:^|[._ -])r(?:$|[._ -])/.test(raw)||/(?:^|[._ -])right(?:$|[._ -])/.test(raw))return 'right';return null}
function fingerPoseValue(pose){return ({relaxed:.08,open:0,curled:1.05,gripping:.82})[pose]??0}
function setPlayerFingerPose(pose='relaxed',side='both',finger='all'){
 const rig=player.userData.rig;if(!rig)return false;const amount=fingerPoseValue(pose);let changed=0;
 for(const item of rig.fingerBones){if(side!=='both'&&item.side!==side)continue;if(finger!=='all'&&item.kind!==finger)continue;
   const angle=amount*(item.segment===0?.62:item.segment===1?1:item.segment===2?.92:.45);
   item.bone.quaternion.copy(item.rest).multiply(new THREE.Quaternion().setFromAxisAngle(item.axis,angle));changed++;
 }
 return changed>0
}
function animateRiggedPlayer(gait,moving,time,dt,airborne=false,sprintingNow=false){
 const rig=player.userData.rig;if(!rig)return;
 if(airborne)jumpFrames++;
 // Some valid humanoid packs ship idle/walk/run but no jump clip. Keep jumping visibly animated instead of blending into idle.
 if(airborne&&!rig.animationActions.jump){
  if(rig.activeAction){rig.activeAction.stop();rig.activeAction=null}
  rig.activeActionName='jump';
  for(const item of rig.bodyBones){const b=item.bone;b.quaternion.copy(item.rest);let angle=0;
   if(item.kind==='leftLeg'||item.kind==='rightLeg')angle=-.38;
   else if(item.kind==='leftArm'||item.kind==='rightArm')angle=-.92;
   else if(item.kind==='leftForearm'||item.kind==='rightForearm')angle=-.35;
   else if(item.kind==='spine')angle=-.09;
   if(angle)b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(item.axis,angle));
  }
  for(const item of rig.fingerBones)item.bone.quaternion.copy(item.rest);
  return;
 }
 const desired=airborne&&rig.animationActions.jump?'jump':moving?(sprintingNow&&rig.animationActions.run?'run':rig.animationActions.walk?'walk':rig.animationActions.run?'run':null):(rig.animationActions.idle?'idle':null);
 const nextAction=desired?rig.animationActions[desired]:null;
 if(nextAction){
   if(rig.activeAction!==nextAction){
     nextAction.reset().play();
     if(rig.activeAction)rig.activeAction.crossFadeTo(nextAction,.18,false);
     rig.activeAction=nextAction;rig.activeActionName=desired;
   }
   if(desired==='jump'&&nextAction.isRunning()===false)nextAction.reset().play();
   rig.mixer?.update(dt);
   return;
 }
 if(rig.activeAction){rig.activeAction.stop();rig.activeAction=null;rig.activeActionName=null}
 for(const item of rig.bodyBones){const b=item.bone;b.quaternion.copy(item.rest);let angle=0;
   if(item.kind==='leftLeg')angle=gait*.9;else if(item.kind==='rightLeg')angle=-gait*.9;
   else if(item.kind==='leftArm')angle=-gait*.58;else if(item.kind==='rightArm')angle=gait*.58;
   else if(item.kind==='leftForearm')angle=-Math.max(0,gait)*.18;else if(item.kind==='rightForearm')angle=Math.max(0,gait)*.18;
   else if(item.kind==='spine')angle=Math.sin(time*2.4)*.018;
   if(angle)b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(item.axis,angle));
 }
 if(moving){for(const item of rig.fingerBones){const base=fingerPoseValue('relaxed'),wiggle=Math.sin(time*5+item.index*.8+(item.side==='left'?1:0))*.018;item.bone.quaternion.copy(item.rest).multiply(new THREE.Quaternion().setFromAxisAngle(item.axis,base+wiggle))}}
}
function installRiggedPlayer(gltf){
 const model=cloneSkeleton(gltf.scene);model.updateMatrixWorld(true);
 // Reject skeleton-only or unskinned GLBs before they replace the working procedural human.
 let skinnedMeshCount=0,renderableVertexCount=0,materialCount=0;
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const style=m=>styleImportedMaterial(m,o.name,'character');o.material=Array.isArray(o.material)?o.material.map(style):style(o.material)}if(o.isSkinnedMesh){skinnedMeshCount++;renderableVertexCount+=o.geometry?.attributes?.position?.count||0;const materials=Array.isArray(o.material)?o.material:[o.material];materialCount+=materials.filter(Boolean).length;}});
 if(skinnedMeshCount<1||renderableVertexCount<300||materialCount<1)throw new Error('Asset quality gate: no usable skinned character mesh; keeping animated human fallback');
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
 if(!Number.isFinite(size.y)||size.y<.25)throw new Error('Humanoid model has invalid bounds');
 const modelRoot=new THREE.Group(),scale=1.78/size.y;model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale;modelRoot.add(model);
 const bones=[];model.traverse(o=>{if(o.isBone)bones.push(o)});
 const fingerBones=[];
 for(const bone of bones){const kind=getFingerKind(bone.name),side=getHandSide(bone.name);if(!kind||!side)continue;
   const match=bone.name.match(/(?:[._ -]?)([0-4])$/),segment=match?Number(match[1]):Math.min(3,fingerBones.filter(x=>x.side===side&&x.kind===kind).length);
   fingerBones.push({bone,kind,side,segment,rest:bone.quaternion.clone(),axis:new THREE.Vector3(1,0,0),index:fingerBones.length});
 }
 if(bones.length<20){throw new Error('Rig validation: expected at least 20 humanoid bones; found '+bones.length)}
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
 const findClip=pattern=>clips.find(clip=>pattern.test(clip.name));
 const animationClips={
   idle:findClip(/idle|stand|breath/i),
   walk:findClip(/walk|walking|locomotion/i),
   run:findClip(/run|sprint/i),
   jump:findClip(/jump|leap/i)
 };
 const animationActions:Record<string,THREE.AnimationAction|undefined>={};
 if(mixer){
   for(const [name,clip] of Object.entries(animationClips)){
     if(!clip)continue;
     const action=mixer.clipAction(clip);
     action.enabled=true;
     action.setLoop(name==='jump'?THREE.LoopOnce:THREE.LoopRepeat,name==='jump'?1:Infinity);
     if(name==='jump')action.clampWhenFinished=true;
     animationActions[name]=action;
   }
 }
 if(!animationActions.idle||!animationActions.walk||!animationActions.run)throw new Error('Asset quality gate: idle, walk and run clips are required; found '+clips.map(c=>c.name).join(', '));
 for(const child of [...player.children])player.remove(child);
 player.add(modelRoot);player.userData.legs=[];player.userData.arms=[];player.userData.hands=[];
 player.userData.rig={model,modelRoot,bones,fingerBones,bodyBones,mixer,clips,animationActions,activeAction:null,activeActionName:null};
 player.userData.riggedAsset=true;player.userData.setFingerPose=setPlayerFingerPose;
 playerFingerBoneCount=fingerBones.length;playerAssetLoadMs=performance.now()-playerAssetStarted;playerAssetStatus='Rigged human loaded · '+bones.length+' bones · '+fingerBones.length+' finger joints';
 setPlayerFingerPose('relaxed');
}

let pedestrianAssetInstallStarted=false,sedanAssetLoadStarted=false,trafficAssetLoadStarted=false;
let importedTrafficModelCount=0;
const importedTrafficModelNames:string[]=[];
function installPedestrianAssets(gltf){
 if(pedestrianAssetInstallStarted)return;pedestrianAssetInstallStarted=true;
 const playerIdle=gltf.animations.find(c=>/idle|stand|breath/i.test(c.name)),playerWalk=gltf.animations.find(c=>/walk|walking/i.test(c.name));
 if(!playerIdle||!playerWalk){console.warn('REALCITY protagonist clips unavailable; using existing procedural pedestrian rigs');return}
 const variants=[
  {name:'protagonist',scene:gltf.scene,animations:gltf.animations,kind:'clips'},
  {name:'casual',scene:null,animations:[],kind:'procedural'},
  {name:'worker',scene:null,animations:[],kind:'procedural'}
 ];
 let remaining=2;
 const finish=()=>{
  if(remaining>0)return;
  const usable=variants.filter(v=>!!v.scene);
  if(usable.length<3)console.warn('REALCITY pedestrian variety degraded; loaded variants:',usable.map(v=>v.name));
  const palette=[0xffffff,0xe8f0f4,0xffeee0,0xdce8db,0xe8dff0,0xf1e6cc,0xd8e9ed];
  let installed=0;
  for(let i=0;i<pedestrians.length;i++){
   const p=pedestrians[i];if(p.userData.importedPedestrian)continue;
   const source=usable[i%usable.length];if(!source)continue;
   const model=cloneSkeleton(source.scene);model.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
   if(!Number.isFinite(size.y)||size.y<.25)continue;
   const scale=1.7/size.y,baseY=-bounds.min.y*scale;
   model.scale.setScalar(scale);
   model.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,baseY,-(bounds.min.z+bounds.max.z)*.5*scale);
   model.userData.realcityPedestrianModel=source.name;
   const tint=new THREE.Color(palette[i%palette.length]);
   model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const style=m=>styleImportedMaterial(m,o.name,'character',tint);o.material=Array.isArray(o.material)?o.material.map(style):style(o.material)});
   if(source.kind==='clips'){
    const mixer=new THREE.AnimationMixer(model),idle=source.animations.find(c=>/idle|stand|breath/i.test(c.name)),walk=source.animations.find(c=>/walk|walking/i.test(c.name));
    if(!idle||!walk)continue;
    const actions={idle:mixer.clipAction(idle),walk:mixer.clipAction(walk)};actions.idle.play();
    for(const child of [...p.children])p.remove(child);p.add(model);
    p.userData.importedPedestrian={model,modelName:source.name,mixer,actions,activeAction:actions.idle,activeActionName:'idle',baseY,proceduralBones:null};
   }else{
    const names=[['leftThigh','thigh_l',1,1],['rightThigh','thigh_r',-1,1],['leftCalf','calf_l',1,.55],['rightCalf','calf_r',-1,.55],['leftArm','upperarm_l',-1,.68],['rightArm','upperarm_r',1,.68],['leftForearm','lowerarm_l',-1,.25],['rightForearm','lowerarm_r',1,.25],['spine','spine_03',1,.035]];
    const proceduralBones:Record<string,any>={};
    for(const [key,boneName,sign,weight] of names){const bone=model.getObjectByName(boneName);if(bone)proceduralBones[key]={bone,rest:bone.quaternion.clone(),sign,weight,axis:new THREE.Vector3(1,0,0),delta:new THREE.Quaternion()}}
    if(!proceduralBones.leftThigh||!proceduralBones.rightThigh||!proceduralBones.leftArm||!proceduralBones.rightArm){console.warn('REALCITY Quaternius pedestrian rig missing expected limb bones:',source.name);continue}
    for(const child of [...p.children])p.remove(child);p.add(model);
    p.userData.importedPedestrian={model,modelName:source.name,actions:{},activeAction:null,activeActionName:'idle',baseY,proceduralBones};
   }
   installed++;
  }
  console.info('REALCITY distinct animated pedestrians installed:',{installed,variants:usable.map(v=>v.name)});
 };
 const loader=new GLTFLoader();
 loader.load('/models/realcity-pedestrian-casual.glb',asset=>{variants[1].scene=asset.scene;remaining--;finish()},undefined,error=>{console.warn('REALCITY casual pedestrian model failed; fallback appearances remain:',error);remaining--;finish()});
 loader.load('/models/realcity-pedestrian-worker.glb',asset=>{variants[2].scene=asset.scene;remaining--;finish()},undefined,error=>{console.warn('REALCITY worker pedestrian model failed; fallback appearances remain:',error);remaining--;finish()});
}
function loadSedanAsset(){
 if(sedanAssetLoadStarted)return;sedanAssetLoadStarted=true;const vehicle=vehicles.find(v=>!v.traffic);if(!vehicle)return;
 new GLTFLoader().load('/models/realcity-sedan.glb',gltf=>{
  try{
   if(vehicle.g.userData.importedModel)return;const model=gltf.scene;model.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());if(!Number.isFinite(size.z)||size.z<.1)throw new Error('Sedan model has invalid bounds');
   const scale=3.75/size.z;model.scale.setScalar(scale);model.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*.5*scale);
   const wheels=[];model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const style=m=>styleImportedMaterial(m,o.name,'vehicle');o.material=Array.isArray(o.material)?o.material.map(style):style(o.material);if(/wheel|tire/i.test(o.name)){o.userData.steerable=/wheel-front/i.test(o.name);wheels.push(o)}}});
   if(wheels.length<4)throw new Error('Sedan model wheel validation failed: '+wheels.length);
   for(const child of [...vehicle.g.children])vehicle.g.remove(child);vehicle.g.add(model);vehicle.g.userData.wheels=wheels;vehicle.g.userData.importedModel='kenney-sedan';
   console.info('REALCITY CC0 sedan integrated:',{wheels:wheels.length,scale,source:'/models/realcity-sedan.glb'});
  }catch(error){console.warn('REALCITY sedan asset rejected; existing procedural vehicle retained:',error)}
 },undefined,error=>console.warn('REALCITY sedan asset unavailable; existing procedural vehicle retained.',error));
}

function loadTrafficVehicleAssets(){
 if(trafficAssetLoadStarted)return;trafficAssetLoadStarted=true;
 const fleet=[
  {file:'/models/realcity-hatchback-sports.glb',name:'hatchback-sports',length:3.75,width:1.9},
  {file:'/models/realcity-taxi.glb',name:'taxi',length:3.75,width:1.9},
  {file:'/models/realcity-suv.glb',name:'suv',length:3.9,width:2.0},
  {file:'/models/realcity-van.glb',name:'van',length:4.05,width:2.02},
  {file:'/models/realcity-truck.glb',name:'truck',length:4.05,width:2.02}
 ];
 const targets=vehicles.filter(v=>v.traffic);
 targets.forEach((vehicle,index)=>{
  const asset=fleet[index%fleet.length];
  new GLTFLoader().load(asset.file,gltf=>{
   try{
    if(vehicle.g.userData.importedTrafficModel)return;
    const model=cloneSkeleton(gltf.scene);model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.x)||!Number.isFinite(size.y)||!Number.isFinite(size.z)||size.x<.1||size.y<.1||size.z<.1)throw new Error('Invalid model bounds '+size.toArray().join(','));
    // Visuals are fitted inside the same pre-existing arcade collision envelope.
    // No collision, movement, health, servicing or persistence data is replaced.
    const scale=Math.min(asset.width/size.x,asset.length/size.z);
    model.scale.setScalar(scale);
    model.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*.5*scale);
    const wheels:THREE.Object3D[]=[];
    model.traverse(o=>{
     if(!o.isMesh)return;
     o.castShadow=true;o.receiveShadow=true;
     const style=m=>styleImportedMaterial(m,o.name,'vehicle');o.material=Array.isArray(o.material)?o.material.map(style):style(o.material);
     if(/wheel|tire/i.test(o.name)){o.userData.steerable=/wheel[-_ ]?front/i.test(o.name);wheels.push(o)}
    });
    if(wheels.length<4)throw new Error('Expected at least four named wheel meshes; found '+wheels.length);
    for(const child of [...vehicle.g.children])vehicle.g.remove(child);
    vehicle.g.add(model);vehicle.g.userData.wheels=wheels;
    vehicle.g.userData.importedTrafficModel=asset.name;
    importedTrafficModelCount++;importedTrafficModelNames.push(asset.name);
   }catch(error){console.warn('REALCITY traffic model rejected; keeping procedural fallback for this vehicle:',asset.name,error)}
  },undefined,error=>console.warn('REALCITY traffic model failed to load; keeping procedural fallback:',asset.file,error));
 });
}

function loadRiggedPlayer(){
 if(playerAssetLoadStarted)return;
 playerAssetLoadStarted=true;
 // Only load a model shipped with REALCITY. Do not silently depend on an
 // unverified third-party URL or an asset with unknown licensing.
 const url='/models/realcity-protagonist.glb';
 const loader=new GLTFLoader();
 loader.load(url,gltf=>{
  try{
   installRiggedPlayer(gltf);
   installPedestrianAssets(gltf);
   playerAssetStatus='Rigged human · '+gltf.animations.map(c=>c.name.split('|').pop()).join(', ');
   console.info('REALCITY character asset loaded:',url,{bytes:'bundled GLB',bones:player.userData.rig.bones.length,skinnedMeshes:gltf.scene.children.length,clips:gltf.animations.map(c=>c.name)});
  }catch(err){
   playerAssetStatus='Local rig rejected · procedural animated fallback active';
   console.warn('REALCITY local character rig rejected; keeping animated fallback:',err);
  }
 },undefined,err=>{
  playerAssetStatus='Local model missing · procedural animated fallback active';
  console.info('No bundled REALCITY protagonist GLB; procedural animated fallback remains active.',err);
 });
}

loadRiggedPlayer();
loadSedanAsset();
loadTrafficVehicleAssets();
if(new URLSearchParams(location.search).has('qa')){(window as any).__REALCITY_QA__=()=>({buildSha,placePlayerAtPedestrianForTest:()=>{for(const p of pedestrians){player.position.set(p.position.x+.1,0,p.position.z+.1);const target=nearestInteraction();if(target?.type==='pedestrian')return{position:{x:player.position.x,z:player.position.z},target:target.type,distance:target.distance}}return null},movePlayerForTest:(x,z)=>{player.position.set(Number(x)||0,0,Number(z)||0);return true},interactionCandidatesForTest:()=>{const out=[];const [car,carDistance]=closestCar();if(car&&carDistance<5.2)out.push({type:'car',distance:carDistance});for(let i=0;i<doors.length;i++){const distance=d2(player.position,doors[i]);if(distance<2.7)out.push({type:'door',distance,index:i})}for(const ped of pedestrians){const distance=d2(player.position,ped.position);if(distance<2.6)out.push({type:'pedestrian',distance})}for(const obj of worldObjects){const distance=d2(player.position,obj);if(distance<2.7)out.push({type:obj.type,distance})}return out.sort((a,b)=>a.distance-b.distance)},interactionTargetForTest:()=>{const target=nearestInteraction();return target?{type:target.type,distance:target.distance}:null},runPedestrianBrainRegressionForTest:()=>{
 const blockedWall=(x,z)=>Math.abs(x)<1&&Math.abs(z)<10;
 const agent={position:{x:-3,z:0},rotation:{y:0},userData:{brain:createPedestrianBrain(991,20261021,{x:6,z:0},0)}};
 agent.userData.brain.decisionAt=0;let now=0,moves=0,collisions=0;
 for(let i=0;i<20;i++){const r=stepPedestrian(agent,{now,dt:.05,agents:[agent],blocked:blockedWall,chooseGoal:()=>({x:6,z:0}),frame:i});if(blockedWall(r.nx,r.nz))collisions++;if(r.moving){agent.position.x=r.nx;agent.position.z=r.nz;agent.rotation.y=r.dir;moves++}now+=.05}
 const fallback={moves,collisions,goal:{x:agent.userData.brain.goalX,z:agent.userData.brain.goalZ},state:agent.userData.brain.state,position:{...agent.position}};
 const impossible={position:{x:0,z:0},rotation:{y:0},userData:{brain:createPedestrianBrain(992,20261022,{x:100,z:100},0)}};
 impossible.userData.brain.decisionAt=0;let warnings=0;const oldWarn=console.warn;console.warn=()=>{warnings++};try{for(let i=0;i<30;i++)stepPedestrian(impossible,{now:i*.2,dt:.05,agents:[impossible],blocked:()=>true,chooseGoal:()=>({x:100,z:100}),frame:i})}finally{console.warn=oldWarn}
 return {fallback,impossible:{state:impossible.userData.brain.state,retryCount:impossible.userData.brain.retryCount,warnings,finite:Number.isFinite(impossible.position.x)&&Number.isFinite(impossible.position.z)}}
},runVehicleDynamicsRegressionForTest:()=>{
 const simulate=(nextDt)=>{
  let t=0,speed=0,brakeLatched=false,steps=0,minSpeed=0,maxSpeed=0;const boundaries=[1,2,3,3.1,4,4.1,5,6];
  while(t<6-1e-9&&steps<2000){const boundary=boundaries.find(b=>b>t+1e-9)??6;const dt=Math.min(nextDt(),boundary-t,6-t);const input=t<1?1:t<2?0:t<3?-1:t<3.1?0:t<4?-1:t<4.1?0:t<5?1:0;const result=integrateVehicleSpeed(speed,input,dt,brakeLatched);speed=result.speed;brakeLatched=result.brakeLatched;t+=dt;steps++;minSpeed=Math.min(minSpeed,speed);maxSpeed=Math.max(maxSpeed,speed)}
  return{speed,brakeLatched,steps,minSpeed,maxSpeed,time:t}
 };
 const fixed=simulate(()=>1/60),jitter=[.008,.05,.0167,.033,.025,.041,.012,.02];let ji=0;const variable=simulate(()=>jitter[(ji++)%jitter.length]);
 const seed=20261021;let randomState=seed>>>0;const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296};
 let speed=0,brakeLatched=false,minSpeed=0,maxSpeed=0,invalidStates=0,transitionSteps=0;
 for(let cycle=0;cycle<100;cycle++){
  // Each seeded cycle exercises throttle, coast, braking to rest, reverse from rest,
  // forward recovery, and coast. Durations vary reproducibly without wall-clock timing.
  const phases=[[1,2+Math.floor(random()*4)],[0,1+Math.floor(random()*3)],[-1,6+Math.floor(random()*5)],[0,1],[-1,3+Math.floor(random()*3)],[1,5+Math.floor(random()*4)],[0,1]];
  for(const [input,count] of phases)for(let i=0;i<count;i++){
   const result=integrateVehicleSpeed(speed,input,.05,brakeLatched);speed=result.speed;brakeLatched=result.brakeLatched;transitionSteps++;
   if(!Number.isFinite(speed)||speed< -5.5||speed>14.5)invalidStates++;
   minSpeed=Math.min(minSpeed,speed);maxSpeed=Math.max(maxSpeed,speed);
  }
  if(brakeLatched)invalidStates++;
 }
 return{fixed,variable,deltaSpeed:Math.abs(fixed.speed-variable.speed),tolerance:.12,seed,repeatedTransitions:100,transitionSteps,transitionFinalSpeed:speed,brakeLatched,invalidStates,minSpeed,maxSpeed,negativeReverseObserved:minSpeed<-.2}
},runTrafficSafetyForTest:()=>{
 const trafficSnapshot=traffic.map(v=>({v,x:v.g.position.x,z:v.g.position.z,rotation:v.g.rotation.y,speed:v.speed,data:{...v.trafficData}}));
 const pedestrianSnapshot=pedestrians.map(p=>({p,x:p.position.x,z:p.position.z,state:p.userData.brain?.state,idleUntil:p.userData.brain?.idleUntil,decisionAt:p.userData.brain?.decisionAt,lastX:p.userData.brain?.lastX,lastZ:p.userData.brain?.lastZ,stuckFor:p.userData.brain?.stuckFor}));
 let result;
 try{
  for(let i=0;i<traffic.length;i++){const v=traffic[i];v.g.position.set(220+i*10,0,220);v.speed=0;if(v.trafficData)v.trafficData.speed=0}
  const v=traffic[0],td=v.trafficData;v.g.position.set(100,0,-100);v.g.rotation.y=0;td.axis='z';td.lane=100;td.dir=1;td.speed=4;
  pedestrians.forEach((p,i)=>{p.position.set(100,0,-96.8+i*.2);if(p.userData.brain){p.userData.brain.state='idle';p.userData.brain.idleUntil=elapsed+1000;p.userData.brain.lastX=p.position.x;p.userData.brain.lastZ=p.position.z}});
  const startZ=v.g.position.z;
  for(let i=0;i<40;i++)update(.05);
  const stoppedZ=v.g.position.z;
  const minPedGap=Math.min(...pedestrians.slice(0,3).map(p=>Math.hypot(p.position.x-v.g.position.x,p.position.z-v.g.position.z)));
  // Confirm the vehicle remains stopped under the same obstruction. It may
  // safely roll forward while braking; requiring zero displacement from the
  // initial position incorrectly rejected a safe stop before the pedestrians.
  for(let i=0;i<4;i++)update(.05);
  const stableZ=v.g.position.z;
  pedestrians.forEach((p,i)=>p.position.set(150+i*3,0,150));
  for(let i=0;i<4;i++)update(.05);
  const resumedZ=v.g.position.z;
  result={startZ,stoppedZ,stableZ,resumedZ,stopped:Math.abs(stableZ-stoppedZ)<.01,resumed:Math.abs(resumedZ-stableZ)>.05,minPedGap,pedestrianCount:3};
 }finally{
  for(const s of trafficSnapshot){s.v.g.position.set(s.x,0,s.z);s.v.g.rotation.y=s.rotation;s.v.speed=s.speed;if(s.v.trafficData)Object.assign(s.v.trafficData,s.data)}
  for(const s of pedestrianSnapshot){s.p.position.set(s.x,0,s.z);const b=s.p.userData.brain;if(b){b.state=s.state;b.idleUntil=s.idleUntil;b.decisionAt=s.decisionAt;b.lastX=s.lastX;b.lastZ=s.lastZ;b.stuckFor=s.stuckFor}}
 }
 return result
},setQualityForTest:(q)=>{applyQuality(q);return quality},setCameraForTest:(nextYaw,nextPitch)=>{yaw=Number(nextYaw)||0;pitch=Math.max(-.08,Math.min(.72,Number(nextPitch)||.22));return{yaw,pitch}},cityGridCells:CITY_BLOCKS*CITY_BLOCKS,cityExtent:CITY_EXTENT,roadGridLines:CITY_BLOCKS+1,districts:[...generatedDistricts].sort(),landmarks:[...landmarkLabels],asset:playerAssetStatus,rigged:!!player.userData.riggedAsset,active:player.userData.rig?.activeActionName??null,bones:player.userData.rig?.bones.length??0,clips:player.userData.rig?.clips.map(c=>c.name)??[],jumpAnimation:player.userData.rig?.animationActions.jump?'asset':'procedural',jumpPeak,jumpFrames,pedestrians:pedestrians.length,buildingCount:buildings.length,importedBuildingCount,pedestrianAssets:pedestrians.filter(p=>!!p.userData.importedPedestrian).length,pedestrianModelNames:[...new Set(pedestrians.map(p=>p.userData.importedPedestrian?.modelName).filter(Boolean))],pedestrianActive:pedestrians.find(p=>p.userData.importedPedestrian)?.userData.importedPedestrian?.activeActionName??null,pedestrianWalking:pedestrians.some(p=>p.userData.importedPedestrian?.activeActionName==='walk'),pedestrianPositions:pedestrians.map((p,i)=>({id:i,x:p.position.x,z:p.position.z,action:p.userData.importedPedestrian?.activeActionName??'procedural'})),vehicles:vehicles.length,vehicleStyles:[...new Set(vehicles.map(v=>v.g.userData.vehicleStyle).filter(Boolean))],vehicleStates:vehicles.map((v,i)=>({id:i,traffic:!!v.traffic,x:v.g.position.x,z:v.g.position.z,speed:v.speed,health:v.health,rotation:v.g.rotation.y})),setParkedVehicleHealthForTest:(health)=>{const v=vehicles.find(v=>!v.traffic);if(!v)return false;v.health=health;saveSettings();return v.health},persistStateForTest:()=>saveSettings(),sedanImported:!!vehicles.find(v=>!v.traffic)?.g.userData.importedModel,importedTrafficModels:importedTrafficModelCount,trafficModelNames:[...importedTrafficModelNames],inCar:!!inCar,vehicleSpeed:inCar?.speed??0,vehiclePosition:inCar?{x:inCar.g.position.x,z:inCar.g.position.z}:null,rendererStats:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,pixelRatio:renderer.getPixelRatio(),adaptiveRenderScale:mobileRenderScale,mobileSafeDefault,quality,staticMeshes:cityStaticMeshes.length,visibleStaticMeshes:cityStaticMeshes.filter(m=>m.visible&&m.userData.cityStatic!==false).length,staticBatching:{...phase10StaticBatchStats,visibleBatches:cityStaticMeshes.filter(m=>m.visible&&m.userData.phase10StaticBatch).length},spatialIndex:{ready:spatialGridReady,solidCount:solid.length,collisionCells:staticCollisionGrid.size,cameraBlockerCells:cameraBlockerGrid.size,collisionQueryCount:staticCollisionQueryCount,collisionCandidateChecks:staticCollisionCandidateChecks,meanCollisionCandidates:staticCollisionQueryCount?staticCollisionCandidateChecks/staticCollisionQueryCount:0,cameraRayQueryCount,cameraRayCandidateChecks,meanCameraRayCandidates:cameraRayQueryCount?cameraRayCandidateChecks/cameraRayQueryCount:0},shadows:{enabled:renderer.shadowMap.enabled,qualityMapSize:sun.shadow.mapSize.x,importedReceivers:quality>=2,importedCasters:quality>=3},cpuProfile:{loopAvgMs:lastCpuAvgMs,loopPeakMs:lastCpuPeakMs,updateAvgMs:lastUpdateCpuAvgMs,updatePeakMs:lastUpdateCpuPeakMs,renderCallAvgMs:lastRenderCpuAvgMs,renderCallPeakMs:lastRenderCpuPeakMs},visiblePedestrians:pedestrians.filter(p=>p.visible).length,visibleVehicles:vehicles.filter(v=>v.g.visible).length}),prepareVehicle:()=>{const v=vehicles.find(v=>!v.traffic);if(!v)throw new Error('No parked test vehicle is available');v.g.visible=true;inCar=null;let parkedIndex=0;for(const other of vehicles){if(other===v)continue;other.g.position.set(0,0,72+parkedIndex*8);other.g.rotation.y=0;other.speed=0;other.steer=0;parkedIndex++}v.g.rotation.y=0;v.speed=0;v.steer=0;player.visible=true;let fixture=null;const candidates=[];for(let ring=0;ring<=280&&!fixture;ring+=20){for(let x=-280;x<=280&&!fixture;x+=20){for(const z of [-280,-260,-240,-220,-200,-180,-160,-140,-120,-100,-80,-60,-40,-20,0,20,40,60,80,100,120,140,160,180,200,220,240,260,280]){if(Math.abs(x)!==ring&&Math.abs(z)!==ring)continue;v.g.position.set(x,0,z);player.position.set(x,0,z+4.3);const target=nearestInteraction();if(target?.type==='car'&&target.distance<5.2){fixture={vehiclePosition:{x,z},playerPosition:{x:player.position.x,z:player.position.z},target:{type:target.type,distance:target.distance}};break}if(candidates.length<12)candidates.push({vehicle:{x,z},target:target?{type:target.type,distance:target.distance}:null})}}}if(!fixture)throw new Error('Unable to find an unambiguous parked-car interaction fixture: '+JSON.stringify({attempted:candidates,parkedVehicles:vehicles.filter(q=>!q.traffic).length,doors:doors.length,pedestrians:pedestrians.length,worldObjects:worldObjects.length}));return{...fixture,candidates:(()=>{const out=[];const [car,carDistance]=closestCar();if(car&&carDistance<5.2)out.push({type:'car',distance:carDistance});for(let i=0;i<doors.length;i++){const distance=d2(player.position,doors[i]);if(distance<2.7)out.push({type:'door',distance,index:i})}for(const ped of pedestrians){const distance=d2(player.position,ped.position);if(distance<2.6)out.push({type:'pedestrian',distance})}for(const obj of worldObjects){const distance=d2(player.position,obj);if(distance<2.7)out.push({type:obj.type,distance})}return out.sort((a,b)=>a.distance-b.distance)})()}},preparePlayerMovementForTest:()=>{inCar=null;player.visible=true;player.position.y=0;yaw=0;let found=false;for(let z=-300;z<=300&&!found;z+=8){for(let x=-300;x<=300&&!found;x+=8){let clear=true;for(let d=0;d<=3;d+=.5){if(blocked(x,z+d,.52,null)){clear=false;break}}if(clear){player.position.set(x,0,z);found=true}}}if(!found)throw new Error('No clear forward movement test corridor found');return{x:player.position.x,z:player.position.z,yaw}},position:{x:player.position.x,y:player.position.y,z:player.position.z},collisionProbe:()=>{const b=solid.find(b=>!solid.some(o=>o!==b&&Math.abs((b.x+b.w/2+2.25)-o.x)<o.w/2+1.4&&Math.abs(b.z-o.z)<o.d/2+1.4))||solid[0];if(!b)return null;const px=b.x+b.w/2+.7,vx=b.x+b.w/2+2.25;return{buildingCount:solid.length,probeFound:true,probeBuilding:{x:b.x,z:b.z,w:b.w,d:b.d},playerBlockedAtBuilding:blocked(b.x,b.z,.52,null),vehicleBlockedAtBuilding:vehicleBlocked(b.x,b.z,0,vehicles[0]),playerClearOutsideEdge:!blocked(px,b.z,.52,null),vehicleClearOutsideEdge:!vehicleBlocked(vx,b.z,0,vehicles[0]),playerBoundaryBlocked:blocked(b.x+b.w/2+.25,b.z,.52,null)}},canvas:!!renderer.domElement});}

if(Array.isArray(saved.cars)){const parked=vehicles.filter(v=>!v.traffic);for(let i=0;i<Math.min(parked.length,saved.cars.length);i++){const s=saved.cars[i],v=parked[i];if(!s||typeof s!=='object')continue;const x=Number(s.x),z=Number(s.z),rot=Number(s.rotation);if(Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<=325&&Math.abs(z)<=325&&(!Number.isFinite(rot)||!vehicleBlocked(x,z,rot,v))){v.g.position.x=x;v.g.position.z=z;if(Number.isFinite(rot))v.g.rotation.y=rot}if(Number.isFinite(s.health))v.health=Math.max(0,Math.min(100,s.health));if(s.upgrades&&typeof s.upgrades==='object')for(const key of ['engine','handling','tires'])v.upgrades[key]=Math.max(0,Math.min(3,Math.floor(Number(s.upgrades[key])||0)));if(Number.isFinite(s.paintColor)){v.paintColor=s.paintColor;v.g.userData.bodyMaterial?.color?.setHex(s.paintColor)}}}
loadfill.style.width='82%';loadnote.textContent='Initializing controls and minimap…';
let yaw=0,pitch=.22,inCar=null,jumpV=0,jumpPeak=0,jumpFrames=0,sprinting=false,stamina=100,toastTimer,nightMode=!!saved.nightMode,dragging=false,lx=0,ly=0,reverseBrakeLatched=false;const keys:Record<string,boolean>={};
function integrateVehicleSpeed(speed:number,input:number,rawDt:number,brakeLatched:boolean,engineMultiplier=1){
 const dt=Math.max(0,Math.min(rawDt,.05));let latched=brakeLatched;
 const throttle=input>0?1:input<0?-.72:0;
 if(input===0)latched=false;
 if(input>0&&speed<-.15)speed=Math.min(0,speed+18*dt);
 else if(input<0&&speed>.15){latched=true;speed=Math.max(0,speed-18*dt)}
 else if(input<0&&latched)speed=0;
 else if(input!==0)speed+=throttle*dt*(speed<0?7.2:8.5)*Math.max(1,Math.min(1.6,engineMultiplier));
 else if(Math.abs(speed)<.12)speed=0;
 else speed*=Math.pow(.975,dt*60);
 if(!Number.isFinite(speed))speed=0;
 speed=Math.max(-5.5,Math.min(14.5,speed));
 return {speed,brakeLatched:latched};
}function startJump(){if(!inCar&&player.position.y<.06){jumpV=5.1;jumpPeak=0;jumpFrames=0}}if(!interiorMode&&Number.isInteger(saved.inCarIndex)&&saved.inCarIndex>=0){const parked=vehicles.filter(v=>!v.traffic);const restored=parked[saved.inCarIndex];if(restored){inCar=restored;player.visible=false;$('interact').textContent='EXIT VEHICLE';$('drivepad').classList.add('visible');$('vehicleStatus').style.display='block'}}function clearInputs(){sprinting=false;dragging=false;for(const k of Object.keys(keys))keys[k]=false;document.querySelectorAll('.down').forEach(b=>b.classList.remove('down'))}addEventListener('blur',()=>{clearInputs();saveSettings()});addEventListener('focus',clearInputs);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();saveSettings()}});const clock=new THREE.Clock();let elapsed=0,aiFrame=0,worldCullElapsed=0,mapUpdateElapsed=.1;
function say(s){$('toast').textContent=s;$('toast').style.opacity='1';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity='0',1900)}
let saveWarningShown=false;function saveSettings(){try{const t=player.position,finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback,payload={version:4,characterUltraBenchmarkDone:true,quality,nightMode,interior:interiorMode,interiorDoorIndex:interiorMode?currentInteriorDoorIndex:-1,inCarIndex:interiorMode?-1:(inCar?vehicles.filter(v=>!v.traffic).indexOf(inCar):-1),spawnX:interiorMode?roomX:Math.max(-315,Math.min(315,finite(t.x))),spawnZ:interiorMode?roomZ:Math.max(-315,Math.min(315,finite(t.z))),cars:vehicles.filter(v=>!v.traffic).map(v=>({x:Math.max(-315,Math.min(315,finite(v.g.position.x))),z:Math.max(-315,Math.min(315,finite(v.g.position.z))),rotation:finite(v.g.rotation.y),health:Math.max(0,Math.min(100,finite(v.health,100))),upgrades:v.upgrades||{engine:0,handling:0,tires:0},paintColor:v.paintColor??0x347f9d}))};localStorage.setItem('realcity-settings',JSON.stringify(payload));return true}catch(e){if(!saveWarningShown){saveWarningShown=true;if(typeof say==='function')say('Save unavailable · browser storage could not be written')}return false}}
function setNight(on){nightMode=on;scene.background=new THREE.Color(on?0x101c30:0x9bc4d1);scene.fog.color.setHex(on?0x172338:0xa3c3ca);scene.fog.density=on?.00028:.00012;hemi.intensity=on?.62:2.0;sun.intensity=on?.28:3.0;sun.color.setHex(on?0x9bb8ff:0xffedce);sun.position.set(on?34:-48,on?28:85,on?-26:34);renderer.toneMappingExposure=on?1.28:1.15;for(const w of windowMeshes){w.material.emissive.setHex(on?0xffb85c:0x12252a);w.material.emissiveIntensity=on?.95:.18}for(const l of streetBulbs)l.material.emissiveIntensity=on?2.2:.08;for(const l of carLamps)l.mesh.material.emissiveIntensity=l.kind==='head'?(on?2.1:.05):(on?.8:.15);$('timeText').textContent=on?'NIGHT':'DAY';$('timeBtn').textContent=on?'SET DAY':'SET NIGHT';$('menuTimeBtn').textContent='TIME: '+(on?'NIGHT':'DAY');saveSettings();say(on?'Night mode · lights on':'Day mode · natural light restored')}
function d2(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
function closestCar(){let best=null,d=1e9;for(const v of vehicles){if(v.traffic||!v.g?.visible||!Number.isFinite(v.g.position.x)||!Number.isFinite(v.g.position.z))continue;let dd=d2(player.position,v.g.position);if(dd<d){best=v;d=dd}}return [best,d]}
function toggleCar(){if(inCar&&(!vehicles.includes(inCar)||inCar.traffic)){inCar=null;player.visible=true;$('interact').textContent='ENTER VEHICLE';$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none'}if(inCar){if(Math.abs(inCar.speed)>1.2){say('Slow down before exiting');return}const offsets=[-1.8,1.8];let spot=null;for(const side of offsets){const off=new THREE.Vector3(side,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),inCar.g.rotation.y),ex=inCar.g.position.x+off.x,ez=inCar.g.position.z+off.z;if(!blocked(ex,ez,.62,inCar)){spot={x:ex,z:ez};break}}if(!spot){say('No safe space to exit here');return}player.position.set(spot.x,0,spot.z);inCar=null;player.visible=true;$('interact').textContent='ENTER VEHICLE';$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none';saveSettings();say('Exited safely');return}let [v,d]=closestCar();if(v&&d<5.2){inCar=v;player.visible=false;v.speed=0;v.steer=0;$('interact').textContent='EXIT VEHICLE';saveSettings();say('Vehicle entered · use arrows or WASD to drive')}else say('Walk closer to a parked vehicle')}
function enterInterior(index){const door=doors[index];if(!door||inCar)return;if(d2(player.position,door)<2.7){interiorMode=true;currentInteriorDoorIndex=index;player.position.set(roomX,0,roomZ);player.visible=true;interiorMeshes.forEach(o=>o.visible=true);setInteriorTheme(resolveInteriorTheme(door));yaw=0;pitch=.16;saveSettings();say('Entered '+activeInteriorTheme.toUpperCase()+' interior · use INTERACT to exit')}else say('Move closer to the entrance')}
function exitInterior(){const door=doors[currentInteriorDoorIndex];interiorMode=false;interiorMeshes.forEach(o=>o.visible=false);setInteriorTheme('residential');player.position.set(door?.outsideX??0,0,door?.outsideZ??23);currentInteriorDoorIndex=-1;saveSettings();say('Exited building · back in the city')}
function nearestInteraction(){if(inCar)return {type:'carExit',distance:0};if(interiorMode)return {type:'interiorExit',distance:0};let best=null;const [v,cd]=closestCar();if(v&&cd<5.2)best={type:'car',distance:cd};for(let i=0;i<doors.length;i++){const d=doors[i],dd=d2(player.position,d);if(dd<2.7&&(!best||dd<best.distance))best={type:'door',distance:dd,index:i}}for(const ped of pedestrians){const dd=d2(player.position,ped.position);if(dd<2.6&&(!best||dd<best.distance))best={type:'pedestrian',distance:dd,object:ped}}for(const obj of worldObjects){const dd=d2(player.position,obj);if(dd<2.7&&(!best||dd<best.distance))best={type:obj.type,distance:dd,object:obj}}return best}
function performInteraction(){if(inCar){toggleCar();return}if(interiorMode){exitInterior();return}const target=nearestInteraction();if(!target){say('No interaction nearby · approach a parked car, marked door, or city kiosk');return}if(target.type==='car'){toggleCar();return}if(target.type==='door'){enterInterior(target.index);return}if(target.type==='kiosk'){setNight(!nightMode);return}if(target.type==='landmark'||target.type==='dealership'||target.type==='gearStore'){openCityService(target.type==='landmark'?target.object.name:target.type);return}if(target.type==='pedestrian'){const ped=target.object,brain=ped?.userData?.brain,personality=brain?.personality;const lines=personality==='commuter'?['Sorry, I’m heading to work.','Busy day out here.']:personality==='explorer'?['This part of the city is new to me.','Nice day to walk around.']:personality==='social'?['Hey! How’s your day going?','City feels lively today.']:['Watch the traffic near the crossings.','I’m keeping an eye on the road.'];if(brain){brain.state='idle';brain.idleUntil=elapsed+1.8;brain.decisionAt=elapsed+1.8}say(lines[Math.floor(Math.random()*lines.length)]);return}}
$('interact').addEventListener('click',performInteraction);function serviceVehicle(){let v=inCar;if(!v){let near=null,d=1e9;for(const candidate of vehicles){if(candidate.traffic||!candidate.g?.visible)continue;const dd=d2(player.position,candidate.g.position);if(dd<d){near=candidate;d=dd}}if(!near||d>14){say('Move within 14 m of a parked vehicle to service it');return}v=near}v.health=100;v.speed=0;v.steer=0;saveSettings();if(inCar===v)say('Vehicle serviced · condition restored to 100%');else say('Nearby parked vehicle repaired · condition 100%')}
$('serviceBtn').addEventListener('click',serviceVehicle);

let cityCash=2500,playerCondition=100,cityInventory:string[]=[];
try{const savedEconomy=JSON.parse(localStorage.getItem('realcity-economy')||'{}');if(Number.isFinite(savedEconomy.cash))cityCash=Math.max(0,savedEconomy.cash);if(Array.isArray(savedEconomy.inventory))cityInventory=savedEconomy.inventory.filter((v)=>typeof v==='string').slice(0,100);if(Number.isFinite(savedEconomy.condition))playerCondition=Math.max(0,Math.min(100,savedEconomy.condition))}catch{}
function saveCityEconomy(){try{localStorage.setItem('realcity-economy',JSON.stringify({cash:cityCash,inventory:cityInventory,condition:playerCondition}))}catch{}}
const cityServicePanel=document.createElement('section');
cityServicePanel.id='realcity-service-panel';
cityServicePanel.setAttribute('aria-label','City service');
cityServicePanel.innerHTML='<div class="rc-service-card"><div class="rc-service-top"><div><div class="rc-service-kicker">REALCITY · CITY SERVICES</div><h2 id="rc-service-title">CITY SERVICE</h2><p id="rc-service-desc"></p></div><button type="button" class="rc-service-close" data-service-action="close" aria-label="Close">×</button></div><div class="rc-service-cash" id="rc-service-cash"></div><div class="rc-service-items" id="rc-service-items"></div><div class="rc-service-foot">Purchases are saved on this device · fictional game economy</div></div>';
const serviceStyle=document.createElement('style');
serviceStyle.textContent="#realcity-service-panel{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(3,9,12,.76);backdrop-filter:blur(9px);font-family:Inter,system-ui,sans-serif;color:#edf4f2}\n#realcity-service-panel.open{display:flex}\n#realcity-service-panel .rc-service-card{width:min(560px,100%);max-height:min(78vh,720px);overflow:auto;background:linear-gradient(145deg,rgba(20,34,38,.98),rgba(8,16,20,.99));border:1px solid rgba(135,194,183,.35);border-radius:18px;padding:22px;box-shadow:0 24px 90px rgba(0,0,0,.55)}\n#realcity-service-panel .rc-service-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}\n#realcity-service-panel .rc-service-kicker{font-size:10px;letter-spacing:2px;color:#73d6c0;font-weight:800}\n#realcity-service-panel h2{margin:7px 0 4px;font-size:25px;letter-spacing:1px}\n#realcity-service-panel p{margin:0;color:#aebfbd;font-size:13px;line-height:1.5}\n#realcity-service-panel .rc-service-close{width:38px;height:38px;border:1px solid #536b6b;border-radius:10px;background:#203237;color:#fff;font-size:25px}\n#realcity-service-panel .rc-service-cash{margin:18px 0 12px;padding:12px 14px;border-radius:10px;background:rgba(84,163,145,.13);color:#8ce4ce;font-weight:800}\n#realcity-service-panel .rc-service-items{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n#realcity-service-panel .rc-service-item{padding:13px;border:1px solid rgba(149,181,174,.2);border-radius:12px;background:rgba(255,255,255,.035)}\n#realcity-service-panel .rc-service-item strong{display:block;font-size:14px}\n#realcity-service-panel .rc-service-item small{display:block;min-height:34px;margin:5px 0 10px;color:#a9bab8;font-size:11px;line-height:1.4}\n#realcity-service-panel .rc-service-item button{width:100%;padding:10px;border:0;border-radius:8px;background:#65cdb5;color:#071a18;font-weight:900}\n#realcity-service-panel .rc-service-foot{margin-top:14px;color:#80918f;font-size:10px}\n@media(max-width:480px){#realcity-service-panel .rc-service-card{padding:16px}#realcity-service-panel .rc-service-items{grid-template-columns:1fr}#realcity-service-panel h2{font-size:21px}}";
document.head.appendChild(serviceStyle);document.body.appendChild(cityServicePanel);
const cityServices={
 MARKET:{title:'MARKET & CONVENIENCE',description:'Everyday supplies, food and city essentials.',items:[['snack','Quick meal','Restore stamina','25'],['drink','Energy drink','Restore stamina','15'],['map','City guide','Add a city guide to your collection','40']]},
 HOSPITAL:{title:'CITY HOSPITAL',description:'Medical support and recovery services.',items:[['heal','Medical treatment','Restore player condition and stamina','150'],['rest','Recovery room','Free stamina recovery','0']]},
 FUEL:{title:'AUTO GARAGE',description:'Vehicle maintenance and roadside support.',items:[['repair','Full vehicle service','Repair the nearest vehicle or your current car','120'],['engine','Engine tune · Stage 1','Increase acceleration and top speed','250'],['handling','Steering tune · Stage 1','Improve steering response','225'],['tires','Road tires · Stage 1','Improve cornering response','200'],['paint','Custom paint','Apply a new finish to your nearest vehicle','100'],['fuel','Roadside check','Free vehicle condition inspection','0']]},
 POLICE:{title:'POLICE STATION',description:'Civic services and vehicle paperwork.',items:[['permit','Vehicle registration','Add a registration record to your collection','75'],['report','Lost property desk','Record a lost-property report','0']]},
 FIRE:{title:'FIRE & RESCUE',description:'Emergency response and safety supplies.',items:[['safety','Safety kit','Add a safety kit to your inventory','90'],['rescue','Rescue information','View local emergency guidance','0']]},
 SCHOOL:{title:'CITY GEAR STORE',description:'Streetwear, protective clothing and utility accessories.',items:[['jacket','Street jacket','Wardrobe unlock','180'],['helmet','Riding helmet','Protective cosmetic unlock','120'],['flashlight','Flashlight','Utility inventory item','60'],['prop','Sci-fi display prop','Non-functional fictional collectible only','220']]},
 VILLAS:{title:'BOUTIQUE',description:'Clothing and personal style items.',items:[['outfit','Urban outfit','Wardrobe unlock','240'],['shoes','Street sneakers','Wardrobe unlock','130']]},
 dealership:{title:'AUTO DEALERSHIP',description:'Purchase a vehicle and add it to your city garage.',items:[['sedan','City sedan','Reliable four-door vehicle','1600'],['suv','Urban SUV','Higher-riding city vehicle','2600'],['van','Utility van','Practical cargo vehicle','2200']]},
 gearStore:{title:'GEAR & PROP SHOP',description:'Cosmetic gear and fictional display collectibles. No functional weapons or combat equipment.',items:[['jacket','Street jacket','Wardrobe unlock','180'],['helmet','Riding helmet','Protective cosmetic unlock','120'],['flashlight','Flashlight','Utility inventory item','60'],['prop','Sci-fi display prop','Non-functional fictional collectible only','220']]}
};
function renderCityService(key:string){
 const data=cityServices[key as keyof typeof cityServices]||cityServices.MARKET;
 $('rc-service-title')!.textContent=data.title;$('rc-service-desc')!.textContent=data.description;
 $('rc-service-cash')!.textContent='CASH  ·  $'+cityCash.toLocaleString('en-US')+'     CONDITION  ·  '+Math.round(playerCondition)+'%';
 $('rc-service-items')!.innerHTML=data.items.map(([id,name,desc,price])=>'<div class="rc-service-item"><strong>'+name+' · $'+Number(price).toLocaleString('en-US')+'</strong><small>'+desc+'</small><button type="button" data-service-action="buy:'+id+'">SELECT</button></div>').join('');
 cityServicePanel.classList.add('open');cityServicePanel.dataset.service=key;
}
function openCityService(name:string){const key=name==='dealership'?'dealership':name==='gearStore'?'gearStore':name;renderCityService(key)}
function purchaseCityItem(id:string){
 const prices:Record<string,number>={snack:25,drink:15,map:40,heal:150,rest:0,repair:120,engine:250,handling:225,tires:200,paint:100,fuel:0,permit:75,report:0,safety:90,jacket:180,helmet:120,flashlight:60,prop:220,outfit:240,shoes:130,sedan:1600,suv:2600,van:2200};
 const labels:Record<string,string>={snack:'Quick meal',drink:'Energy drink',map:'City guide',heal:'Medical treatment',rest:'Recovery room',repair:'Full vehicle service',fuel:'Roadside check',permit:'Vehicle registration',report:'Lost property report',safety:'Safety kit',jacket:'Street jacket',helmet:'Riding helmet',flashlight:'Flashlight',prop:'Fictional display prop',outfit:'Urban outfit',shoes:'Street sneakers',sedan:'City sedan',suv:'Urban SUV',van:'Utility van'};
 Object.assign(labels,{engine:'Engine tune',handling:'Steering tune',tires:'Road tires',paint:'Custom paint'});const price=prices[id];if(price===undefined)return;
 let targetVehicle=inCar;
 if(['repair','engine','handling','tires','paint'].includes(id)&&!targetVehicle){let nearest=Infinity;for(const candidate of vehicles){if(candidate.traffic)continue;const distance=d2(player.position,candidate.g.position);if(distance<nearest){nearest=distance;targetVehicle=candidate}}if(!targetVehicle||nearest>14){say('Move closer to a vehicle before booking service');return}}
 if(cityCash<price){say('Not enough cash for '+labels[id]);return}
 if(id==='heal'||id==='rest'){cityCash-=price;playerCondition=100;stamina=100;say(id==='heal'?'Hospital treatment complete':'Recovery complete')}
 else if(id==='repair'){cityCash-=price;targetVehicle.health=100;targetVehicle.speed=0;targetVehicle.steer=0;say('Vehicle repaired · condition 100%')}
 else if(['engine','handling','tires'].includes(id)){const level=targetVehicle.upgrades[id]||0;if(level>=3){say(id+' already at maximum stage');return}cityCash-=price;targetVehicle.upgrades[id]=level+1;saveSettings();say(id+' upgraded to stage '+(level+1))}
 else if(id==='paint'){cityCash-=price;const colors=[0x347f9d,0xb9473e,0x9b8752,0x4d6f55,0x343b48];const current=targetVehicle.paintColor??0x347f9d;const next=colors[(colors.indexOf(current)+1+colors.length)%colors.length];targetVehicle.paintColor=next;targetVehicle.g.userData.bodyMaterial?.color?.setHex(next);say('Vehicle paint updated')}
 else if(id==='fuel'){say(inCar?'Vehicle inspection complete':'Visit the garage with a vehicle for service')}
 else if(id==='snack'||id==='drink'){cityCash-=price;stamina=Math.min(100,stamina+(id==='snack'?35:20));say(labels[id]+' purchased')}
 else if(id==='sedan'||id==='suv'||id==='van'){
  const offsets=[[4.8,3.5],[-4.8,3.5],[4.8,-3.5],[-4.8,-3.5],[7,0],[-7,0]];let spot=null;
  for(const [ox,oz] of offsets){const x=player.position.x+ox,z=player.position.z+oz;if(!blocked(x,z,1.25)){spot={x,z};break}}
  if(!spot){say('No safe parking space nearby · move to an open road');return}
  cityCash-=price;const color=id==='sedan'?0x347f9d:id==='suv'?0x9a7254:0xc3a64b;car(color,spot.x,spot.z,yaw,id);say(labels[id]+' purchased · added to your garage')
 }else if(id==='map'||id==='permit'||id==='report'||id==='safety'||id==='jacket'||id==='helmet'||id==='flashlight'||id==='prop'||id==='outfit'||id==='shoes'){
  if(cityInventory.includes(id)){say('Already owned: '+labels[id]);return}
  cityCash-=price;cityInventory.push(id);say(labels[id]+' added to inventory')
 }
 saveCityEconomy();renderCityService(cityServicePanel.dataset.service||'MARKET');
}
cityServicePanel.addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-service-action]');if(!button)return;
 const action=button.dataset.serviceAction;if(action==='close'){cityServicePanel.classList.remove('open');return}
 if(action?.startsWith('buy:'))purchaseCityItem(action.slice(4));
});
cityServicePanel.addEventListener('pointerdown',event=>{if(event.target===cityServicePanel)cityServicePanel.classList.remove('open')});
let appearanceState={outfit:'teal',skin:'warm',hair:'dark'};
try{const a=JSON.parse(localStorage.getItem('realcity-character')||'{}');if(['teal','crimson','navy','sand'].includes(a.outfit))appearanceState.outfit=a.outfit;if(['warm','medium','deep'].includes(a.skin))appearanceState.skin=a.skin;if(['dark','brown','blonde'].includes(a.hair))appearanceState.hair=a.hair}catch{}
const appearanceColors={outfit:{teal:0x20b7a5,crimson:0x9f3e4c,navy:0x334d78,sand:0xb69a70},skin:{warm:0xd6a77f,medium:0xa96f4f,deep:0x70452f},hair:{dark:0x30251f,brown:0x69432c,blonde:0xc6a65c}};
function applyPlayerAppearance(){const refs=player.userData.appearanceMaterials;if(refs){refs.shirt.color.setHex(appearanceColors.outfit[appearanceState.outfit]);refs.skin.color.setHex(appearanceColors.skin[appearanceState.skin]);refs.hair.color.setHex(appearanceColors.hair[appearanceState.hair])}player.traverse((object:any)=>{if(!object.isMesh||!object.material)return;const label=(object.name+' '+(object.material.name||'')).toLowerCase();const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials){if(!material?.color||refs&&Object.values(refs).includes(material))continue;if(/skin|face|head|hand|arm_skin/i.test(label))material.color.setHex(appearanceColors.skin[appearanceState.skin]);else if(/hair|beard/i.test(label))material.color.setHex(appearanceColors.hair[appearanceState.hair]);else if(/shirt|jacket|coat|hoodie|top|upper.?body|clothing/i.test(label))material.color.setHex(appearanceColors.outfit[appearanceState.outfit])}});player.userData.appearanceState={...appearanceState};try{localStorage.setItem('realcity-character',JSON.stringify(appearanceState))}catch{}}
applyPlayerAppearance();
const stageStyle=document.createElement('style');
stageStyle.textContent="#realcity-stage-actions{position:fixed;z-index:30;left:12px;top:148px;display:flex;flex-direction:column;gap:7px;pointer-events:auto}#realcity-stage-actions button{min-width:112px;padding:9px 11px;border:1px solid #d7f6ff35;border-radius:10px;background:rgba(12,29,36,.94);color:#e6fbf8;font:800 10px Inter,system-ui;letter-spacing:.06em}#realcity-stage-panel{position:fixed;inset:0;z-index:10010;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(3,9,12,.8);backdrop-filter:blur(9px);color:#edf4f2;font-family:Inter,system-ui,sans-serif}#realcity-stage-panel.open{display:flex}#realcity-stage-panel .stage-card{width:min(620px,100%);max-height:min(80vh,760px);overflow:auto;padding:22px;border:1px solid rgba(135,194,183,.35);border-radius:18px;background:linear-gradient(145deg,rgba(20,34,38,.99),rgba(8,16,20,.99));box-shadow:0 24px 90px #0009}#realcity-stage-panel h2{margin:4px 0 8px;font-size:23px;letter-spacing:1px}#realcity-stage-panel .stage-kicker{font-size:10px;letter-spacing:2px;color:#73d6c0;font-weight:900}#realcity-stage-panel .stage-close{float:right;width:36px;height:36px;border:1px solid #536b6b;border-radius:9px;background:#203237;color:#fff;font-size:22px}#realcity-stage-panel .stage-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid #ffffff1a}#realcity-stage-panel .stage-row strong{display:block;font-size:13px}#realcity-stage-panel .stage-row small{display:block;margin-top:4px;color:#a9bab8;font-size:11px;line-height:1.45}#realcity-stage-panel .stage-row button,#realcity-stage-panel .stage-choice{padding:9px 12px;border:0;border-radius:8px;background:#65cdb5;color:#071a18;font-weight:900;font-size:10px}#realcity-stage-panel button:disabled{opacity:.45}#realcity-stage-panel .stage-options{display:flex;flex-wrap:wrap;gap:8px;margin:9px 0 16px}#realcity-stage-panel .stage-choice{border:1px solid #ffffff22}#realcity-stage-panel .stage-choice.active{outline:2px solid #9cf0dc;background:#276b63;color:#fff}@media(max-width:520px){#realcity-stage-actions{top:142px;left:8px}#realcity-stage-actions button{min-width:96px;padding:8px;font-size:9px}#realcity-stage-panel .stage-card{padding:16px}#realcity-stage-panel h2{font-size:20px}}";
document.head.appendChild(stageStyle);
const stageActions=document.createElement('div');stageActions.id='realcity-stage-actions';stageActions.innerHTML='<button type="button" id="realcity-career-open">CAREER · MISSIONS</button><button type="button" id="realcity-wardrobe-open">WARDROBE</button>';document.body.appendChild(stageActions);
const stagePanel=document.createElement('section');stagePanel.id='realcity-stage-panel';stagePanel.setAttribute('aria-label','Career and character customization');stagePanel.innerHTML='<div class="stage-card"><button type="button" class="stage-close" data-stage-close aria-label="Close">×</button><div class="stage-kicker" id="stage-kicker">REALCITY · CAREER</div><h2 id="stage-title">CITY MISSIONS</h2><div id="stage-content"></div></div>';document.body.appendChild(stagePanel);
const missionDefinitions=[{id:'civic-checkin',title:'Civic Check-In',description:'Visit the city hospital and check in at the public entrance.',target:'HOSPITAL',reward:300,requiresVehicle:false,minSpeed:0},{id:'market-run',title:'Market Run',description:'Drive to the market and complete a quick city supply run.',target:'MARKET',reward:450,requiresVehicle:true,minSpeed:.8},{id:'garage-roadtest',title:'Garage Road Test',description:'Take a vehicle to the fuel and service district for a road test.',target:'FUEL',reward:550,requiresVehicle:true,minSpeed:1.5}];
let missionCompletedIds:string[]=[];let activeMissionId:string|null=null;
try{const c=JSON.parse(localStorage.getItem('realcity-career')||'{}');if(Array.isArray(c.completed))missionCompletedIds=c.completed.filter((id:string)=>missionDefinitions.some(m=>m.id===id));if(typeof c.active==='string'&&missionDefinitions.some(m=>m.id===c.active)&&!missionCompletedIds.includes(c.active))activeMissionId=c.active}catch{}
function saveCareer(){try{localStorage.setItem('realcity-career',JSON.stringify({completed:missionCompletedIds,active:activeMissionId}))}catch{}}
function renderCareer(){const active=missionDefinitions.find(m=>m.id===activeMissionId);$('stage-kicker')!.textContent='REALCITY · CAREER';$('stage-title')!.textContent='CITY MISSIONS';$('stage-content')!.innerHTML='<div style="padding:9px 0;color:#8ce4ce;font-size:11px">CASH · 
if(new URLSearchParams(location.search).has('qa')&&typeof (window as any).__REALCITY_QA__==='function'){
 const originalQa=(window as any).__REALCITY_QA__;
 (window as any).__REALCITY_QA__=()=>({...originalQa(),
  servicePoints:worldObjects.filter(o=>o.type==='landmark'||o.type==='dealership'||o.type==='gearStore').map(o=>({type:o.type,name:o.name||o.type,x:o.x,z:o.z})),
  doors:doors.map((d,index)=>({index,x:d.x,z:d.z,theme:resolveInteriorTheme(d)})),interiorMode,activeInteriorTheme,missionCompletedIds:[...missionCompletedIds],activeMissionId,appearanceState:{...appearanceState},vehicleUpgrades:vehicles.filter(v=>!v.traffic).map(v=>({...v.upgrades})),startMissionForTest:startCityMission,updateMissionProgressForTest:updateMissionProgress,enterInteriorForTest:enterInterior,exitInteriorForTest:exitInterior,moveVehicleForTest:(index,x,z)=>{const v=vehicles.filter(v=>!v.traffic)[index];if(!v)return false;v.g.position.set(x,0,z);v.g.visible=true;return true},
  cityCash,playerCondition,cityInventory:[...cityInventory],servicePanelOpen:cityServicePanel.classList.contains('open'),
  setPlayerConditionForTest:(value)=>{playerCondition=Math.max(0,Math.min(100,Number(value)||0));saveCityEconomy();return playerCondition},setAppearanceForTest:(key,value)=>{if(key in appearanceState&&value in (appearanceColors as any)[key]){(appearanceState as any)[key]=value;applyPlayerAppearance();return true}return false}
 });
}
$('timeBtn').addEventListener('click',()=>setNight(!nightMode));$('jump').addEventListener('click',startJump);
$('sprint').addEventListener('pointerdown',e=>{e.preventDefault();sprinting=true});['pointerup','pointercancel','pointerleave'].forEach(ev=>$('sprint').addEventListener(ev,()=>sprinting=false));
document.querySelectorAll<HTMLElement>('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=true;b.classList.add('down');b.setPointerCapture((e as PointerEvent).pointerId)});const off=()=>{keys[k]=false;b.classList.remove('down')};['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,off))});
addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(k==='escape'){setPaused(!paused);e.preventDefault();return}if(paused)return;keys[k]=true;if(k.startsWith('arrow')||k===' ')e.preventDefault();if(k===' ')startJump();if(k==='e'&&!e.repeat)performInteraction()});addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k==='s'||k==='arrowdown')reverseBrakeLatched=false});
renderer.domElement.addEventListener('pointerdown',e=>{if(e.target.closest?.('button'))return;dragging=true;lx=e.clientX;ly=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-lx)*.006;pitch=Math.max(-.08,Math.min(.72,pitch+(e.clientY-ly)*.003));lx=e.clientX;ly=e.clientY});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>renderer.domElement.addEventListener(ev,()=>dragging=false));
function staticBlocked(x,z,r){return staticCollisionQuery(x,z,r,r,b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r)}
function blocked(x,z,r=.65,ignoreVehicle=null){if(interiorMode)return Math.abs(x-roomX)>4.35-r||Math.abs(z-roomZ)>4.35-r;if(Math.abs(x)>329-r||Math.abs(z)>329-r)return true;if(staticBlocked(x,z,r))return true;for(const v of vehicles){if(v===ignoreVehicle)continue;const dx=x-v.g.position.x,dz=z-v.g.position.z,ang=v.g.rotation.y,c=Math.cos(ang),sn=Math.sin(ang),lx=dx*c-dz*sn,lz=dx*sn+dz*c;if(Math.abs(lx)<1.05+r*.35&&Math.abs(lz)<2.0+r*.45)return true}return false}
function vehicleBlocked(x,z,angle,vehicle){if(Math.abs(x)>327||Math.abs(z)>327)return true;const hx=Math.abs(Math.cos(angle))*1+Math.abs(Math.sin(angle))*1.9,hz=Math.abs(Math.sin(angle))*1+Math.abs(Math.cos(angle))*1.9;if(staticCollisionQuery(x,z,hx,hz,b=>Math.abs(x-b.x)<b.w/2+hx&&Math.abs(z-b.z)<b.d/2+hz))return true;for(const other of vehicles){if(other===vehicle)continue;const dx=other.g.position.x-x,dz=other.g.position.z-z;if(Math.abs(dx)<2.1&&Math.abs(dz)<3.6)return true}return false}
const map=$('map') as HTMLCanvasElement,ctx=map.getContext('2d')!;function drawMap(t){const W=map.width,H=map.height,sc=.72;ctx.clearRect(0,0,W,H);ctx.fillStyle='#18302f';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2-t.x*sc,H/2-t.z*sc);ctx.scale(sc,sc);ctx.fillStyle='#3d4a4d';for(let k=-CITY_HALF;k<=CITY_HALF;k++){ctx.fillRect(k*20-4,-CITY_EXTENT/2-20,8,CITY_EXTENT+40);ctx.fillRect(-CITY_EXTENT/2-20,k*20-4,CITY_EXTENT+40,8)}ctx.fillStyle='#85918a';const minBX=t.x-W/(2*sc)-6,maxBX=t.x+W/(2*sc)+6,minBZ=t.z-H/(2*sc)-6,maxBZ=t.z+H/(2*sc)+6;for(let gz=Math.floor(minBZ/SPATIAL_CELL_SIZE);gz<=Math.floor(maxBZ/SPATIAL_CELL_SIZE);gz++)for(let gx=Math.floor(minBX/SPATIAL_CELL_SIZE);gx<=Math.floor(maxBX/SPATIAL_CELL_SIZE);gx++){const bucket=staticCollisionGrid.get(gx+':'+gz);if(!bucket)continue;for(const b of bucket)if(b.x+b.w/2>=minBX&&b.x-b.w/2<=maxBX&&b.z+b.d/2>=minBZ&&b.z-b.d/2<=maxBZ)ctx.fillRect(b.x-b.w/2,b.z-b.d/2,b.w,b.d)}ctx.fillStyle='#d8b55b';for(const p of pedestrians)ctx.fillRect(p.position.x-1,p.position.z-1,2,2);for(const v of vehicles){ctx.fillStyle=v===inCar?'#fff':'#d75b4b';ctx.fillRect(v.g.position.x-1.2,v.g.position.z-2,2.4,4)}for(const service of worldObjects){if(service.type==='landmark'||service.type==='dealership'||service.type==='gearStore'){ctx.fillStyle=service.type==='landmark'?'#e4c16d':service.type==='dealership'?'#55a9d4':'#b58b62';ctx.fillRect(service.x-1.8,service.z-1.8,3.6,3.6)}}if(activeMissionId){const mission=missionDefinitions.find(m=>m.id===activeMissionId),target=mission&&worldObjects.find(o=>o.type==='landmark'&&o.name===mission.target);if(target){ctx.fillStyle='#f2d36f';ctx.beginPath();ctx.arc(target.x,target.z,4,0,Math.PI*2);ctx.strokeStyle='#f2d36f';ctx.lineWidth=1.4;ctx.stroke()}}ctx.fillStyle='#61f0d2';ctx.beginPath();ctx.arc(t.x,t.z,2.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#61f0d2';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(t.x,t.z);ctx.lineTo(t.x+Math.sin(yaw)*7,t.z+Math.cos(yaw)*7);ctx.stroke();ctx.restore()}
function update(dt){if(paused)return;elapsed+=dt;aiFrame++;updateMissionProgress();
if(!interiorMode)for(const v of traffic){if(v===inCar)continue;const td=v.trafficData;if(!td)continue;const p=v.g.position;const target=inCar?inCar.g.position:player.position;const dx=p.x-target.x,dz=p.z-target.z,userGap=Math.hypot(dx,dz),userAcross=td.axis==='z'?Math.abs(target.x-td.lane):Math.abs(target.z-td.lane);let gap=1e9;for(const other of traffic){if(other===v||other.trafficData.axis!==td.axis)continue;const op=other.g.position;const along=td.axis==='z'?(op.z-p.z)*td.dir:(op.x-p.x)*td.dir;const across=td.axis==='z'?Math.abs(op.x-p.x):Math.abs(op.z-p.z);if(along>0&&along<12&&across<2.8)gap=Math.min(gap,along)}if(userAcross<3.2&&userGap<5.5)gap=Math.min(gap,Math.max(0,userGap-.8));const nearUser=gap<5.5;let speed=nearUser?Math.min(td.speed,Math.max(0,gap-.8)*.85):gap<12?td.speed*Math.min(1,(gap-5.5)/6.5):td.speed;for(const ped of pedestrians){const pp=ped.position,along=td.axis==='z'?(pp.z-p.z)*td.dir:(pp.x-p.x)*td.dir,across=td.axis==='z'?Math.abs(pp.x-td.lane):Math.abs(pp.z-td.lane);if(along>0&&along<5&&across<1.6)speed=Math.min(speed,Math.max(0,along-1.2)*.8)}let nx=p.x,nz=p.z;if(td.axis==='z'){nx=td.lane;nz=p.z+td.dir*speed*dt;v.g.rotation.y=td.dir>0?0:Math.PI}else{nz=td.lane;nx=p.x+td.dir*speed*dt;v.g.rotation.y=td.dir>0?Math.PI/2:-Math.PI/2}if(speed>0){const pedestrianBlocked=pedestrians.some(ped=>Math.hypot(ped.position.x-nx,ped.position.z-nz)<2.4);if(pedestrianBlocked||vehicleBlocked(nx,nz,v.g.rotation.y,v))speed=0;else{p.x=nx;p.z=nz;if(p.z>314)p.z=-314;if(p.z< -314)p.z=314;if(p.x>314)p.x=-314;if(p.x< -314)p.x=314}}}
const f=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),s=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
if(inCar){$('drivepad').classList.add('visible');$('vehicleStatus').style.display='block';$('vehicleHealth').style.width=inCar.health+'%';$('vehicleHealthText').textContent=Math.round(inCar.health)+'%';const v=inCar;const speedStep=integrateVehicleSpeed(v.speed,f,dt,reverseBrakeLatched,1+(v.upgrades?.engine||0)*.13);v.speed=speedStep.speed;reverseBrakeLatched=speedStep.brakeLatched;const speedFactor=Math.min(1,Math.abs(v.speed)/5);v.steer+=(s-v.steer)*Math.min(1,dt*5);v.g.rotation.y+=v.steer*dt*(.16+speedFactor*.88)*(1+(v.upgrades?.handling||0)*.12+(v.upgrades?.tires||0)*.06)*(v.speed<-.1?-1:1);const nx=v.g.position.x+Math.sin(v.g.rotation.y)*v.speed*dt,nz=v.g.position.z+Math.cos(v.g.rotation.y)*v.speed*dt;let hit=false;if(!vehicleBlocked(nx,v.g.position.z,v.g.rotation.y,v)){v.g.position.x=nx}else hit=true;if(!vehicleBlocked(v.g.position.x,nz,v.g.rotation.y,v)){v.g.position.z=nz}else hit=true;if(hit){if(Math.abs(v.speed)>2.2&&elapsed-(v.lastCollisionTime??-10)>.85){v.health=Math.max(0,v.health-Math.max(1,Math.abs(v.speed)*1.2));v.lastCollisionTime=elapsed;say('Collision · vehicle condition '+Math.round(v.health)+'%')}v.speed*=-.12;v.steer*=.5}const maxSpeed=14.5*(1+(v.upgrades?.engine||0)*.12)*(.35+.65*v.health/100);v.speed=Math.max(-Math.min(5.5,maxSpeed*.5),Math.min(maxSpeed,v.speed));for(const wheel of v.g.userData.wheels||[]){wheel.rotation.x+=v.speed*dt*2.8;if(wheel.userData.steerable)wheel.rotation.y=v.steer*.35;}v.g.rotation.z=-v.steer*speedFactor*.035;$('state').textContent='Driving · '+Math.round(Math.abs(v.speed)*7)+' km/h'}
else{$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none';if(sprinting&&(f||s))stamina=Math.max(0,stamina-dt*26);else stamina=Math.min(100,stamina+dt*14);const sp=sprinting&&stamina>0?7.5:4.3,dx=(Math.sin(yaw)*f+Math.cos(yaw)*s)*sp*dt,dz=(Math.cos(yaw)*f-Math.sin(yaw)*s)*sp*dt;let nx=player.position.x+dx,nz=player.position.z+dz;if(!blocked(nx,player.position.z,.52,inCar))player.position.x=nx;if(!blocked(player.position.x,nz,.52,inCar))player.position.z=nz;if(f||s)player.rotation.y=Math.atan2(dx,dz);player.rotation.z=(s||0)*-.035;player.position.y+=jumpV*dt;if(player.position.y>jumpPeak)jumpPeak=player.position.y;jumpV-=13*dt;if(player.position.y<0){player.position.y=0;jumpV=0}let moving=!!(f||s);const gait=moving?Math.sin(elapsed*(sprinting?14:10))*(sprinting?.8:.55):0;if(player.userData.riggedAsset){animateRiggedPlayer(gait,moving,elapsed,dt,player.position.y>.06,sprinting&&stamina>0)}else{player.userData.legs[0].rotation.x=gait;player.userData.legs[1].rotation.x=-gait;const knees=player.userData.knees||[];if(knees[0])knees[0].rotation.x=Math.max(0,-gait)*(sprinting?1.05:.72);if(knees[1])knees[1].rotation.x=Math.max(0,gait)*(sprinting?1.05:.72);player.userData.arms[0].rotation.x=-gait*.58;player.userData.arms[1].rotation.x=gait*.58;const elbows=player.userData.elbows||[];if(elbows[0])elbows[0].rotation.x=moving?-.12-Math.max(0,gait)*.32:0;if(elbows[1])elbows[1].rotation.x=moving?-.12-Math.max(0,-gait)*.32:0;const feet=player.userData.feet||[];if(feet[0])feet[0].rotation.x=moving?Math.max(0,gait)*.14:0;if(feet[1])feet[1].rotation.x=moving?Math.max(0,-gait)*.14:0;player.rotation.x=moving?Math.sin(elapsed*(sprinting?14:10)+Math.PI/2)*.018:0;for(const h of player.userData.hands||[])for(let fi=0;fi<h.fingers.length;fi++)h.fingers[fi].rotation.x=moving?Math.sin(elapsed*5+fi*.8+h.side)*.025:0;if(player.userData.torso){player.userData.torso.position.y=1.13+(moving?Math.abs(gait)*.025:0);player.userData.torso.rotation.z=Math.sin(elapsed*2.4)*.012}}$('state').textContent=sprinting&&stamina>0?'Sprinting':'On foot · Exploring'}
$('stamina').style.width=stamina+'%';$('staminaText').textContent=Math.round(stamina)+'%';
if(!interiorMode)for(const p of pedestrians){const u=p.userData;u.phase+=dt;const step=stepPedestrian(p,{now:elapsed,dt,agents:pedestrians,blocked:(x,z,r)=>blocked(x,z,r),chooseGoal:pedestrianWaypoint,frame:aiFrame});const {gd,nearPed,nx,nz,dir}=step;u.gd=gd;u.nearPed=nearPed;u.moving=step.moving;u.dir=dir;if(step.moving){p.position.x=nx;p.position.z=nz} p.rotation.y=u.dir;const gait=u.moving?Math.sin(elapsed*7+u.phase)*.48:0;u.legs[0].rotation.x=gait;u.legs[1].rotation.x=-gait;const knees=u.knees||[];if(knees[0])knees[0].rotation.x=Math.max(0,-gait)*.62;if(knees[1])knees[1].rotation.x=Math.max(0,gait)*.62;u.arms[0].rotation.x=-gait*.58;u.arms[1].rotation.x=gait*.58;const elbows=u.elbows||[];if(elbows[0])elbows[0].rotation.x=-.1-Math.max(0,gait)*.24;if(elbows[1])elbows[1].rotation.x=-.1-Math.max(0,-gait)*.24;const feet=u.feet||[];if(feet[0])feet[0].rotation.x=Math.max(0,gait)*.12;if(feet[1])feet[1].rotation.x=Math.max(0,-gait)*.12;for(const h of p.userData.hands||[])for(let fi=0;fi<h.fingers.length;fi++)h.fingers[fi].rotation.x=Math.sin(elapsed*3.5+fi*.7+h.side+u.phase)*.018;if(u.torso){u.torso.position.y=1.13+Math.abs(gait)*.025;u.torso.rotation.z=Math.sin(elapsed*2+u.phase)*.018}if(u.importedPedestrian){const rig=u.importedPedestrian,moving=gd>=2&&!nearPed&&!blocked(nx,nz,.42),desired=moving?'walk':'idle';if(rig.proceduralBones){const gait=moving?Math.sin(elapsed*7+u.phase)*.62:0;for(const item of Object.values(rig.proceduralBones) as any[]){item.delta.setFromAxisAngle(item.axis,gait*item.sign*item.weight);item.bone.quaternion.copy(item.rest).multiply(item.delta)}rig.model.position.y=rig.baseY+(moving?Math.abs(gait)*.018:Math.sin(elapsed*1.8+u.phase)*.003);rig.activeActionName=desired}else{const next=rig.actions[desired];if(rig.activeActionName!==desired&&next){next.reset().play();rig.activeAction?.crossFadeTo(next,.2,false);rig.activeAction=next;rig.activeActionName=desired}rig.mixer.update(dt)}}}
const t=inCar?inCar.g.position:player.position;cameraLookTarget.set(t.x,t.y+(inCar?1.1:1.35),t.z);const dist=(inCar?9:7)+(inCar?Math.min(2,Math.abs(inCar.speed)*.07):0);cameraPositionTarget.set(t.x-Math.sin(yaw)*Math.cos(pitch)*dist,t.y+2.1+Math.sin(pitch)*dist,t.z-Math.cos(yaw)*Math.cos(pitch)*dist);cameraDirectionTarget.copy(cameraPositionTarget).sub(cameraLookTarget);const camDistance=cameraDirectionTarget.length();cameraDirectionTarget.normalize();let nearestHit=Infinity;for(const blocker of nearbyCameraBlockers(cameraLookTarget.x,cameraLookTarget.z,camDistance+7.2)){const distance=rayBoxHitDistance(cameraLookTarget,cameraDirectionTarget,blocker,camDistance,.25);if(distance<nearestHit)nearestHit=distance}if(Number.isFinite(nearestHit))cameraPositionTarget.copy(cameraLookTarget).addScaledVector(cameraDirectionTarget,Math.max(1,nearestHit-.4));camera.position.lerp(cameraPositionTarget,1-Math.pow(.001,dt));camera.lookAt(cameraLookTarget);mapUpdateElapsed+=dt;if(mapUpdateElapsed>=.1){mapUpdateElapsed-=.1;drawMap(t)}const target=nearestInteraction();$('interact').textContent=target?({car:'ENTER VEHICLE',carExit:'EXIT VEHICLE',door:'ENTER BUILDING',interiorExit:'EXIT INTERIOR',kiosk:'USE CITY KIOSK',landmark:'OPEN CITY SERVICE',dealership:'OPEN AUTO DEALER',gearStore:'OPEN GEAR SHOP',pedestrian:'TALK TO PEDESTRIAN'}[target.type]||'INTERACT'):'INTERACT'}
function applyQuality(q){
 quality=Math.max(0,Math.min(3,q));
 const names=['LOW','BALANCED','HIGH','ULTRA'];
 applyRendererResolution();
 const maxAniso=renderer.capabilities.getMaxAnisotropy();
 for(const tex of [asphaltDetail,concreteDetail,facadeDetail])if(tex)tex.anisotropy=Math.min(maxAniso,quality>=3?8:quality>=2?4:quality>=1?2:1);
 // Balanced mobile skips the shadow map; High/Ultra restore controlled-quality shadows.
 renderer.shadowMap.enabled=quality>=1&&(!mobileSafeDefault||quality>=2);
 scene.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.isMesh&&mesh.userData.importedEnvironmentAssetMesh){mesh.receiveShadow=quality>=2;mesh.castShadow=quality>=3}});
 renderer.shadowMap.type=quality>=2?THREE.PCFSoftShadowMap:THREE.BasicShadowMap;
 const shadowSize=quality>=3?(mobileSafeDefault?1024:1536):quality>=2?(mobileSafeDefault?512:768):quality>=1?512:256;
 sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.needsUpdate=true;
 $('qualityText').textContent=names[quality];$('menuQualityBtn').textContent='GRAPHICS: '+names[quality];
 $('perf').textContent='FPS '+(shownFps||'--')+' · '+names[quality]+' · '+playerAssetStatus;saveSettings()
}
// Distance-cull static city detail in coarse intervals. Long road/ground meshes marked
// alwaysVisible stay active so the road network never disappears at the edge of the view.
let staticCullElapsed=0;
function updateStaticCityVisibility(dt){
 staticCullElapsed+=dt;
 if(staticCullElapsed<.18)return;
 staticCullElapsed=0;
 // Tighten low/mobile visibility radii to avoid submitting hundreds of distant facade/detail meshes.
 const radius=[42,56,92,140][quality],radiusSq=radius*radius,cx=camera.position.x,cz=camera.position.z;
 for(const mesh of cityStaticMeshes){
  if(mesh.userData.cityStatic===false||mesh.userData.alwaysVisible)continue;
  const mx=typeof mesh.userData.cullX==='number'?mesh.userData.cullX:mesh.position.x,mz=typeof mesh.userData.cullZ==='number'?mesh.userData.cullZ:mesh.position.z;
  const dx=mx-cx,dz=mz-cz;
  const paddedRadius=radius+(typeof mesh.userData.cullPadding==='number'?mesh.userData.cullPadding:0),shouldShow=dx*dx+dz*dz<=paddedRadius*paddedRadius;
  if(mesh.visible!==shouldShow)mesh.visible=shouldShow;
 }
 // Skinned pedestrians and multi-part traffic models are draw-call expensive.
 // Keep simulation/collision active but only render actors near the player.
 const target=inCar?inCar.g.position:player.position,tx=target.x,tz=target.z;
 const pedRadius=[36,48,70,95][quality],pedRadiusSq=pedRadius*pedRadius;
 for(const p of pedestrians){const dx=p.position.x-tx,dz=p.position.z-tz,show=dx*dx+dz*dz<=pedRadiusSq;if(p.visible!==show)p.visible=show}
 const vehicleRadius=[48,64,90,120][quality],vehicleRadiusSq=vehicleRadius*vehicleRadius;
 for(const v of vehicles){if(v===inCar){if(!v.g.visible)v.g.visible=true;continue}const dx=v.g.position.x-tx,dz=v.g.position.z-tz,show=dx*dx+dz*dz<=vehicleRadiusSq;if(v.g.visible!==show)v.g.visible=show}
}
function setPaused(v){paused=v;$('pauseMenu').classList.toggle('open',paused);$('pauseBtn').textContent=paused?'▶ RESUME':'Ⅱ PAUSE';if(paused)clearInputs();say(paused?'Game paused':'Back to the city')}
function recover(){if(inCar){const v=inCar;v.speed=0;v.steer=0;v.health=100;let spot=null;for(const side of [-1.8,1.8]){const off=new THREE.Vector3(side,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),v.g.rotation.y),x=v.g.position.x+off.x,z=v.g.position.z+off.z;if(!blocked(x,z,.62,v)){spot={x,z};break}}if(spot)player.position.set(spot.x,0,spot.z);else player.position.set(0,0,23);inCar=null;player.visible=true;$('interact').textContent='ENTER VEHICLE'}else{player.position.set(0,0,23);for(const v of vehicles){v.speed=0;v.health=100}}jumpV=0;stamina=100;$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none';yaw=0;pitch=.22;setPaused(false);saveSettings();say('Recovery complete')}
$('pauseBtn').addEventListener('click',()=>setPaused(!paused));$('resumeBtn').addEventListener('click',()=>setPaused(false));$('recoverBtn').addEventListener('click',recover);$('restartBtn').addEventListener('click',()=>{saveSettings();location.reload()});$('menuQualityBtn').addEventListener('click',()=>applyQuality((quality+1)%4));$('menuTimeBtn').addEventListener('click',()=>setNight(!nightMode));
$('qualityBtn').addEventListener('click',()=>{applyQuality((quality+1)%4);say('Graphics preset: '+$('qualityText').textContent)});
function bindHold(id,key){const el=$(id);const on=e=>{e.preventDefault();keys[key]=true;el.classList.add('down');try{el.setPointerCapture(e.pointerId)}catch{}};const off=()=>{keys[key]=false;if(key==='s')reverseBrakeLatched=false;el.classList.remove('down')};el.addEventListener('pointerdown',on);['pointerup','pointercancel','lostpointercapture','pointerleave'].forEach(ev=>el.addEventListener(ev,off))}
bindHold('gasBtn','w');bindHold('brakeBtn','s');
addEventListener('pagehide',()=>{clearInputs();saveSettings()});let autosaveElapsed=0,cpuMsSum=0,cpuMsSamples=0,cpuMsPeak=0,updateCpuMsSum=0,updateCpuMsSamples=0,updateCpuMsPeak=0,renderCpuMsSum=0,renderCpuMsSamples=0,renderCpuMsPeak=0,lastCpuAvgMs=0,lastCpuPeakMs=0,lastUpdateCpuAvgMs=0,lastUpdateCpuPeakMs=0,lastRenderCpuAvgMs=0,lastRenderCpuPeakMs=0;function frame(){requestAnimationFrame(frame);const workStart=performance.now();const rawDt=clock.getDelta();let dt=Math.min(rawDt,.04);autosaveElapsed+=dt;if(autosaveElapsed>=12){autosaveElapsed=0;saveSettings()}fpsElapsed+=rawDt;fpsFrames++;debugFrameTimes.push(rawDt*1000);if(debugFrameTimes.length>240)debugFrameTimes.shift();if(fpsElapsed>=.5){shownFps=Math.round(fpsFrames/fpsElapsed);const avgCpu=cpuMsSamples?cpuMsSum/cpuMsSamples:0;lastCpuAvgMs=avgCpu;lastCpuPeakMs=cpuMsPeak;lastUpdateCpuAvgMs=updateCpuMsSamples?updateCpuMsSum/updateCpuMsSamples:0;lastUpdateCpuPeakMs=updateCpuMsPeak;lastRenderCpuAvgMs=renderCpuMsSamples?renderCpuMsSum/renderCpuMsSamples:0;lastRenderCpuPeakMs=renderCpuMsPeak;if(debugOverlay){const sorted=[...debugFrameTimes].sort((a,b)=>a-b),p95=sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]:0;debugOverlay.textContent='REALCITY PERF (measurement only)\\nFPS: '+shownFps+'\\np95 frame: '+p95.toFixed(1)+' ms\\nNPCs: '+pedestrians.length+'\\nBuild: '+buildSha;} $('perf').textContent='FPS '+shownFps+' · JS '+avgCpu.toFixed(1)+'/'+cpuMsPeak.toFixed(1)+'ms · DC '+renderer.info.render.calls+' · TRI '+renderer.info.render.triangles+' · GEO '+renderer.info.memory.geometries+' · TEX '+renderer.info.memory.textures+' · MAP≈1MB* · '+['LOW','BALANCED','HIGH','ULTRA'][quality]+' · '+playerAssetStatus;fpsFrames=0;fpsElapsed=0;cpuMsSum=0;cpuMsSamples=0;cpuMsPeak=0;updateCpuMsSum=0;updateCpuMsSamples=0;updateCpuMsPeak=0;renderCpuMsSum=0;renderCpuMsSamples=0;renderCpuMsPeak=0;if(mobileSafeDefault){if(shownFps<24){adaptiveLowElapsed+=.5;adaptiveHighElapsed=0}else if(shownFps>38){adaptiveHighElapsed+=.5;adaptiveLowElapsed=0}else{adaptiveLowElapsed=Math.max(0,adaptiveLowElapsed-.5);adaptiveHighElapsed=0}adaptiveScaleElapsed+=.5;if(adaptiveScaleElapsed>=2){adaptiveScaleElapsed=0;const scaleCeiling=[1.0,1.1,1.25,1.5][quality];let next=mobileRenderScale;if(adaptiveLowElapsed>=2){next=Math.max(.85,mobileRenderScale-.05);adaptiveLowElapsed=0}else if(adaptiveHighElapsed>=6){next=Math.min(scaleCeiling,mobileRenderScale+.025);adaptiveHighElapsed=0}if(Math.abs(next-mobileRenderScale)>.005){mobileRenderScale=next;applyRendererResolution()}}}}let updateCpuNow=0,renderCpuNow=0;if(!paused){const updateStart=performance.now();update(dt);updateStaticCityVisibility(dt);updateCpuNow=performance.now()-updateStart;const renderStart=performance.now();renderer.render(scene,camera);renderCpuNow=performance.now()-renderStart}const cpuMs=performance.now()-workStart;cpuMsSum+=cpuMs;cpuMsSamples++;cpuMsPeak=Math.max(cpuMsPeak,cpuMs);if(!paused){updateCpuMsSum+=updateCpuNow;updateCpuMsSamples++;updateCpuMsPeak=Math.max(updateCpuMsPeak,updateCpuNow);renderCpuMsSum+=renderCpuNow;renderCpuMsSamples++;renderCpuMsPeak=Math.max(renderCpuMsPeak,renderCpuNow)}}frame();applyQuality(quality);if(nightMode)setNight(true);
// One four-preset graphics controller is shared by the HUD and pause menu.
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyRendererResolution()});
loadfill.style.width='100%';loadnote.textContent='City ready · entering world';requestAnimationFrame(()=>requestAnimationFrame(()=>{load.style.opacity='0';setTimeout(()=>load.remove(),250);say('City ready') }));
+cityCash.toLocaleString('en-US')+' · COMPLETED · '+missionCompletedIds.length+'/'+missionDefinitions.length+'</div>'+missionDefinitions.map(m=>{const done=missionCompletedIds.includes(m.id),isActive=activeMissionId===m.id;return '<div class="stage-row"><div><strong>'+m.title+(done?' · COMPLETE':isActive?' · ACTIVE':'')+'</strong><small>'+m.description+'<br>Reward: 
if(new URLSearchParams(location.search).has('qa')&&typeof (window as any).__REALCITY_QA__==='function'){
 const originalQa=(window as any).__REALCITY_QA__;
 (window as any).__REALCITY_QA__=()=>({...originalQa(),
  servicePoints:worldObjects.filter(o=>o.type==='landmark'||o.type==='dealership'||o.type==='gearStore').map(o=>({type:o.type,name:o.name||o.type,x:o.x,z:o.z})),
  cityCash,playerCondition,cityInventory:[...cityInventory],servicePanelOpen:cityServicePanel.classList.contains('open'),
  setPlayerConditionForTest:(value)=>{playerCondition=Math.max(0,Math.min(100,Number(value)||0));saveCityEconomy();return playerCondition}
 });
}
$('timeBtn').addEventListener('click',()=>setNight(!nightMode));$('jump').addEventListener('click',startJump);
$('sprint').addEventListener('pointerdown',e=>{e.preventDefault();sprinting=true});['pointerup','pointercancel','pointerleave'].forEach(ev=>$('sprint').addEventListener(ev,()=>sprinting=false));
document.querySelectorAll<HTMLElement>('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=true;b.classList.add('down');b.setPointerCapture((e as PointerEvent).pointerId)});const off=()=>{keys[k]=false;b.classList.remove('down')};['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,off))});
addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(k==='escape'){setPaused(!paused);e.preventDefault();return}if(paused)return;keys[k]=true;if(k.startsWith('arrow')||k===' ')e.preventDefault();if(k===' ')startJump();if(k==='e'&&!e.repeat)performInteraction()});addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k==='s'||k==='arrowdown')reverseBrakeLatched=false});
renderer.domElement.addEventListener('pointerdown',e=>{if(e.target.closest?.('button'))return;dragging=true;lx=e.clientX;ly=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-lx)*.006;pitch=Math.max(-.08,Math.min(.72,pitch+(e.clientY-ly)*.003));lx=e.clientX;ly=e.clientY});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>renderer.domElement.addEventListener(ev,()=>dragging=false));
function staticBlocked(x,z,r){return staticCollisionQuery(x,z,r,r,b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r)}
function blocked(x,z,r=.65,ignoreVehicle=null){if(interiorMode)return Math.abs(x-roomX)>4.35-r||Math.abs(z-roomZ)>4.35-r;if(Math.abs(x)>329-r||Math.abs(z)>329-r)return true;if(staticBlocked(x,z,r))return true;for(const v of vehicles){if(v===ignoreVehicle)continue;const dx=x-v.g.position.x,dz=z-v.g.position.z,ang=v.g.rotation.y,c=Math.cos(ang),sn=Math.sin(ang),lx=dx*c-dz*sn,lz=dx*sn+dz*c;if(Math.abs(lx)<1.05+r*.35&&Math.abs(lz)<2.0+r*.45)return true}return false}
function vehicleBlocked(x,z,angle,vehicle){if(Math.abs(x)>327||Math.abs(z)>327)return true;const hx=Math.abs(Math.cos(angle))*1+Math.abs(Math.sin(angle))*1.9,hz=Math.abs(Math.sin(angle))*1+Math.abs(Math.cos(angle))*1.9;if(staticCollisionQuery(x,z,hx,hz,b=>Math.abs(x-b.x)<b.w/2+hx&&Math.abs(z-b.z)<b.d/2+hz))return true;for(const other of vehicles){if(other===vehicle)continue;const dx=other.g.position.x-x,dz=other.g.position.z-z;if(Math.abs(dx)<2.1&&Math.abs(dz)<3.6)return true}return false}
const map=$('map') as HTMLCanvasElement,ctx=map.getContext('2d')!;function drawMap(t){const W=map.width,H=map.height,sc=.72;ctx.clearRect(0,0,W,H);ctx.fillStyle='#18302f';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2-t.x*sc,H/2-t.z*sc);ctx.scale(sc,sc);ctx.fillStyle='#3d4a4d';for(let k=-CITY_HALF;k<=CITY_HALF;k++){ctx.fillRect(k*20-4,-CITY_EXTENT/2-20,8,CITY_EXTENT+40);ctx.fillRect(-CITY_EXTENT/2-20,k*20-4,CITY_EXTENT+40,8)}ctx.fillStyle='#85918a';const minBX=t.x-W/(2*sc)-6,maxBX=t.x+W/(2*sc)+6,minBZ=t.z-H/(2*sc)-6,maxBZ=t.z+H/(2*sc)+6;for(let gz=Math.floor(minBZ/SPATIAL_CELL_SIZE);gz<=Math.floor(maxBZ/SPATIAL_CELL_SIZE);gz++)for(let gx=Math.floor(minBX/SPATIAL_CELL_SIZE);gx<=Math.floor(maxBX/SPATIAL_CELL_SIZE);gx++){const bucket=staticCollisionGrid.get(gx+':'+gz);if(!bucket)continue;for(const b of bucket)if(b.x+b.w/2>=minBX&&b.x-b.w/2<=maxBX&&b.z+b.d/2>=minBZ&&b.z-b.d/2<=maxBZ)ctx.fillRect(b.x-b.w/2,b.z-b.d/2,b.w,b.d)}ctx.fillStyle='#d8b55b';for(const p of pedestrians)ctx.fillRect(p.position.x-1,p.position.z-1,2,2);for(const v of vehicles){ctx.fillStyle=v===inCar?'#fff':'#d75b4b';ctx.fillRect(v.g.position.x-1.2,v.g.position.z-2,2.4,4)}for(const service of worldObjects){if(service.type==='landmark'||service.type==='dealership'||service.type==='gearStore'){ctx.fillStyle=service.type==='landmark'?'#e4c16d':service.type==='dealership'?'#55a9d4':'#b58b62';ctx.fillRect(service.x-1.8,service.z-1.8,3.6,3.6)}}ctx.fillStyle='#61f0d2';ctx.beginPath();ctx.arc(t.x,t.z,2.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#61f0d2';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(t.x,t.z);ctx.lineTo(t.x+Math.sin(yaw)*7,t.z+Math.cos(yaw)*7);ctx.stroke();ctx.restore()}
function update(dt){if(paused)return;elapsed+=dt;aiFrame++;
if(!interiorMode)for(const v of traffic){if(v===inCar)continue;const td=v.trafficData;if(!td)continue;const p=v.g.position;const target=inCar?inCar.g.position:player.position;const dx=p.x-target.x,dz=p.z-target.z,userGap=Math.hypot(dx,dz),userAcross=td.axis==='z'?Math.abs(target.x-td.lane):Math.abs(target.z-td.lane);let gap=1e9;for(const other of traffic){if(other===v||other.trafficData.axis!==td.axis)continue;const op=other.g.position;const along=td.axis==='z'?(op.z-p.z)*td.dir:(op.x-p.x)*td.dir;const across=td.axis==='z'?Math.abs(op.x-p.x):Math.abs(op.z-p.z);if(along>0&&along<12&&across<2.8)gap=Math.min(gap,along)}if(userAcross<3.2&&userGap<5.5)gap=Math.min(gap,Math.max(0,userGap-.8));const nearUser=gap<5.5;let speed=nearUser?Math.min(td.speed,Math.max(0,gap-.8)*.85):gap<12?td.speed*Math.min(1,(gap-5.5)/6.5):td.speed;for(const ped of pedestrians){const pp=ped.position,along=td.axis==='z'?(pp.z-p.z)*td.dir:(pp.x-p.x)*td.dir,across=td.axis==='z'?Math.abs(pp.x-td.lane):Math.abs(pp.z-td.lane);if(along>0&&along<5&&across<1.6)speed=Math.min(speed,Math.max(0,along-1.2)*.8)}let nx=p.x,nz=p.z;if(td.axis==='z'){nx=td.lane;nz=p.z+td.dir*speed*dt;v.g.rotation.y=td.dir>0?0:Math.PI}else{nz=td.lane;nx=p.x+td.dir*speed*dt;v.g.rotation.y=td.dir>0?Math.PI/2:-Math.PI/2}if(speed>0){const pedestrianBlocked=pedestrians.some(ped=>Math.hypot(ped.position.x-nx,ped.position.z-nz)<2.4);if(pedestrianBlocked||vehicleBlocked(nx,nz,v.g.rotation.y,v))speed=0;else{p.x=nx;p.z=nz;if(p.z>314)p.z=-314;if(p.z< -314)p.z=314;if(p.x>314)p.x=-314;if(p.x< -314)p.x=314}}}
const f=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),s=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
if(inCar){$('drivepad').classList.add('visible');$('vehicleStatus').style.display='block';$('vehicleHealth').style.width=inCar.health+'%';$('vehicleHealthText').textContent=Math.round(inCar.health)+'%';const v=inCar;const speedStep=integrateVehicleSpeed(v.speed,f,dt,reverseBrakeLatched,1+(v.upgrades?.engine||0)*.13);v.speed=speedStep.speed;reverseBrakeLatched=speedStep.brakeLatched;const speedFactor=Math.min(1,Math.abs(v.speed)/5);v.steer+=(s-v.steer)*Math.min(1,dt*5);v.g.rotation.y+=v.steer*dt*(.16+speedFactor*.88)*(1+(v.upgrades?.handling||0)*.12+(v.upgrades?.tires||0)*.06)*(v.speed<-.1?-1:1);const nx=v.g.position.x+Math.sin(v.g.rotation.y)*v.speed*dt,nz=v.g.position.z+Math.cos(v.g.rotation.y)*v.speed*dt;let hit=false;if(!vehicleBlocked(nx,v.g.position.z,v.g.rotation.y,v)){v.g.position.x=nx}else hit=true;if(!vehicleBlocked(v.g.position.x,nz,v.g.rotation.y,v)){v.g.position.z=nz}else hit=true;if(hit){if(Math.abs(v.speed)>2.2&&elapsed-(v.lastCollisionTime??-10)>.85){v.health=Math.max(0,v.health-Math.max(1,Math.abs(v.speed)*1.2));v.lastCollisionTime=elapsed;say('Collision · vehicle condition '+Math.round(v.health)+'%')}v.speed*=-.12;v.steer*=.5}const maxSpeed=14.5*(1+(v.upgrades?.engine||0)*.12)*(.35+.65*v.health/100);v.speed=Math.max(-Math.min(5.5,maxSpeed*.5),Math.min(maxSpeed,v.speed));for(const wheel of v.g.userData.wheels||[]){wheel.rotation.x+=v.speed*dt*2.8;if(wheel.userData.steerable)wheel.rotation.y=v.steer*.35;}v.g.rotation.z=-v.steer*speedFactor*.035;$('state').textContent='Driving · '+Math.round(Math.abs(v.speed)*7)+' km/h'}
else{$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none';if(sprinting&&(f||s))stamina=Math.max(0,stamina-dt*26);else stamina=Math.min(100,stamina+dt*14);const sp=sprinting&&stamina>0?7.5:4.3,dx=(Math.sin(yaw)*f+Math.cos(yaw)*s)*sp*dt,dz=(Math.cos(yaw)*f-Math.sin(yaw)*s)*sp*dt;let nx=player.position.x+dx,nz=player.position.z+dz;if(!blocked(nx,player.position.z,.52,inCar))player.position.x=nx;if(!blocked(player.position.x,nz,.52,inCar))player.position.z=nz;if(f||s)player.rotation.y=Math.atan2(dx,dz);player.rotation.z=(s||0)*-.035;player.position.y+=jumpV*dt;if(player.position.y>jumpPeak)jumpPeak=player.position.y;jumpV-=13*dt;if(player.position.y<0){player.position.y=0;jumpV=0}let moving=!!(f||s);const gait=moving?Math.sin(elapsed*(sprinting?14:10))*(sprinting?.8:.55):0;if(player.userData.riggedAsset){animateRiggedPlayer(gait,moving,elapsed,dt,player.position.y>.06,sprinting&&stamina>0)}else{player.userData.legs[0].rotation.x=gait;player.userData.legs[1].rotation.x=-gait;const knees=player.userData.knees||[];if(knees[0])knees[0].rotation.x=Math.max(0,-gait)*(sprinting?1.05:.72);if(knees[1])knees[1].rotation.x=Math.max(0,gait)*(sprinting?1.05:.72);player.userData.arms[0].rotation.x=-gait*.58;player.userData.arms[1].rotation.x=gait*.58;const elbows=player.userData.elbows||[];if(elbows[0])elbows[0].rotation.x=moving?-.12-Math.max(0,gait)*.32:0;if(elbows[1])elbows[1].rotation.x=moving?-.12-Math.max(0,-gait)*.32:0;const feet=player.userData.feet||[];if(feet[0])feet[0].rotation.x=moving?Math.max(0,gait)*.14:0;if(feet[1])feet[1].rotation.x=moving?Math.max(0,-gait)*.14:0;player.rotation.x=moving?Math.sin(elapsed*(sprinting?14:10)+Math.PI/2)*.018:0;for(const h of player.userData.hands||[])for(let fi=0;fi<h.fingers.length;fi++)h.fingers[fi].rotation.x=moving?Math.sin(elapsed*5+fi*.8+h.side)*.025:0;if(player.userData.torso){player.userData.torso.position.y=1.13+(moving?Math.abs(gait)*.025:0);player.userData.torso.rotation.z=Math.sin(elapsed*2.4)*.012}}$('state').textContent=sprinting&&stamina>0?'Sprinting':'On foot · Exploring'}
$('stamina').style.width=stamina+'%';$('staminaText').textContent=Math.round(stamina)+'%';
if(!interiorMode)for(const p of pedestrians){const u=p.userData;u.phase+=dt;const step=stepPedestrian(p,{now:elapsed,dt,agents:pedestrians,blocked:(x,z,r)=>blocked(x,z,r),chooseGoal:pedestrianWaypoint,frame:aiFrame});const {gd,nearPed,nx,nz,dir}=step;u.gd=gd;u.nearPed=nearPed;u.moving=step.moving;u.dir=dir;if(step.moving){p.position.x=nx;p.position.z=nz} p.rotation.y=u.dir;const gait=u.moving?Math.sin(elapsed*7+u.phase)*.48:0;u.legs[0].rotation.x=gait;u.legs[1].rotation.x=-gait;const knees=u.knees||[];if(knees[0])knees[0].rotation.x=Math.max(0,-gait)*.62;if(knees[1])knees[1].rotation.x=Math.max(0,gait)*.62;u.arms[0].rotation.x=-gait*.58;u.arms[1].rotation.x=gait*.58;const elbows=u.elbows||[];if(elbows[0])elbows[0].rotation.x=-.1-Math.max(0,gait)*.24;if(elbows[1])elbows[1].rotation.x=-.1-Math.max(0,-gait)*.24;const feet=u.feet||[];if(feet[0])feet[0].rotation.x=Math.max(0,gait)*.12;if(feet[1])feet[1].rotation.x=Math.max(0,-gait)*.12;for(const h of p.userData.hands||[])for(let fi=0;fi<h.fingers.length;fi++)h.fingers[fi].rotation.x=Math.sin(elapsed*3.5+fi*.7+h.side+u.phase)*.018;if(u.torso){u.torso.position.y=1.13+Math.abs(gait)*.025;u.torso.rotation.z=Math.sin(elapsed*2+u.phase)*.018}if(u.importedPedestrian){const rig=u.importedPedestrian,moving=gd>=2&&!nearPed&&!blocked(nx,nz,.42),desired=moving?'walk':'idle';if(rig.proceduralBones){const gait=moving?Math.sin(elapsed*7+u.phase)*.62:0;for(const item of Object.values(rig.proceduralBones) as any[]){item.delta.setFromAxisAngle(item.axis,gait*item.sign*item.weight);item.bone.quaternion.copy(item.rest).multiply(item.delta)}rig.model.position.y=rig.baseY+(moving?Math.abs(gait)*.018:Math.sin(elapsed*1.8+u.phase)*.003);rig.activeActionName=desired}else{const next=rig.actions[desired];if(rig.activeActionName!==desired&&next){next.reset().play();rig.activeAction?.crossFadeTo(next,.2,false);rig.activeAction=next;rig.activeActionName=desired}rig.mixer.update(dt)}}}
const t=inCar?inCar.g.position:player.position;cameraLookTarget.set(t.x,t.y+(inCar?1.1:1.35),t.z);const dist=(inCar?9:7)+(inCar?Math.min(2,Math.abs(inCar.speed)*.07):0);cameraPositionTarget.set(t.x-Math.sin(yaw)*Math.cos(pitch)*dist,t.y+2.1+Math.sin(pitch)*dist,t.z-Math.cos(yaw)*Math.cos(pitch)*dist);cameraDirectionTarget.copy(cameraPositionTarget).sub(cameraLookTarget);const camDistance=cameraDirectionTarget.length();cameraDirectionTarget.normalize();let nearestHit=Infinity;for(const blocker of nearbyCameraBlockers(cameraLookTarget.x,cameraLookTarget.z,camDistance+7.2)){const distance=rayBoxHitDistance(cameraLookTarget,cameraDirectionTarget,blocker,camDistance,.25);if(distance<nearestHit)nearestHit=distance}if(Number.isFinite(nearestHit))cameraPositionTarget.copy(cameraLookTarget).addScaledVector(cameraDirectionTarget,Math.max(1,nearestHit-.4));camera.position.lerp(cameraPositionTarget,1-Math.pow(.001,dt));camera.lookAt(cameraLookTarget);mapUpdateElapsed+=dt;if(mapUpdateElapsed>=.1){mapUpdateElapsed-=.1;drawMap(t)}const target=nearestInteraction();$('interact').textContent=target?({car:'ENTER VEHICLE',carExit:'EXIT VEHICLE',door:'ENTER BUILDING',interiorExit:'EXIT INTERIOR',kiosk:'USE CITY KIOSK',landmark:'OPEN CITY SERVICE',dealership:'OPEN AUTO DEALER',gearStore:'OPEN GEAR SHOP',pedestrian:'TALK TO PEDESTRIAN'}[target.type]||'INTERACT'):'INTERACT'}
function applyQuality(q){
 quality=Math.max(0,Math.min(3,q));
 const names=['LOW','BALANCED','HIGH','ULTRA'];
 applyRendererResolution();
 const maxAniso=renderer.capabilities.getMaxAnisotropy();
 for(const tex of [asphaltDetail,concreteDetail,facadeDetail])if(tex)tex.anisotropy=Math.min(maxAniso,quality>=3?8:quality>=2?4:quality>=1?2:1);
 // Balanced mobile skips the shadow map; High/Ultra restore controlled-quality shadows.
 renderer.shadowMap.enabled=quality>=1&&(!mobileSafeDefault||quality>=2);
 scene.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.isMesh&&mesh.userData.importedEnvironmentAssetMesh){mesh.receiveShadow=quality>=2;mesh.castShadow=quality>=3}});
 renderer.shadowMap.type=quality>=2?THREE.PCFSoftShadowMap:THREE.BasicShadowMap;
 const shadowSize=quality>=3?(mobileSafeDefault?1024:1536):quality>=2?(mobileSafeDefault?512:768):quality>=1?512:256;
 sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.needsUpdate=true;
 $('qualityText').textContent=names[quality];$('menuQualityBtn').textContent='GRAPHICS: '+names[quality];
 $('perf').textContent='FPS '+(shownFps||'--')+' · '+names[quality]+' · '+playerAssetStatus;saveSettings()
}
// Distance-cull static city detail in coarse intervals. Long road/ground meshes marked
// alwaysVisible stay active so the road network never disappears at the edge of the view.
let staticCullElapsed=0;
function updateStaticCityVisibility(dt){
 staticCullElapsed+=dt;
 if(staticCullElapsed<.18)return;
 staticCullElapsed=0;
 // Tighten low/mobile visibility radii to avoid submitting hundreds of distant facade/detail meshes.
 const radius=[42,56,92,140][quality],radiusSq=radius*radius,cx=camera.position.x,cz=camera.position.z;
 for(const mesh of cityStaticMeshes){
  if(mesh.userData.cityStatic===false||mesh.userData.alwaysVisible)continue;
  const mx=typeof mesh.userData.cullX==='number'?mesh.userData.cullX:mesh.position.x,mz=typeof mesh.userData.cullZ==='number'?mesh.userData.cullZ:mesh.position.z;
  const dx=mx-cx,dz=mz-cz;
  const paddedRadius=radius+(typeof mesh.userData.cullPadding==='number'?mesh.userData.cullPadding:0),shouldShow=dx*dx+dz*dz<=paddedRadius*paddedRadius;
  if(mesh.visible!==shouldShow)mesh.visible=shouldShow;
 }
 // Skinned pedestrians and multi-part traffic models are draw-call expensive.
 // Keep simulation/collision active but only render actors near the player.
 const target=inCar?inCar.g.position:player.position,tx=target.x,tz=target.z;
 const pedRadius=[36,48,70,95][quality],pedRadiusSq=pedRadius*pedRadius;
 for(const p of pedestrians){const dx=p.position.x-tx,dz=p.position.z-tz,show=dx*dx+dz*dz<=pedRadiusSq;if(p.visible!==show)p.visible=show}
 const vehicleRadius=[48,64,90,120][quality],vehicleRadiusSq=vehicleRadius*vehicleRadius;
 for(const v of vehicles){if(v===inCar){if(!v.g.visible)v.g.visible=true;continue}const dx=v.g.position.x-tx,dz=v.g.position.z-tz,show=dx*dx+dz*dz<=vehicleRadiusSq;if(v.g.visible!==show)v.g.visible=show}
}
function setPaused(v){paused=v;$('pauseMenu').classList.toggle('open',paused);$('pauseBtn').textContent=paused?'▶ RESUME':'Ⅱ PAUSE';if(paused)clearInputs();say(paused?'Game paused':'Back to the city')}
function recover(){if(inCar){const v=inCar;v.speed=0;v.steer=0;v.health=100;let spot=null;for(const side of [-1.8,1.8]){const off=new THREE.Vector3(side,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),v.g.rotation.y),x=v.g.position.x+off.x,z=v.g.position.z+off.z;if(!blocked(x,z,.62,v)){spot={x,z};break}}if(spot)player.position.set(spot.x,0,spot.z);else player.position.set(0,0,23);inCar=null;player.visible=true;$('interact').textContent='ENTER VEHICLE'}else{player.position.set(0,0,23);for(const v of vehicles){v.speed=0;v.health=100}}jumpV=0;stamina=100;$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none';yaw=0;pitch=.22;setPaused(false);saveSettings();say('Recovery complete')}
$('pauseBtn').addEventListener('click',()=>setPaused(!paused));$('resumeBtn').addEventListener('click',()=>setPaused(false));$('recoverBtn').addEventListener('click',recover);$('restartBtn').addEventListener('click',()=>{saveSettings();location.reload()});$('menuQualityBtn').addEventListener('click',()=>applyQuality((quality+1)%4));$('menuTimeBtn').addEventListener('click',()=>setNight(!nightMode));
$('qualityBtn').addEventListener('click',()=>{applyQuality((quality+1)%4);say('Graphics preset: '+$('qualityText').textContent)});
function bindHold(id,key){const el=$(id);const on=e=>{e.preventDefault();keys[key]=true;el.classList.add('down');try{el.setPointerCapture(e.pointerId)}catch{}};const off=()=>{keys[key]=false;if(key==='s')reverseBrakeLatched=false;el.classList.remove('down')};el.addEventListener('pointerdown',on);['pointerup','pointercancel','lostpointercapture','pointerleave'].forEach(ev=>el.addEventListener(ev,off))}
bindHold('gasBtn','w');bindHold('brakeBtn','s');
addEventListener('pagehide',()=>{clearInputs();saveSettings()});let autosaveElapsed=0,cpuMsSum=0,cpuMsSamples=0,cpuMsPeak=0,updateCpuMsSum=0,updateCpuMsSamples=0,updateCpuMsPeak=0,renderCpuMsSum=0,renderCpuMsSamples=0,renderCpuMsPeak=0,lastCpuAvgMs=0,lastCpuPeakMs=0,lastUpdateCpuAvgMs=0,lastUpdateCpuPeakMs=0,lastRenderCpuAvgMs=0,lastRenderCpuPeakMs=0;function frame(){requestAnimationFrame(frame);const workStart=performance.now();const rawDt=clock.getDelta();let dt=Math.min(rawDt,.04);autosaveElapsed+=dt;if(autosaveElapsed>=12){autosaveElapsed=0;saveSettings()}fpsElapsed+=rawDt;fpsFrames++;debugFrameTimes.push(rawDt*1000);if(debugFrameTimes.length>240)debugFrameTimes.shift();if(fpsElapsed>=.5){shownFps=Math.round(fpsFrames/fpsElapsed);const avgCpu=cpuMsSamples?cpuMsSum/cpuMsSamples:0;lastCpuAvgMs=avgCpu;lastCpuPeakMs=cpuMsPeak;lastUpdateCpuAvgMs=updateCpuMsSamples?updateCpuMsSum/updateCpuMsSamples:0;lastUpdateCpuPeakMs=updateCpuMsPeak;lastRenderCpuAvgMs=renderCpuMsSamples?renderCpuMsSum/renderCpuMsSamples:0;lastRenderCpuPeakMs=renderCpuMsPeak;if(debugOverlay){const sorted=[...debugFrameTimes].sort((a,b)=>a-b),p95=sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]:0;debugOverlay.textContent='REALCITY PERF (measurement only)\\nFPS: '+shownFps+'\\np95 frame: '+p95.toFixed(1)+' ms\\nNPCs: '+pedestrians.length+'\\nBuild: '+buildSha;} $('perf').textContent='FPS '+shownFps+' · JS '+avgCpu.toFixed(1)+'/'+cpuMsPeak.toFixed(1)+'ms · DC '+renderer.info.render.calls+' · TRI '+renderer.info.render.triangles+' · GEO '+renderer.info.memory.geometries+' · TEX '+renderer.info.memory.textures+' · MAP≈1MB* · '+['LOW','BALANCED','HIGH','ULTRA'][quality]+' · '+playerAssetStatus;fpsFrames=0;fpsElapsed=0;cpuMsSum=0;cpuMsSamples=0;cpuMsPeak=0;updateCpuMsSum=0;updateCpuMsSamples=0;updateCpuMsPeak=0;renderCpuMsSum=0;renderCpuMsSamples=0;renderCpuMsPeak=0;if(mobileSafeDefault){if(shownFps<24){adaptiveLowElapsed+=.5;adaptiveHighElapsed=0}else if(shownFps>38){adaptiveHighElapsed+=.5;adaptiveLowElapsed=0}else{adaptiveLowElapsed=Math.max(0,adaptiveLowElapsed-.5);adaptiveHighElapsed=0}adaptiveScaleElapsed+=.5;if(adaptiveScaleElapsed>=2){adaptiveScaleElapsed=0;const scaleCeiling=[1.0,1.1,1.25,1.5][quality];let next=mobileRenderScale;if(adaptiveLowElapsed>=2){next=Math.max(.85,mobileRenderScale-.05);adaptiveLowElapsed=0}else if(adaptiveHighElapsed>=6){next=Math.min(scaleCeiling,mobileRenderScale+.025);adaptiveHighElapsed=0}if(Math.abs(next-mobileRenderScale)>.005){mobileRenderScale=next;applyRendererResolution()}}}}let updateCpuNow=0,renderCpuNow=0;if(!paused){const updateStart=performance.now();update(dt);updateStaticCityVisibility(dt);updateCpuNow=performance.now()-updateStart;const renderStart=performance.now();renderer.render(scene,camera);renderCpuNow=performance.now()-renderStart}const cpuMs=performance.now()-workStart;cpuMsSum+=cpuMs;cpuMsSamples++;cpuMsPeak=Math.max(cpuMsPeak,cpuMs);if(!paused){updateCpuMsSum+=updateCpuNow;updateCpuMsSamples++;updateCpuMsPeak=Math.max(updateCpuMsPeak,updateCpuNow);renderCpuMsSum+=renderCpuNow;renderCpuMsSamples++;renderCpuMsPeak=Math.max(renderCpuMsPeak,renderCpuNow)}}frame();applyQuality(quality);if(nightMode)setNight(true);
// One four-preset graphics controller is shared by the HUD and pause menu.
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyRendererResolution()});
loadfill.style.width='100%';loadnote.textContent='City ready · entering world';requestAnimationFrame(()=>requestAnimationFrame(()=>{load.style.opacity='0';setTimeout(()=>load.remove(),250);say('City ready') }));
+m.reward+(m.requiresVehicle?' · Vehicle required':'')+'</small></div><button type="button" data-mission-action="start:'+m.id+'" '+(done?'disabled':'')+'>'+(done?'DONE':isActive?'ACTIVE':'START')+'</button></div>'}).join('')+(active?'<p style="color:#a9bab8;font-size:11px">Current objective: '+active.title+' → '+active.target+'</p>':'<p style="color:#a9bab8;font-size:11px">Choose a mission to begin. Progress is saved on this device.</p>')}
function startCityMission(id:string){const mission=missionDefinitions.find(m=>m.id===id);if(!mission||missionCompletedIds.includes(id))return;activeMissionId=id;saveCareer();renderCareer();say('Mission started · '+mission.title)}
function updateMissionProgress(){if(!activeMissionId)return;const mission=missionDefinitions.find(m=>m.id===activeMissionId);if(!mission){activeMissionId=null;saveCareer();return}const target=worldObjects.find(o=>o.type==='landmark'&&o.name===mission.target);if(!target)return;const position=inCar?inCar.g.position:player.position;if(d2(position,target)<=5.8&&(!mission.requiresVehicle||inCar&&Math.abs(inCar.speed)>=mission.minSpeed)){missionCompletedIds.push(mission.id);activeMissionId=null;cityCash+=mission.reward;saveCareer();saveCityEconomy();renderCareer();say('Mission complete · +
if(new URLSearchParams(location.search).has('qa')&&typeof (window as any).__REALCITY_QA__==='function'){
 const originalQa=(window as any).__REALCITY_QA__;
 (window as any).__REALCITY_QA__=()=>({...originalQa(),
  servicePoints:worldObjects.filter(o=>o.type==='landmark'||o.type==='dealership'||o.type==='gearStore').map(o=>({type:o.type,name:o.name||o.type,x:o.x,z:o.z})),
  cityCash,playerCondition,cityInventory:[...cityInventory],servicePanelOpen:cityServicePanel.classList.contains('open'),
  setPlayerConditionForTest:(value)=>{playerCondition=Math.max(0,Math.min(100,Number(value)||0));saveCityEconomy();return playerCondition}
 });
}
$('timeBtn').addEventListener('click',()=>setNight(!nightMode));$('jump').addEventListener('click',startJump);
$('sprint').addEventListener('pointerdown',e=>{e.preventDefault();sprinting=true});['pointerup','pointercancel','pointerleave'].forEach(ev=>$('sprint').addEventListener(ev,()=>sprinting=false));
document.querySelectorAll<HTMLElement>('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=true;b.classList.add('down');b.setPointerCapture((e as PointerEvent).pointerId)});const off=()=>{keys[k]=false;b.classList.remove('down')};['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,off))});
addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(k==='escape'){setPaused(!paused);e.preventDefault();return}if(paused)return;keys[k]=true;if(k.startsWith('arrow')||k===' ')e.preventDefault();if(k===' ')startJump();if(k==='e'&&!e.repeat)performInteraction()});addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k==='s'||k==='arrowdown')reverseBrakeLatched=false});
renderer.domElement.addEventListener('pointerdown',e=>{if(e.target.closest?.('button'))return;dragging=true;lx=e.clientX;ly=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-lx)*.006;pitch=Math.max(-.08,Math.min(.72,pitch+(e.clientY-ly)*.003));lx=e.clientX;ly=e.clientY});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>renderer.domElement.addEventListener(ev,()=>dragging=false));
function staticBlocked(x,z,r){return staticCollisionQuery(x,z,r,r,b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r)}
function blocked(x,z,r=.65,ignoreVehicle=null){if(interiorMode)return Math.abs(x-roomX)>4.35-r||Math.abs(z-roomZ)>4.35-r;if(Math.abs(x)>329-r||Math.abs(z)>329-r)return true;if(staticBlocked(x,z,r))return true;for(const v of vehicles){if(v===ignoreVehicle)continue;const dx=x-v.g.position.x,dz=z-v.g.position.z,ang=v.g.rotation.y,c=Math.cos(ang),sn=Math.sin(ang),lx=dx*c-dz*sn,lz=dx*sn+dz*c;if(Math.abs(lx)<1.05+r*.35&&Math.abs(lz)<2.0+r*.45)return true}return false}
function vehicleBlocked(x,z,angle,vehicle){if(Math.abs(x)>327||Math.abs(z)>327)return true;const hx=Math.abs(Math.cos(angle))*1+Math.abs(Math.sin(angle))*1.9,hz=Math.abs(Math.sin(angle))*1+Math.abs(Math.cos(angle))*1.9;if(staticCollisionQuery(x,z,hx,hz,b=>Math.abs(x-b.x)<b.w/2+hx&&Math.abs(z-b.z)<b.d/2+hz))return true;for(const other of vehicles){if(other===vehicle)continue;const dx=other.g.position.x-x,dz=other.g.position.z-z;if(Math.abs(dx)<2.1&&Math.abs(dz)<3.6)return true}return false}
const map=$('map') as HTMLCanvasElement,ctx=map.getContext('2d')!;function drawMap(t){const W=map.width,H=map.height,sc=.72;ctx.clearRect(0,0,W,H);ctx.fillStyle='#18302f';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2-t.x*sc,H/2-t.z*sc);ctx.scale(sc,sc);ctx.fillStyle='#3d4a4d';for(let k=-CITY_HALF;k<=CITY_HALF;k++){ctx.fillRect(k*20-4,-CITY_EXTENT/2-20,8,CITY_EXTENT+40);ctx.fillRect(-CITY_EXTENT/2-20,k*20-4,CITY_EXTENT+40,8)}ctx.fillStyle='#85918a';const minBX=t.x-W/(2*sc)-6,maxBX=t.x+W/(2*sc)+6,minBZ=t.z-H/(2*sc)-6,maxBZ=t.z+H/(2*sc)+6;for(let gz=Math.floor(minBZ/SPATIAL_CELL_SIZE);gz<=Math.floor(maxBZ/SPATIAL_CELL_SIZE);gz++)for(let gx=Math.floor(minBX/SPATIAL_CELL_SIZE);gx<=Math.floor(maxBX/SPATIAL_CELL_SIZE);gx++){const bucket=staticCollisionGrid.get(gx+':'+gz);if(!bucket)continue;for(const b of bucket)if(b.x+b.w/2>=minBX&&b.x-b.w/2<=maxBX&&b.z+b.d/2>=minBZ&&b.z-b.d/2<=maxBZ)ctx.fillRect(b.x-b.w/2,b.z-b.d/2,b.w,b.d)}ctx.fillStyle='#d8b55b';for(const p of pedestrians)ctx.fillRect(p.position.x-1,p.position.z-1,2,2);for(const v of vehicles){ctx.fillStyle=v===inCar?'#fff':'#d75b4b';ctx.fillRect(v.g.position.x-1.2,v.g.position.z-2,2.4,4)}for(const service of worldObjects){if(service.type==='landmark'||service.type==='dealership'||service.type==='gearStore'){ctx.fillStyle=service.type==='landmark'?'#e4c16d':service.type==='dealership'?'#55a9d4':'#b58b62';ctx.fillRect(service.x-1.8,service.z-1.8,3.6,3.6)}}ctx.fillStyle='#61f0d2';ctx.beginPath();ctx.arc(t.x,t.z,2.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#61f0d2';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(t.x,t.z);ctx.lineTo(t.x+Math.sin(yaw)*7,t.z+Math.cos(yaw)*7);ctx.stroke();ctx.restore()}
function update(dt){if(paused)return;elapsed+=dt;aiFrame++;
if(!interiorMode)for(const v of traffic){if(v===inCar)continue;const td=v.trafficData;if(!td)continue;const p=v.g.position;const target=inCar?inCar.g.position:player.position;const dx=p.x-target.x,dz=p.z-target.z,userGap=Math.hypot(dx,dz),userAcross=td.axis==='z'?Math.abs(target.x-td.lane):Math.abs(target.z-td.lane);let gap=1e9;for(const other of traffic){if(other===v||other.trafficData.axis!==td.axis)continue;const op=other.g.position;const along=td.axis==='z'?(op.z-p.z)*td.dir:(op.x-p.x)*td.dir;const across=td.axis==='z'?Math.abs(op.x-p.x):Math.abs(op.z-p.z);if(along>0&&along<12&&across<2.8)gap=Math.min(gap,along)}if(userAcross<3.2&&userGap<5.5)gap=Math.min(gap,Math.max(0,userGap-.8));const nearUser=gap<5.5;let speed=nearUser?Math.min(td.speed,Math.max(0,gap-.8)*.85):gap<12?td.speed*Math.min(1,(gap-5.5)/6.5):td.speed;for(const ped of pedestrians){const pp=ped.position,along=td.axis==='z'?(pp.z-p.z)*td.dir:(pp.x-p.x)*td.dir,across=td.axis==='z'?Math.abs(pp.x-td.lane):Math.abs(pp.z-td.lane);if(along>0&&along<5&&across<1.6)speed=Math.min(speed,Math.max(0,along-1.2)*.8)}let nx=p.x,nz=p.z;if(td.axis==='z'){nx=td.lane;nz=p.z+td.dir*speed*dt;v.g.rotation.y=td.dir>0?0:Math.PI}else{nz=td.lane;nx=p.x+td.dir*speed*dt;v.g.rotation.y=td.dir>0?Math.PI/2:-Math.PI/2}if(speed>0){const pedestrianBlocked=pedestrians.some(ped=>Math.hypot(ped.position.x-nx,ped.position.z-nz)<2.4);if(pedestrianBlocked||vehicleBlocked(nx,nz,v.g.rotation.y,v))speed=0;else{p.x=nx;p.z=nz;if(p.z>314)p.z=-314;if(p.z< -314)p.z=314;if(p.x>314)p.x=-314;if(p.x< -314)p.x=314}}}
const f=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),s=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
if(inCar){$('drivepad').classList.add('visible');$('vehicleStatus').style.display='block';$('vehicleHealth').style.width=inCar.health+'%';$('vehicleHealthText').textContent=Math.round(inCar.health)+'%';const v=inCar;const speedStep=integrateVehicleSpeed(v.speed,f,dt,reverseBrakeLatched,1+(v.upgrades?.engine||0)*.13);v.speed=speedStep.speed;reverseBrakeLatched=speedStep.brakeLatched;const speedFactor=Math.min(1,Math.abs(v.speed)/5);v.steer+=(s-v.steer)*Math.min(1,dt*5);v.g.rotation.y+=v.steer*dt*(.16+speedFactor*.88)*(1+(v.upgrades?.handling||0)*.12+(v.upgrades?.tires||0)*.06)*(v.speed<-.1?-1:1);const nx=v.g.position.x+Math.sin(v.g.rotation.y)*v.speed*dt,nz=v.g.position.z+Math.cos(v.g.rotation.y)*v.speed*dt;let hit=false;if(!vehicleBlocked(nx,v.g.position.z,v.g.rotation.y,v)){v.g.position.x=nx}else hit=true;if(!vehicleBlocked(v.g.position.x,nz,v.g.rotation.y,v)){v.g.position.z=nz}else hit=true;if(hit){if(Math.abs(v.speed)>2.2&&elapsed-(v.lastCollisionTime??-10)>.85){v.health=Math.max(0,v.health-Math.max(1,Math.abs(v.speed)*1.2));v.lastCollisionTime=elapsed;say('Collision · vehicle condition '+Math.round(v.health)+'%')}v.speed*=-.12;v.steer*=.5}const maxSpeed=14.5*(1+(v.upgrades?.engine||0)*.12)*(.35+.65*v.health/100);v.speed=Math.max(-Math.min(5.5,maxSpeed*.5),Math.min(maxSpeed,v.speed));for(const wheel of v.g.userData.wheels||[]){wheel.rotation.x+=v.speed*dt*2.8;if(wheel.userData.steerable)wheel.rotation.y=v.steer*.35;}v.g.rotation.z=-v.steer*speedFactor*.035;$('state').textContent='Driving · '+Math.round(Math.abs(v.speed)*7)+' km/h'}
else{$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none';if(sprinting&&(f||s))stamina=Math.max(0,stamina-dt*26);else stamina=Math.min(100,stamina+dt*14);const sp=sprinting&&stamina>0?7.5:4.3,dx=(Math.sin(yaw)*f+Math.cos(yaw)*s)*sp*dt,dz=(Math.cos(yaw)*f-Math.sin(yaw)*s)*sp*dt;let nx=player.position.x+dx,nz=player.position.z+dz;if(!blocked(nx,player.position.z,.52,inCar))player.position.x=nx;if(!blocked(player.position.x,nz,.52,inCar))player.position.z=nz;if(f||s)player.rotation.y=Math.atan2(dx,dz);player.rotation.z=(s||0)*-.035;player.position.y+=jumpV*dt;if(player.position.y>jumpPeak)jumpPeak=player.position.y;jumpV-=13*dt;if(player.position.y<0){player.position.y=0;jumpV=0}let moving=!!(f||s);const gait=moving?Math.sin(elapsed*(sprinting?14:10))*(sprinting?.8:.55):0;if(player.userData.riggedAsset){animateRiggedPlayer(gait,moving,elapsed,dt,player.position.y>.06,sprinting&&stamina>0)}else{player.userData.legs[0].rotation.x=gait;player.userData.legs[1].rotation.x=-gait;const knees=player.userData.knees||[];if(knees[0])knees[0].rotation.x=Math.max(0,-gait)*(sprinting?1.05:.72);if(knees[1])knees[1].rotation.x=Math.max(0,gait)*(sprinting?1.05:.72);player.userData.arms[0].rotation.x=-gait*.58;player.userData.arms[1].rotation.x=gait*.58;const elbows=player.userData.elbows||[];if(elbows[0])elbows[0].rotation.x=moving?-.12-Math.max(0,gait)*.32:0;if(elbows[1])elbows[1].rotation.x=moving?-.12-Math.max(0,-gait)*.32:0;const feet=player.userData.feet||[];if(feet[0])feet[0].rotation.x=moving?Math.max(0,gait)*.14:0;if(feet[1])feet[1].rotation.x=moving?Math.max(0,-gait)*.14:0;player.rotation.x=moving?Math.sin(elapsed*(sprinting?14:10)+Math.PI/2)*.018:0;for(const h of player.userData.hands||[])for(let fi=0;fi<h.fingers.length;fi++)h.fingers[fi].rotation.x=moving?Math.sin(elapsed*5+fi*.8+h.side)*.025:0;if(player.userData.torso){player.userData.torso.position.y=1.13+(moving?Math.abs(gait)*.025:0);player.userData.torso.rotation.z=Math.sin(elapsed*2.4)*.012}}$('state').textContent=sprinting&&stamina>0?'Sprinting':'On foot · Exploring'}
$('stamina').style.width=stamina+'%';$('staminaText').textContent=Math.round(stamina)+'%';
if(!interiorMode)for(const p of pedestrians){const u=p.userData;u.phase+=dt;const step=stepPedestrian(p,{now:elapsed,dt,agents:pedestrians,blocked:(x,z,r)=>blocked(x,z,r),chooseGoal:pedestrianWaypoint,frame:aiFrame});const {gd,nearPed,nx,nz,dir}=step;u.gd=gd;u.nearPed=nearPed;u.moving=step.moving;u.dir=dir;if(step.moving){p.position.x=nx;p.position.z=nz} p.rotation.y=u.dir;const gait=u.moving?Math.sin(elapsed*7+u.phase)*.48:0;u.legs[0].rotation.x=gait;u.legs[1].rotation.x=-gait;const knees=u.knees||[];if(knees[0])knees[0].rotation.x=Math.max(0,-gait)*.62;if(knees[1])knees[1].rotation.x=Math.max(0,gait)*.62;u.arms[0].rotation.x=-gait*.58;u.arms[1].rotation.x=gait*.58;const elbows=u.elbows||[];if(elbows[0])elbows[0].rotation.x=-.1-Math.max(0,gait)*.24;if(elbows[1])elbows[1].rotation.x=-.1-Math.max(0,-gait)*.24;const feet=u.feet||[];if(feet[0])feet[0].rotation.x=Math.max(0,gait)*.12;if(feet[1])feet[1].rotation.x=Math.max(0,-gait)*.12;for(const h of p.userData.hands||[])for(let fi=0;fi<h.fingers.length;fi++)h.fingers[fi].rotation.x=Math.sin(elapsed*3.5+fi*.7+h.side+u.phase)*.018;if(u.torso){u.torso.position.y=1.13+Math.abs(gait)*.025;u.torso.rotation.z=Math.sin(elapsed*2+u.phase)*.018}if(u.importedPedestrian){const rig=u.importedPedestrian,moving=gd>=2&&!nearPed&&!blocked(nx,nz,.42),desired=moving?'walk':'idle';if(rig.proceduralBones){const gait=moving?Math.sin(elapsed*7+u.phase)*.62:0;for(const item of Object.values(rig.proceduralBones) as any[]){item.delta.setFromAxisAngle(item.axis,gait*item.sign*item.weight);item.bone.quaternion.copy(item.rest).multiply(item.delta)}rig.model.position.y=rig.baseY+(moving?Math.abs(gait)*.018:Math.sin(elapsed*1.8+u.phase)*.003);rig.activeActionName=desired}else{const next=rig.actions[desired];if(rig.activeActionName!==desired&&next){next.reset().play();rig.activeAction?.crossFadeTo(next,.2,false);rig.activeAction=next;rig.activeActionName=desired}rig.mixer.update(dt)}}}
const t=inCar?inCar.g.position:player.position;cameraLookTarget.set(t.x,t.y+(inCar?1.1:1.35),t.z);const dist=(inCar?9:7)+(inCar?Math.min(2,Math.abs(inCar.speed)*.07):0);cameraPositionTarget.set(t.x-Math.sin(yaw)*Math.cos(pitch)*dist,t.y+2.1+Math.sin(pitch)*dist,t.z-Math.cos(yaw)*Math.cos(pitch)*dist);cameraDirectionTarget.copy(cameraPositionTarget).sub(cameraLookTarget);const camDistance=cameraDirectionTarget.length();cameraDirectionTarget.normalize();let nearestHit=Infinity;for(const blocker of nearbyCameraBlockers(cameraLookTarget.x,cameraLookTarget.z,camDistance+7.2)){const distance=rayBoxHitDistance(cameraLookTarget,cameraDirectionTarget,blocker,camDistance,.25);if(distance<nearestHit)nearestHit=distance}if(Number.isFinite(nearestHit))cameraPositionTarget.copy(cameraLookTarget).addScaledVector(cameraDirectionTarget,Math.max(1,nearestHit-.4));camera.position.lerp(cameraPositionTarget,1-Math.pow(.001,dt));camera.lookAt(cameraLookTarget);mapUpdateElapsed+=dt;if(mapUpdateElapsed>=.1){mapUpdateElapsed-=.1;drawMap(t)}const target=nearestInteraction();$('interact').textContent=target?({car:'ENTER VEHICLE',carExit:'EXIT VEHICLE',door:'ENTER BUILDING',interiorExit:'EXIT INTERIOR',kiosk:'USE CITY KIOSK',landmark:'OPEN CITY SERVICE',dealership:'OPEN AUTO DEALER',gearStore:'OPEN GEAR SHOP',pedestrian:'TALK TO PEDESTRIAN'}[target.type]||'INTERACT'):'INTERACT'}
function applyQuality(q){
 quality=Math.max(0,Math.min(3,q));
 const names=['LOW','BALANCED','HIGH','ULTRA'];
 applyRendererResolution();
 const maxAniso=renderer.capabilities.getMaxAnisotropy();
 for(const tex of [asphaltDetail,concreteDetail,facadeDetail])if(tex)tex.anisotropy=Math.min(maxAniso,quality>=3?8:quality>=2?4:quality>=1?2:1);
 // Balanced mobile skips the shadow map; High/Ultra restore controlled-quality shadows.
 renderer.shadowMap.enabled=quality>=1&&(!mobileSafeDefault||quality>=2);
 scene.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.isMesh&&mesh.userData.importedEnvironmentAssetMesh){mesh.receiveShadow=quality>=2;mesh.castShadow=quality>=3}});
 renderer.shadowMap.type=quality>=2?THREE.PCFSoftShadowMap:THREE.BasicShadowMap;
 const shadowSize=quality>=3?(mobileSafeDefault?1024:1536):quality>=2?(mobileSafeDefault?512:768):quality>=1?512:256;
 sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.needsUpdate=true;
 $('qualityText').textContent=names[quality];$('menuQualityBtn').textContent='GRAPHICS: '+names[quality];
 $('perf').textContent='FPS '+(shownFps||'--')+' · '+names[quality]+' · '+playerAssetStatus;saveSettings()
}
// Distance-cull static city detail in coarse intervals. Long road/ground meshes marked
// alwaysVisible stay active so the road network never disappears at the edge of the view.
let staticCullElapsed=0;
function updateStaticCityVisibility(dt){
 staticCullElapsed+=dt;
 if(staticCullElapsed<.18)return;
 staticCullElapsed=0;
 // Tighten low/mobile visibility radii to avoid submitting hundreds of distant facade/detail meshes.
 const radius=[42,56,92,140][quality],radiusSq=radius*radius,cx=camera.position.x,cz=camera.position.z;
 for(const mesh of cityStaticMeshes){
  if(mesh.userData.cityStatic===false||mesh.userData.alwaysVisible)continue;
  const mx=typeof mesh.userData.cullX==='number'?mesh.userData.cullX:mesh.position.x,mz=typeof mesh.userData.cullZ==='number'?mesh.userData.cullZ:mesh.position.z;
  const dx=mx-cx,dz=mz-cz;
  const paddedRadius=radius+(typeof mesh.userData.cullPadding==='number'?mesh.userData.cullPadding:0),shouldShow=dx*dx+dz*dz<=paddedRadius*paddedRadius;
  if(mesh.visible!==shouldShow)mesh.visible=shouldShow;
 }
 // Skinned pedestrians and multi-part traffic models are draw-call expensive.
 // Keep simulation/collision active but only render actors near the player.
 const target=inCar?inCar.g.position:player.position,tx=target.x,tz=target.z;
 const pedRadius=[36,48,70,95][quality],pedRadiusSq=pedRadius*pedRadius;
 for(const p of pedestrians){const dx=p.position.x-tx,dz=p.position.z-tz,show=dx*dx+dz*dz<=pedRadiusSq;if(p.visible!==show)p.visible=show}
 const vehicleRadius=[48,64,90,120][quality],vehicleRadiusSq=vehicleRadius*vehicleRadius;
 for(const v of vehicles){if(v===inCar){if(!v.g.visible)v.g.visible=true;continue}const dx=v.g.position.x-tx,dz=v.g.position.z-tz,show=dx*dx+dz*dz<=vehicleRadiusSq;if(v.g.visible!==show)v.g.visible=show}
}
function setPaused(v){paused=v;$('pauseMenu').classList.toggle('open',paused);$('pauseBtn').textContent=paused?'▶ RESUME':'Ⅱ PAUSE';if(paused)clearInputs();say(paused?'Game paused':'Back to the city')}
function recover(){if(inCar){const v=inCar;v.speed=0;v.steer=0;v.health=100;let spot=null;for(const side of [-1.8,1.8]){const off=new THREE.Vector3(side,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),v.g.rotation.y),x=v.g.position.x+off.x,z=v.g.position.z+off.z;if(!blocked(x,z,.62,v)){spot={x,z};break}}if(spot)player.position.set(spot.x,0,spot.z);else player.position.set(0,0,23);inCar=null;player.visible=true;$('interact').textContent='ENTER VEHICLE'}else{player.position.set(0,0,23);for(const v of vehicles){v.speed=0;v.health=100}}jumpV=0;stamina=100;$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none';yaw=0;pitch=.22;setPaused(false);saveSettings();say('Recovery complete')}
$('pauseBtn').addEventListener('click',()=>setPaused(!paused));$('resumeBtn').addEventListener('click',()=>setPaused(false));$('recoverBtn').addEventListener('click',recover);$('restartBtn').addEventListener('click',()=>{saveSettings();location.reload()});$('menuQualityBtn').addEventListener('click',()=>applyQuality((quality+1)%4));$('menuTimeBtn').addEventListener('click',()=>setNight(!nightMode));
$('qualityBtn').addEventListener('click',()=>{applyQuality((quality+1)%4);say('Graphics preset: '+$('qualityText').textContent)});
function bindHold(id,key){const el=$(id);const on=e=>{e.preventDefault();keys[key]=true;el.classList.add('down');try{el.setPointerCapture(e.pointerId)}catch{}};const off=()=>{keys[key]=false;if(key==='s')reverseBrakeLatched=false;el.classList.remove('down')};el.addEventListener('pointerdown',on);['pointerup','pointercancel','lostpointercapture','pointerleave'].forEach(ev=>el.addEventListener(ev,off))}
bindHold('gasBtn','w');bindHold('brakeBtn','s');
addEventListener('pagehide',()=>{clearInputs();saveSettings()});let autosaveElapsed=0,cpuMsSum=0,cpuMsSamples=0,cpuMsPeak=0,updateCpuMsSum=0,updateCpuMsSamples=0,updateCpuMsPeak=0,renderCpuMsSum=0,renderCpuMsSamples=0,renderCpuMsPeak=0,lastCpuAvgMs=0,lastCpuPeakMs=0,lastUpdateCpuAvgMs=0,lastUpdateCpuPeakMs=0,lastRenderCpuAvgMs=0,lastRenderCpuPeakMs=0;function frame(){requestAnimationFrame(frame);const workStart=performance.now();const rawDt=clock.getDelta();let dt=Math.min(rawDt,.04);autosaveElapsed+=dt;if(autosaveElapsed>=12){autosaveElapsed=0;saveSettings()}fpsElapsed+=rawDt;fpsFrames++;debugFrameTimes.push(rawDt*1000);if(debugFrameTimes.length>240)debugFrameTimes.shift();if(fpsElapsed>=.5){shownFps=Math.round(fpsFrames/fpsElapsed);const avgCpu=cpuMsSamples?cpuMsSum/cpuMsSamples:0;lastCpuAvgMs=avgCpu;lastCpuPeakMs=cpuMsPeak;lastUpdateCpuAvgMs=updateCpuMsSamples?updateCpuMsSum/updateCpuMsSamples:0;lastUpdateCpuPeakMs=updateCpuMsPeak;lastRenderCpuAvgMs=renderCpuMsSamples?renderCpuMsSum/renderCpuMsSamples:0;lastRenderCpuPeakMs=renderCpuMsPeak;if(debugOverlay){const sorted=[...debugFrameTimes].sort((a,b)=>a-b),p95=sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]:0;debugOverlay.textContent='REALCITY PERF (measurement only)\\nFPS: '+shownFps+'\\np95 frame: '+p95.toFixed(1)+' ms\\nNPCs: '+pedestrians.length+'\\nBuild: '+buildSha;} $('perf').textContent='FPS '+shownFps+' · JS '+avgCpu.toFixed(1)+'/'+cpuMsPeak.toFixed(1)+'ms · DC '+renderer.info.render.calls+' · TRI '+renderer.info.render.triangles+' · GEO '+renderer.info.memory.geometries+' · TEX '+renderer.info.memory.textures+' · MAP≈1MB* · '+['LOW','BALANCED','HIGH','ULTRA'][quality]+' · '+playerAssetStatus;fpsFrames=0;fpsElapsed=0;cpuMsSum=0;cpuMsSamples=0;cpuMsPeak=0;updateCpuMsSum=0;updateCpuMsSamples=0;updateCpuMsPeak=0;renderCpuMsSum=0;renderCpuMsSamples=0;renderCpuMsPeak=0;if(mobileSafeDefault){if(shownFps<24){adaptiveLowElapsed+=.5;adaptiveHighElapsed=0}else if(shownFps>38){adaptiveHighElapsed+=.5;adaptiveLowElapsed=0}else{adaptiveLowElapsed=Math.max(0,adaptiveLowElapsed-.5);adaptiveHighElapsed=0}adaptiveScaleElapsed+=.5;if(adaptiveScaleElapsed>=2){adaptiveScaleElapsed=0;const scaleCeiling=[1.0,1.1,1.25,1.5][quality];let next=mobileRenderScale;if(adaptiveLowElapsed>=2){next=Math.max(.85,mobileRenderScale-.05);adaptiveLowElapsed=0}else if(adaptiveHighElapsed>=6){next=Math.min(scaleCeiling,mobileRenderScale+.025);adaptiveHighElapsed=0}if(Math.abs(next-mobileRenderScale)>.005){mobileRenderScale=next;applyRendererResolution()}}}}let updateCpuNow=0,renderCpuNow=0;if(!paused){const updateStart=performance.now();update(dt);updateStaticCityVisibility(dt);updateCpuNow=performance.now()-updateStart;const renderStart=performance.now();renderer.render(scene,camera);renderCpuNow=performance.now()-renderStart}const cpuMs=performance.now()-workStart;cpuMsSum+=cpuMs;cpuMsSamples++;cpuMsPeak=Math.max(cpuMsPeak,cpuMs);if(!paused){updateCpuMsSum+=updateCpuNow;updateCpuMsSamples++;updateCpuMsPeak=Math.max(updateCpuMsPeak,updateCpuNow);renderCpuMsSum+=renderCpuNow;renderCpuMsSamples++;renderCpuMsPeak=Math.max(renderCpuMsPeak,renderCpuNow)}}frame();applyQuality(quality);if(nightMode)setNight(true);
// One four-preset graphics controller is shared by the HUD and pause menu.
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyRendererResolution()});
loadfill.style.width='100%';loadnote.textContent='City ready · entering world';requestAnimationFrame(()=>requestAnimationFrame(()=>{load.style.opacity='0';setTimeout(()=>load.remove(),250);say('City ready') }));
+mission.reward+' · '+mission.title)}}
function renderWardrobe(){$('stage-kicker')!.textContent='REALCITY · CHARACTER';$('stage-title')!.textContent='WARDROBE & APPEARANCE';const options=[['outfit','OUTFIT',[['teal','Teal'],['crimson','Crimson'],['navy','Navy'],['sand','Sand']]],['skin','SKIN TONE',[['warm','Warm'],['medium','Medium'],['deep','Deep']]],['hair','HAIR COLOR',[['dark','Dark'],['brown','Brown'],['blonde','Blonde']]]];$('stage-content')!.innerHTML=options.map(([key,label,choices]:any)=>'<div style="margin:16px 0 7px;color:#9db8b5;font-size:10px;font-weight:900;letter-spacing:1px">'+label+'</div><div class="stage-options">'+choices.map(([value,name]:any)=>'<button type="button" class="stage-choice '+(appearanceState[key]===value?'active':'')+'" data-appearance="'+key+':'+value+'">'+name+'</button>').join('')+'</div>').join('')+'<p style="color:#a9bab8;font-size:11px">Appearance choices are saved locally and applied to the protagonist model when supported by its materials.</p>'}
function openStagePanel(mode:'career'|'wardrobe'){if(mode==='career')renderCareer();else renderWardrobe();stagePanel.classList.add('open')}
$('realcity-career-open').addEventListener('click',()=>openStagePanel('career'));$('realcity-wardrobe-open').addEventListener('click',()=>openStagePanel('wardrobe'));
stagePanel.addEventListener('click',event=>{const target=event.target as HTMLElement;if(target.closest('[data-stage-close]')){stagePanel.classList.remove('open');return}const missionButton=target.closest<HTMLElement>('[data-mission-action]');if(missionButton){startCityMission((missionButton.dataset.missionAction||'').slice(6));return}const choice=target.closest<HTMLElement>('[data-appearance]');if(choice){const [key,value]=(choice.dataset.appearance||'').split(':');if(key in appearanceState&&value in (appearanceColors as any)[key]){(appearanceState as any)[key]=value;applyPlayerAppearance();renderWardrobe()}return}});
stagePanel.addEventListener('pointerdown',event=>{if(event.target===stagePanel)stagePanel.classList.remove('open')});

if(new URLSearchParams(location.search).has('qa')&&typeof (window as any).__REALCITY_QA__==='function'){
 const originalQa=(window as any).__REALCITY_QA__;
 (window as any).__REALCITY_QA__=()=>({...originalQa(),
  servicePoints:worldObjects.filter(o=>o.type==='landmark'||o.type==='dealership'||o.type==='gearStore').map(o=>({type:o.type,name:o.name||o.type,x:o.x,z:o.z})),
  cityCash,playerCondition,cityInventory:[...cityInventory],servicePanelOpen:cityServicePanel.classList.contains('open'),
  setPlayerConditionForTest:(value)=>{playerCondition=Math.max(0,Math.min(100,Number(value)||0));saveCityEconomy();return playerCondition}
 });
}
$('timeBtn').addEventListener('click',()=>setNight(!nightMode));$('jump').addEventListener('click',startJump);
$('sprint').addEventListener('pointerdown',e=>{e.preventDefault();sprinting=true});['pointerup','pointercancel','pointerleave'].forEach(ev=>$('sprint').addEventListener(ev,()=>sprinting=false));
document.querySelectorAll<HTMLElement>('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=true;b.classList.add('down');b.setPointerCapture((e as PointerEvent).pointerId)});const off=()=>{keys[k]=false;b.classList.remove('down')};['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,off))});
addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(k==='escape'){setPaused(!paused);e.preventDefault();return}if(paused)return;keys[k]=true;if(k.startsWith('arrow')||k===' ')e.preventDefault();if(k===' ')startJump();if(k==='e'&&!e.repeat)performInteraction()});addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k==='s'||k==='arrowdown')reverseBrakeLatched=false});
renderer.domElement.addEventListener('pointerdown',e=>{if(e.target.closest?.('button'))return;dragging=true;lx=e.clientX;ly=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-lx)*.006;pitch=Math.max(-.08,Math.min(.72,pitch+(e.clientY-ly)*.003));lx=e.clientX;ly=e.clientY});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>renderer.domElement.addEventListener(ev,()=>dragging=false));
function staticBlocked(x,z,r){return staticCollisionQuery(x,z,r,r,b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r)}
function blocked(x,z,r=.65,ignoreVehicle=null){if(interiorMode)return Math.abs(x-roomX)>4.35-r||Math.abs(z-roomZ)>4.35-r;if(Math.abs(x)>329-r||Math.abs(z)>329-r)return true;if(staticBlocked(x,z,r))return true;for(const v of vehicles){if(v===ignoreVehicle)continue;const dx=x-v.g.position.x,dz=z-v.g.position.z,ang=v.g.rotation.y,c=Math.cos(ang),sn=Math.sin(ang),lx=dx*c-dz*sn,lz=dx*sn+dz*c;if(Math.abs(lx)<1.05+r*.35&&Math.abs(lz)<2.0+r*.45)return true}return false}
function vehicleBlocked(x,z,angle,vehicle){if(Math.abs(x)>327||Math.abs(z)>327)return true;const hx=Math.abs(Math.cos(angle))*1+Math.abs(Math.sin(angle))*1.9,hz=Math.abs(Math.sin(angle))*1+Math.abs(Math.cos(angle))*1.9;if(staticCollisionQuery(x,z,hx,hz,b=>Math.abs(x-b.x)<b.w/2+hx&&Math.abs(z-b.z)<b.d/2+hz))return true;for(const other of vehicles){if(other===vehicle)continue;const dx=other.g.position.x-x,dz=other.g.position.z-z;if(Math.abs(dx)<2.1&&Math.abs(dz)<3.6)return true}return false}
const map=$('map') as HTMLCanvasElement,ctx=map.getContext('2d')!;function drawMap(t){const W=map.width,H=map.height,sc=.72;ctx.clearRect(0,0,W,H);ctx.fillStyle='#18302f';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2-t.x*sc,H/2-t.z*sc);ctx.scale(sc,sc);ctx.fillStyle='#3d4a4d';for(let k=-CITY_HALF;k<=CITY_HALF;k++){ctx.fillRect(k*20-4,-CITY_EXTENT/2-20,8,CITY_EXTENT+40);ctx.fillRect(-CITY_EXTENT/2-20,k*20-4,CITY_EXTENT+40,8)}ctx.fillStyle='#85918a';const minBX=t.x-W/(2*sc)-6,maxBX=t.x+W/(2*sc)+6,minBZ=t.z-H/(2*sc)-6,maxBZ=t.z+H/(2*sc)+6;for(let gz=Math.floor(minBZ/SPATIAL_CELL_SIZE);gz<=Math.floor(maxBZ/SPATIAL_CELL_SIZE);gz++)for(let gx=Math.floor(minBX/SPATIAL_CELL_SIZE);gx<=Math.floor(maxBX/SPATIAL_CELL_SIZE);gx++){const bucket=staticCollisionGrid.get(gx+':'+gz);if(!bucket)continue;for(const b of bucket)if(b.x+b.w/2>=minBX&&b.x-b.w/2<=maxBX&&b.z+b.d/2>=minBZ&&b.z-b.d/2<=maxBZ)ctx.fillRect(b.x-b.w/2,b.z-b.d/2,b.w,b.d)}ctx.fillStyle='#d8b55b';for(const p of pedestrians)ctx.fillRect(p.position.x-1,p.position.z-1,2,2);for(const v of vehicles){ctx.fillStyle=v===inCar?'#fff':'#d75b4b';ctx.fillRect(v.g.position.x-1.2,v.g.position.z-2,2.4,4)}for(const service of worldObjects){if(service.type==='landmark'||service.type==='dealership'||service.type==='gearStore'){ctx.fillStyle=service.type==='landmark'?'#e4c16d':service.type==='dealership'?'#55a9d4':'#b58b62';ctx.fillRect(service.x-1.8,service.z-1.8,3.6,3.6)}}ctx.fillStyle='#61f0d2';ctx.beginPath();ctx.arc(t.x,t.z,2.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#61f0d2';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(t.x,t.z);ctx.lineTo(t.x+Math.sin(yaw)*7,t.z+Math.cos(yaw)*7);ctx.stroke();ctx.restore()}
function update(dt){if(paused)return;elapsed+=dt;aiFrame++;
if(!interiorMode)for(const v of traffic){if(v===inCar)continue;const td=v.trafficData;if(!td)continue;const p=v.g.position;const target=inCar?inCar.g.position:player.position;const dx=p.x-target.x,dz=p.z-target.z,userGap=Math.hypot(dx,dz),userAcross=td.axis==='z'?Math.abs(target.x-td.lane):Math.abs(target.z-td.lane);let gap=1e9;for(const other of traffic){if(other===v||other.trafficData.axis!==td.axis)continue;const op=other.g.position;const along=td.axis==='z'?(op.z-p.z)*td.dir:(op.x-p.x)*td.dir;const across=td.axis==='z'?Math.abs(op.x-p.x):Math.abs(op.z-p.z);if(along>0&&along<12&&across<2.8)gap=Math.min(gap,along)}if(userAcross<3.2&&userGap<5.5)gap=Math.min(gap,Math.max(0,userGap-.8));const nearUser=gap<5.5;let speed=nearUser?Math.min(td.speed,Math.max(0,gap-.8)*.85):gap<12?td.speed*Math.min(1,(gap-5.5)/6.5):td.speed;for(const ped of pedestrians){const pp=ped.position,along=td.axis==='z'?(pp.z-p.z)*td.dir:(pp.x-p.x)*td.dir,across=td.axis==='z'?Math.abs(pp.x-td.lane):Math.abs(pp.z-td.lane);if(along>0&&along<5&&across<1.6)speed=Math.min(speed,Math.max(0,along-1.2)*.8)}let nx=p.x,nz=p.z;if(td.axis==='z'){nx=td.lane;nz=p.z+td.dir*speed*dt;v.g.rotation.y=td.dir>0?0:Math.PI}else{nz=td.lane;nx=p.x+td.dir*speed*dt;v.g.rotation.y=td.dir>0?Math.PI/2:-Math.PI/2}if(speed>0){const pedestrianBlocked=pedestrians.some(ped=>Math.hypot(ped.position.x-nx,ped.position.z-nz)<2.4);if(pedestrianBlocked||vehicleBlocked(nx,nz,v.g.rotation.y,v))speed=0;else{p.x=nx;p.z=nz;if(p.z>314)p.z=-314;if(p.z< -314)p.z=314;if(p.x>314)p.x=-314;if(p.x< -314)p.x=314}}}
const f=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),s=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
if(inCar){$('drivepad').classList.add('visible');$('vehicleStatus').style.display='block';$('vehicleHealth').style.width=inCar.health+'%';$('vehicleHealthText').textContent=Math.round(inCar.health)+'%';const v=inCar;const speedStep=integrateVehicleSpeed(v.speed,f,dt,reverseBrakeLatched,1+(v.upgrades?.engine||0)*.13);v.speed=speedStep.speed;reverseBrakeLatched=speedStep.brakeLatched;const speedFactor=Math.min(1,Math.abs(v.speed)/5);v.steer+=(s-v.steer)*Math.min(1,dt*5);v.g.rotation.y+=v.steer*dt*(.16+speedFactor*.88)*(1+(v.upgrades?.handling||0)*.12+(v.upgrades?.tires||0)*.06)*(v.speed<-.1?-1:1);const nx=v.g.position.x+Math.sin(v.g.rotation.y)*v.speed*dt,nz=v.g.position.z+Math.cos(v.g.rotation.y)*v.speed*dt;let hit=false;if(!vehicleBlocked(nx,v.g.position.z,v.g.rotation.y,v)){v.g.position.x=nx}else hit=true;if(!vehicleBlocked(v.g.position.x,nz,v.g.rotation.y,v)){v.g.position.z=nz}else hit=true;if(hit){if(Math.abs(v.speed)>2.2&&elapsed-(v.lastCollisionTime??-10)>.85){v.health=Math.max(0,v.health-Math.max(1,Math.abs(v.speed)*1.2));v.lastCollisionTime=elapsed;say('Collision · vehicle condition '+Math.round(v.health)+'%')}v.speed*=-.12;v.steer*=.5}const maxSpeed=14.5*(1+(v.upgrades?.engine||0)*.12)*(.35+.65*v.health/100);v.speed=Math.max(-Math.min(5.5,maxSpeed*.5),Math.min(maxSpeed,v.speed));for(const wheel of v.g.userData.wheels||[]){wheel.rotation.x+=v.speed*dt*2.8;if(wheel.userData.steerable)wheel.rotation.y=v.steer*.35;}v.g.rotation.z=-v.steer*speedFactor*.035;$('state').textContent='Driving · '+Math.round(Math.abs(v.speed)*7)+' km/h'}
else{$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none';if(sprinting&&(f||s))stamina=Math.max(0,stamina-dt*26);else stamina=Math.min(100,stamina+dt*14);const sp=sprinting&&stamina>0?7.5:4.3,dx=(Math.sin(yaw)*f+Math.cos(yaw)*s)*sp*dt,dz=(Math.cos(yaw)*f-Math.sin(yaw)*s)*sp*dt;let nx=player.position.x+dx,nz=player.position.z+dz;if(!blocked(nx,player.position.z,.52,inCar))player.position.x=nx;if(!blocked(player.position.x,nz,.52,inCar))player.position.z=nz;if(f||s)player.rotation.y=Math.atan2(dx,dz);player.rotation.z=(s||0)*-.035;player.position.y+=jumpV*dt;if(player.position.y>jumpPeak)jumpPeak=player.position.y;jumpV-=13*dt;if(player.position.y<0){player.position.y=0;jumpV=0}let moving=!!(f||s);const gait=moving?Math.sin(elapsed*(sprinting?14:10))*(sprinting?.8:.55):0;if(player.userData.riggedAsset){animateRiggedPlayer(gait,moving,elapsed,dt,player.position.y>.06,sprinting&&stamina>0)}else{player.userData.legs[0].rotation.x=gait;player.userData.legs[1].rotation.x=-gait;const knees=player.userData.knees||[];if(knees[0])knees[0].rotation.x=Math.max(0,-gait)*(sprinting?1.05:.72);if(knees[1])knees[1].rotation.x=Math.max(0,gait)*(sprinting?1.05:.72);player.userData.arms[0].rotation.x=-gait*.58;player.userData.arms[1].rotation.x=gait*.58;const elbows=player.userData.elbows||[];if(elbows[0])elbows[0].rotation.x=moving?-.12-Math.max(0,gait)*.32:0;if(elbows[1])elbows[1].rotation.x=moving?-.12-Math.max(0,-gait)*.32:0;const feet=player.userData.feet||[];if(feet[0])feet[0].rotation.x=moving?Math.max(0,gait)*.14:0;if(feet[1])feet[1].rotation.x=moving?Math.max(0,-gait)*.14:0;player.rotation.x=moving?Math.sin(elapsed*(sprinting?14:10)+Math.PI/2)*.018:0;for(const h of player.userData.hands||[])for(let fi=0;fi<h.fingers.length;fi++)h.fingers[fi].rotation.x=moving?Math.sin(elapsed*5+fi*.8+h.side)*.025:0;if(player.userData.torso){player.userData.torso.position.y=1.13+(moving?Math.abs(gait)*.025:0);player.userData.torso.rotation.z=Math.sin(elapsed*2.4)*.012}}$('state').textContent=sprinting&&stamina>0?'Sprinting':'On foot · Exploring'}
$('stamina').style.width=stamina+'%';$('staminaText').textContent=Math.round(stamina)+'%';
if(!interiorMode)for(const p of pedestrians){const u=p.userData;u.phase+=dt;const step=stepPedestrian(p,{now:elapsed,dt,agents:pedestrians,blocked:(x,z,r)=>blocked(x,z,r),chooseGoal:pedestrianWaypoint,frame:aiFrame});const {gd,nearPed,nx,nz,dir}=step;u.gd=gd;u.nearPed=nearPed;u.moving=step.moving;u.dir=dir;if(step.moving){p.position.x=nx;p.position.z=nz} p.rotation.y=u.dir;const gait=u.moving?Math.sin(elapsed*7+u.phase)*.48:0;u.legs[0].rotation.x=gait;u.legs[1].rotation.x=-gait;const knees=u.knees||[];if(knees[0])knees[0].rotation.x=Math.max(0,-gait)*.62;if(knees[1])knees[1].rotation.x=Math.max(0,gait)*.62;u.arms[0].rotation.x=-gait*.58;u.arms[1].rotation.x=gait*.58;const elbows=u.elbows||[];if(elbows[0])elbows[0].rotation.x=-.1-Math.max(0,gait)*.24;if(elbows[1])elbows[1].rotation.x=-.1-Math.max(0,-gait)*.24;const feet=u.feet||[];if(feet[0])feet[0].rotation.x=Math.max(0,gait)*.12;if(feet[1])feet[1].rotation.x=Math.max(0,-gait)*.12;for(const h of p.userData.hands||[])for(let fi=0;fi<h.fingers.length;fi++)h.fingers[fi].rotation.x=Math.sin(elapsed*3.5+fi*.7+h.side+u.phase)*.018;if(u.torso){u.torso.position.y=1.13+Math.abs(gait)*.025;u.torso.rotation.z=Math.sin(elapsed*2+u.phase)*.018}if(u.importedPedestrian){const rig=u.importedPedestrian,moving=gd>=2&&!nearPed&&!blocked(nx,nz,.42),desired=moving?'walk':'idle';if(rig.proceduralBones){const gait=moving?Math.sin(elapsed*7+u.phase)*.62:0;for(const item of Object.values(rig.proceduralBones) as any[]){item.delta.setFromAxisAngle(item.axis,gait*item.sign*item.weight);item.bone.quaternion.copy(item.rest).multiply(item.delta)}rig.model.position.y=rig.baseY+(moving?Math.abs(gait)*.018:Math.sin(elapsed*1.8+u.phase)*.003);rig.activeActionName=desired}else{const next=rig.actions[desired];if(rig.activeActionName!==desired&&next){next.reset().play();rig.activeAction?.crossFadeTo(next,.2,false);rig.activeAction=next;rig.activeActionName=desired}rig.mixer.update(dt)}}}
const t=inCar?inCar.g.position:player.position;cameraLookTarget.set(t.x,t.y+(inCar?1.1:1.35),t.z);const dist=(inCar?9:7)+(inCar?Math.min(2,Math.abs(inCar.speed)*.07):0);cameraPositionTarget.set(t.x-Math.sin(yaw)*Math.cos(pitch)*dist,t.y+2.1+Math.sin(pitch)*dist,t.z-Math.cos(yaw)*Math.cos(pitch)*dist);cameraDirectionTarget.copy(cameraPositionTarget).sub(cameraLookTarget);const camDistance=cameraDirectionTarget.length();cameraDirectionTarget.normalize();let nearestHit=Infinity;for(const blocker of nearbyCameraBlockers(cameraLookTarget.x,cameraLookTarget.z,camDistance+7.2)){const distance=rayBoxHitDistance(cameraLookTarget,cameraDirectionTarget,blocker,camDistance,.25);if(distance<nearestHit)nearestHit=distance}if(Number.isFinite(nearestHit))cameraPositionTarget.copy(cameraLookTarget).addScaledVector(cameraDirectionTarget,Math.max(1,nearestHit-.4));camera.position.lerp(cameraPositionTarget,1-Math.pow(.001,dt));camera.lookAt(cameraLookTarget);mapUpdateElapsed+=dt;if(mapUpdateElapsed>=.1){mapUpdateElapsed-=.1;drawMap(t)}const target=nearestInteraction();$('interact').textContent=target?({car:'ENTER VEHICLE',carExit:'EXIT VEHICLE',door:'ENTER BUILDING',interiorExit:'EXIT INTERIOR',kiosk:'USE CITY KIOSK',landmark:'OPEN CITY SERVICE',dealership:'OPEN AUTO DEALER',gearStore:'OPEN GEAR SHOP',pedestrian:'TALK TO PEDESTRIAN'}[target.type]||'INTERACT'):'INTERACT'}
function applyQuality(q){
 quality=Math.max(0,Math.min(3,q));
 const names=['LOW','BALANCED','HIGH','ULTRA'];
 applyRendererResolution();
 const maxAniso=renderer.capabilities.getMaxAnisotropy();
 for(const tex of [asphaltDetail,concreteDetail,facadeDetail])if(tex)tex.anisotropy=Math.min(maxAniso,quality>=3?8:quality>=2?4:quality>=1?2:1);
 // Balanced mobile skips the shadow map; High/Ultra restore controlled-quality shadows.
 renderer.shadowMap.enabled=quality>=1&&(!mobileSafeDefault||quality>=2);
 scene.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.isMesh&&mesh.userData.importedEnvironmentAssetMesh){mesh.receiveShadow=quality>=2;mesh.castShadow=quality>=3}});
 renderer.shadowMap.type=quality>=2?THREE.PCFSoftShadowMap:THREE.BasicShadowMap;
 const shadowSize=quality>=3?(mobileSafeDefault?1024:1536):quality>=2?(mobileSafeDefault?512:768):quality>=1?512:256;
 sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.needsUpdate=true;
 $('qualityText').textContent=names[quality];$('menuQualityBtn').textContent='GRAPHICS: '+names[quality];
 $('perf').textContent='FPS '+(shownFps||'--')+' · '+names[quality]+' · '+playerAssetStatus;saveSettings()
}
// Distance-cull static city detail in coarse intervals. Long road/ground meshes marked
// alwaysVisible stay active so the road network never disappears at the edge of the view.
let staticCullElapsed=0;
function updateStaticCityVisibility(dt){
 staticCullElapsed+=dt;
 if(staticCullElapsed<.18)return;
 staticCullElapsed=0;
 // Tighten low/mobile visibility radii to avoid submitting hundreds of distant facade/detail meshes.
 const radius=[42,56,92,140][quality],radiusSq=radius*radius,cx=camera.position.x,cz=camera.position.z;
 for(const mesh of cityStaticMeshes){
  if(mesh.userData.cityStatic===false||mesh.userData.alwaysVisible)continue;
  const mx=typeof mesh.userData.cullX==='number'?mesh.userData.cullX:mesh.position.x,mz=typeof mesh.userData.cullZ==='number'?mesh.userData.cullZ:mesh.position.z;
  const dx=mx-cx,dz=mz-cz;
  const paddedRadius=radius+(typeof mesh.userData.cullPadding==='number'?mesh.userData.cullPadding:0),shouldShow=dx*dx+dz*dz<=paddedRadius*paddedRadius;
  if(mesh.visible!==shouldShow)mesh.visible=shouldShow;
 }
 // Skinned pedestrians and multi-part traffic models are draw-call expensive.
 // Keep simulation/collision active but only render actors near the player.
 const target=inCar?inCar.g.position:player.position,tx=target.x,tz=target.z;
 const pedRadius=[36,48,70,95][quality],pedRadiusSq=pedRadius*pedRadius;
 for(const p of pedestrians){const dx=p.position.x-tx,dz=p.position.z-tz,show=dx*dx+dz*dz<=pedRadiusSq;if(p.visible!==show)p.visible=show}
 const vehicleRadius=[48,64,90,120][quality],vehicleRadiusSq=vehicleRadius*vehicleRadius;
 for(const v of vehicles){if(v===inCar){if(!v.g.visible)v.g.visible=true;continue}const dx=v.g.position.x-tx,dz=v.g.position.z-tz,show=dx*dx+dz*dz<=vehicleRadiusSq;if(v.g.visible!==show)v.g.visible=show}
}
function setPaused(v){paused=v;$('pauseMenu').classList.toggle('open',paused);$('pauseBtn').textContent=paused?'▶ RESUME':'Ⅱ PAUSE';if(paused)clearInputs();say(paused?'Game paused':'Back to the city')}
function recover(){if(inCar){const v=inCar;v.speed=0;v.steer=0;v.health=100;let spot=null;for(const side of [-1.8,1.8]){const off=new THREE.Vector3(side,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),v.g.rotation.y),x=v.g.position.x+off.x,z=v.g.position.z+off.z;if(!blocked(x,z,.62,v)){spot={x,z};break}}if(spot)player.position.set(spot.x,0,spot.z);else player.position.set(0,0,23);inCar=null;player.visible=true;$('interact').textContent='ENTER VEHICLE'}else{player.position.set(0,0,23);for(const v of vehicles){v.speed=0;v.health=100}}jumpV=0;stamina=100;$('drivepad').classList.remove('visible');$('vehicleStatus').style.display='none';yaw=0;pitch=.22;setPaused(false);saveSettings();say('Recovery complete')}
$('pauseBtn').addEventListener('click',()=>setPaused(!paused));$('resumeBtn').addEventListener('click',()=>setPaused(false));$('recoverBtn').addEventListener('click',recover);$('restartBtn').addEventListener('click',()=>{saveSettings();location.reload()});$('menuQualityBtn').addEventListener('click',()=>applyQuality((quality+1)%4));$('menuTimeBtn').addEventListener('click',()=>setNight(!nightMode));
$('qualityBtn').addEventListener('click',()=>{applyQuality((quality+1)%4);say('Graphics preset: '+$('qualityText').textContent)});
function bindHold(id,key){const el=$(id);const on=e=>{e.preventDefault();keys[key]=true;el.classList.add('down');try{el.setPointerCapture(e.pointerId)}catch{}};const off=()=>{keys[key]=false;if(key==='s')reverseBrakeLatched=false;el.classList.remove('down')};el.addEventListener('pointerdown',on);['pointerup','pointercancel','lostpointercapture','pointerleave'].forEach(ev=>el.addEventListener(ev,off))}
bindHold('gasBtn','w');bindHold('brakeBtn','s');
addEventListener('pagehide',()=>{clearInputs();saveSettings()});let autosaveElapsed=0,cpuMsSum=0,cpuMsSamples=0,cpuMsPeak=0,updateCpuMsSum=0,updateCpuMsSamples=0,updateCpuMsPeak=0,renderCpuMsSum=0,renderCpuMsSamples=0,renderCpuMsPeak=0,lastCpuAvgMs=0,lastCpuPeakMs=0,lastUpdateCpuAvgMs=0,lastUpdateCpuPeakMs=0,lastRenderCpuAvgMs=0,lastRenderCpuPeakMs=0;function frame(){requestAnimationFrame(frame);const workStart=performance.now();const rawDt=clock.getDelta();let dt=Math.min(rawDt,.04);autosaveElapsed+=dt;if(autosaveElapsed>=12){autosaveElapsed=0;saveSettings()}fpsElapsed+=rawDt;fpsFrames++;debugFrameTimes.push(rawDt*1000);if(debugFrameTimes.length>240)debugFrameTimes.shift();if(fpsElapsed>=.5){shownFps=Math.round(fpsFrames/fpsElapsed);const avgCpu=cpuMsSamples?cpuMsSum/cpuMsSamples:0;lastCpuAvgMs=avgCpu;lastCpuPeakMs=cpuMsPeak;lastUpdateCpuAvgMs=updateCpuMsSamples?updateCpuMsSum/updateCpuMsSamples:0;lastUpdateCpuPeakMs=updateCpuMsPeak;lastRenderCpuAvgMs=renderCpuMsSamples?renderCpuMsSum/renderCpuMsSamples:0;lastRenderCpuPeakMs=renderCpuMsPeak;if(debugOverlay){const sorted=[...debugFrameTimes].sort((a,b)=>a-b),p95=sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]:0;debugOverlay.textContent='REALCITY PERF (measurement only)\\nFPS: '+shownFps+'\\np95 frame: '+p95.toFixed(1)+' ms\\nNPCs: '+pedestrians.length+'\\nBuild: '+buildSha;} $('perf').textContent='FPS '+shownFps+' · JS '+avgCpu.toFixed(1)+'/'+cpuMsPeak.toFixed(1)+'ms · DC '+renderer.info.render.calls+' · TRI '+renderer.info.render.triangles+' · GEO '+renderer.info.memory.geometries+' · TEX '+renderer.info.memory.textures+' · MAP≈1MB* · '+['LOW','BALANCED','HIGH','ULTRA'][quality]+' · '+playerAssetStatus;fpsFrames=0;fpsElapsed=0;cpuMsSum=0;cpuMsSamples=0;cpuMsPeak=0;updateCpuMsSum=0;updateCpuMsSamples=0;updateCpuMsPeak=0;renderCpuMsSum=0;renderCpuMsSamples=0;renderCpuMsPeak=0;if(mobileSafeDefault){if(shownFps<24){adaptiveLowElapsed+=.5;adaptiveHighElapsed=0}else if(shownFps>38){adaptiveHighElapsed+=.5;adaptiveLowElapsed=0}else{adaptiveLowElapsed=Math.max(0,adaptiveLowElapsed-.5);adaptiveHighElapsed=0}adaptiveScaleElapsed+=.5;if(adaptiveScaleElapsed>=2){adaptiveScaleElapsed=0;const scaleCeiling=[1.0,1.1,1.25,1.5][quality];let next=mobileRenderScale;if(adaptiveLowElapsed>=2){next=Math.max(.85,mobileRenderScale-.05);adaptiveLowElapsed=0}else if(adaptiveHighElapsed>=6){next=Math.min(scaleCeiling,mobileRenderScale+.025);adaptiveHighElapsed=0}if(Math.abs(next-mobileRenderScale)>.005){mobileRenderScale=next;applyRendererResolution()}}}}let updateCpuNow=0,renderCpuNow=0;if(!paused){const updateStart=performance.now();update(dt);updateStaticCityVisibility(dt);updateCpuNow=performance.now()-updateStart;const renderStart=performance.now();renderer.render(scene,camera);renderCpuNow=performance.now()-renderStart}const cpuMs=performance.now()-workStart;cpuMsSum+=cpuMs;cpuMsSamples++;cpuMsPeak=Math.max(cpuMsPeak,cpuMs);if(!paused){updateCpuMsSum+=updateCpuNow;updateCpuMsSamples++;updateCpuMsPeak=Math.max(updateCpuMsPeak,updateCpuNow);renderCpuMsSum+=renderCpuNow;renderCpuMsSamples++;renderCpuMsPeak=Math.max(renderCpuMsPeak,renderCpuNow)}}frame();applyQuality(quality);if(nightMode)setNight(true);
// One four-preset graphics controller is shared by the HUD and pause menu.
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyRendererResolution()});
loadfill.style.width='100%';loadnote.textContent='City ready · entering world';requestAnimationFrame(()=>requestAnimationFrame(()=>{load.style.opacity='0';setTimeout(()=>load.remove(),250);say('City ready') }));
