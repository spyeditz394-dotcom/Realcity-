import * as THREE from 'three';

/**
 * REALCITY future-district art pass.
 * Lightweight, procedural sci-fi set dressing; no external network requests.
 * Shared geometry/materials and instancing keep the mobile asset budget controlled.
 */
export function addFutureCityLayer(scene: THREE.Scene, quality: number): void {
  // Small deterministic canvas-generated material maps: no external download and no large binary payload.
  // They provide surface variation while keeping texture memory controlled on mobile.
  const makeTexture = (kind: 'concrete' | 'metal' | 'glass' | 'solar', size = 256) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const palettes = {
      concrete: ['#465158','#596168','#687078'],
      metal: ['#35464e','#50616a','#78878c'],
      glass: ['#102b3c','#194457','#28657a'],
      solar: ['#071b34','#0e3155','#174b70']
    } as const;
    const colors = palettes[kind];
    ctx.fillStyle = colors[0]; ctx.fillRect(0,0,size,size);
    // Deterministic noise: subtle mottling, not random every frame.
    let seed = kind.length * 982451653;
    const rand = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
    for(let i=0;i<1600;i++){
      const v = rand(); ctx.globalAlpha = .025 + rand()*.11;
      ctx.fillStyle = v>.66?colors[2]:v>.32?colors[1]:'#080e12';
      const x=rand()*size,y=rand()*size,w=1+rand()*7,h=1+rand()*5;
      ctx.fillRect(x,y,w,h);
    }
    ctx.globalAlpha=1;
    if(kind==='concrete'){
      ctx.strokeStyle='rgba(210,220,220,.15)'; ctx.lineWidth=1;
      for(let y=0;y<size;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();}
      for(let x=0;x<size;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,size);ctx.stroke();}
    } else if(kind==='metal'){
      ctx.fillStyle='rgba(200,230,235,.22)'; ctx.fillRect(0,0,size,3);
      ctx.fillStyle='rgba(0,0,0,.22)'; ctx.fillRect(0,size-3,size,3);
      for(let x=16;x<size;x+=64){ctx.fillStyle='rgba(8,14,18,.55)';ctx.beginPath();ctx.arc(x,16,2,0,Math.PI*2);ctx.fill();}
    } else if(kind==='glass'){
      ctx.fillStyle='rgba(110,225,255,.14)'; ctx.fillRect(8,8,size-16,2);
      ctx.strokeStyle='rgba(100,210,245,.12)';ctx.lineWidth=1;
      for(let x=0;x<size;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,size);ctx.stroke();}
    } else {
      ctx.strokeStyle='rgba(60,190,255,.55)';ctx.lineWidth=2;
      for(let x=0;x<size;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,size);ctx.stroke();}
      for(let y=0;y<size;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke();}
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=1;
    return texture;
  };
  const concreteMap = makeTexture('concrete');
  const metalMap = makeTexture('metal');
  const glassMap = makeTexture('glass');
  const solarMap = makeTexture('solar');
  const material = (color: number, roughness = .55, metalness = .25, emissive = 0, intensity = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: intensity });
  const steel = material(0x26343c, .42, .72); steel.map = metalMap;
  const paleAlloy = material(0x9aaeb3, .36, .68); paleAlloy.map = concreteMap;
  const glass = new THREE.MeshStandardMaterial({
    color: 0x183d50, roughness: .2, metalness: .5, transparent: true, opacity: .72, map: glassMap
  });
  const cyan = material(0x38f2e2, .28, .35, 0x11bcae, .85);
  const blue = material(0x388dff, .3, .3, 0x175eff, .7);
  const amber = material(0xffb65c, .35, .25, 0x8a3b09, .3);
  const solar = material(0x102d4a, .25, .6); solar.map = solarMap;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(.5, .5, 1, 8);
  const sphere = new THREE.SphereGeometry(1, 10, 8);
  const staticMeshes: THREE.Object3D[] = [];
  const addBox = (w:number,h:number,d:number,mat:THREE.Material,x:number,y:number,z:number, cast=false) => {
    const mesh = new THREE.Mesh(box, mat);
    mesh.position.set(x,y,z); mesh.scale.set(w,h,d); mesh.castShadow = cast;
    mesh.receiveShadow = true; mesh.userData.cityStatic = true; scene.add(mesh); staticMeshes.push(mesh);
    return mesh;
  };
  const addTube = (radius:number,height:number,mat:THREE.Material,x:number,y:number,z:number) => {
    const mesh = new THREE.Mesh(cyl,mat); mesh.position.set(x,y,z); mesh.scale.set(radius*2,height,radius*2);
    mesh.userData.cityStatic = true; scene.add(mesh); staticMeshes.push(mesh); return mesh;
  };

  // Distinctive skyline landmark: layered alloy tower with cyan light bands and antenna.
  const tx = 9.5, tz = 9.5, base = 43;
  addBox(8, base, 8, steel, tx, base/2, tz, true);
  addBox(8.5, .35, 8.5, paleAlloy, tx, base+.12, tz, true);
  addBox(6.8, 9, 6.8, glass, tx, base+4.7, tz, true);
  for (let y=8; y<base-1; y+=7) {
    addBox(8.12,.12,8.12,cyan,tx,y,tz);
    addBox(8.25,.08,.13,blue,tx,y+1,tz+4.07);
  }
  addBox(1.2, 5, 1.2, steel, tx, base+11.5, tz, true);
  addTube(.12, 8, cyan, tx, base+18, tz);

  // Roof hardware: vents, solar arrays and antennae on selected existing blocks.
  const rng = (seed:number) => { let s=seed>>>0; return () => { s=(s*1664525+1013904223)>>>0; return s/4294967296; }; };
  const random = rng(20261019);
  const panelMatrices: THREE.Matrix4[] = [];
  const panelDummy = new THREE.Object3D();
  const ventMatrices: THREE.Matrix4[] = [];
  const ventDummy = new THREE.Object3D();
  for (let gx=-5; gx<=5; gx++) for (let gz=-5; gz<=5; gz++) {
    if (Math.abs(gx)<=1 && Math.abs(gz)<=1) continue;
    const x=gx*20+10, z=gz*20+10;
    const height = (gx>=2? 9+random()*15 : gx<=-2? 5+random()*10 : gz<=-3? 11+random()*18 : 6+random()*10);
    const w=5.5+random()*3.2, d=5.5+random()*3.2, roofY=height+.2;
    // Compact rooftop plant/vent units.
    for(let n=0;n<2;n++){
      ventDummy.position.set(x+(random()-.5)*w*.55,roofY+.32,z+(random()-.5)*d*.55);
      ventDummy.scale.set(.75,.64,.75); ventDummy.rotation.set(0,random()*Math.PI,0); ventDummy.updateMatrix();
      ventMatrices.push(ventDummy.matrix.clone());
    }
    if(random()<.72){
      for(let n=0;n<3;n++){
        panelDummy.position.set(x+(n-1)*1.15,roofY+.45,z);
        panelDummy.scale.set(1,.08,1.8); panelDummy.rotation.set(-.12,random()*.12,0); panelDummy.updateMatrix();
        panelMatrices.push(panelDummy.matrix.clone());
      }
    }
    if(random()<.35){
      addTube(.09,2.4,steel,x+w*.32,roofY+1.2,z-d*.28);
      addBox(.8,.07,.07,cyan,x+w*.32,roofY+2.15,z-d*.28);
    }
  }
  if (ventMatrices.length) {
    const vents = new THREE.InstancedMesh(box, steel, ventMatrices.length);
    ventMatrices.forEach((m,i)=>vents.setMatrixAt(i,m)); vents.instanceMatrix.needsUpdate=true;
    vents.userData.cityStatic=true; scene.add(vents); staticMeshes.push(vents);
  }
  if (panelMatrices.length) {
    const panels = new THREE.InstancedMesh(box, solar, panelMatrices.length);
    panelMatrices.forEach((m,i)=>panels.setMatrixAt(i,m)); panels.instanceMatrix.needsUpdate=true;
    panels.userData.cityStatic=true; scene.add(panels); staticMeshes.push(panels);
    // Fine grid lines make solar panels read as engineered surfaces without high-res textures.
    if (quality>=2) {
      const lines = new THREE.InstancedMesh(box, paleAlloy, panelMatrices.length*2);
      const dm = new THREE.Object3D(); let i=0;
      for(const m of panelMatrices) {
        dm.matrix.copy(m); dm.matrix.decompose(dm.position,dm.quaternion,dm.scale);
        for(const offset of [-.28,.28]) {
          const p = dm.position.clone(); p.z += offset;
          const line = new THREE.Matrix4().compose(p,dm.quaternion,new THREE.Vector3(.92,.025,.018));
          lines.setMatrixAt(i++,line);
        }
      }
      lines.instanceMatrix.needsUpdate=true; lines.userData.cityStatic=true; scene.add(lines); staticMeshes.push(lines);
    }
  }

  // Raised transit connector with repeated support piers and cyan guide lighting.
  addBox(102,.38,2.8,steel, -60, 8.4, -20, true);
  addBox(102,.09,2.45,cyan, -60, 8.65, -20);
  for(let x=-108;x<=-12;x+=16){
    addBox(.48,8,.48,paleAlloy,x,4.1,-20,true);
    addBox(.72,.12,.72,blue,x,8.18,-20);
  }
  // Holographic transit/info pylons in a few plazas.
  for(const [x,z] of [[-30,30],[50,-50],[70,30],[-70,70]]) {
    addBox(.16,2.8,.16,steel,x,1.4,z,true);
    addBox(1.05,1.45,.08,glass,x,2.65,z);
    addBox(.82,.045,.045,cyan,x,3.25,z+.055);
    addBox(.045,.82,.045,blue,x-.43,2.65,z+.055);
    const glow = new THREE.PointLight(0x36dcd1, .55, 5, 2);
    glow.position.set(x,2.7,z+.35); scene.add(glow);
  }
  // Floating delivery drones: small readable silhouettes, no per-frame simulation cost.
  const dronePositions = [[-34,17,-62],[42,23,52],[76,20,-28],[-78,15,42]];
  for(const [x,y,z] of dronePositions) {
    addBox(1.15,.22,.65,steel,x,y,z,true);
    addBox(.34,.12,.34,paleAlloy,x,y+.14,z,true);
    for(const dx of [-.72,.72]) for(const dz of [-.42,.42]) {
      addTube(.055,.08,blue,x+dx,y+.03,z+dz);
    }
    addBox(.22,.08,.08,cyan,x,y-.12,z+.34);
  }
  // Luminous accents and emissive emissive windows remain visible at dusk/night.
  const stripGeometry = new THREE.BoxGeometry(.07,.09,1.65);
  const strips = new THREE.InstancedMesh(stripGeometry, cyan, 72);
  const stripDummy = new THREE.Object3D(); let stripCount=0;
  for(let i=0;i<72;i++) {
    const x=(Math.floor(random()*11)-5)*20+(random()-.5)*5;
    const z=(Math.floor(random()*11)-5)*20+(random()-.5)*5;
    const y=5+random()*22;
    stripDummy.position.set(x,y,z); stripDummy.rotation.y=random()<.5?0:Math.PI/2;
    stripDummy.updateMatrix(); strips.setMatrixAt(stripCount++,stripDummy.matrix);
  }
  strips.count=stripCount; strips.instanceMatrix.needsUpdate=true;
  strips.userData.cityStatic=true; scene.add(strips); staticMeshes.push(strips);

  // Mark new visual assets for the existing static-world culler.
  for (const object of staticMeshes) object.userData.alwaysVisible = true;
}
