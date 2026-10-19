import * as THREE from 'three';

/**
 * REALCITY modern-city art pass.
 * Grounded contemporary architecture: concrete, stucco, glass, balconies,
 * rooftop HVAC, streetlights and restrained shopfront details. No sci-fi props.
 * Shared geometry and instancing keep draw calls and memory under control.
 */
export function addFutureCityLayer(scene: THREE.Scene, quality: number): void {
  const makeMap = (kind: 'concrete' | 'stucco' | 'asphalt' | 'glass', size = 256) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const palette = {
      concrete: ['#777773', '#888781', '#666762'],
      stucco: ['#b6a58c', '#c7b79f', '#9d8b74'],
      asphalt: ['#343638', '#414345', '#292b2d'],
      glass: ['#53666d', '#71838a', '#34484f']
    } as const;
    const colors = palette[kind];
    ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, size, size);
    let seed = kind.length * 104729;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 1800; i++) {
      ctx.globalAlpha = 0.025 + rand() * 0.07;
      ctx.fillStyle = rand() > .5 ? colors[1] : colors[2];
      const x = rand() * size, y = rand() * size;
      ctx.fillRect(x, y, 1 + rand() * 5, 1 + rand() * 4);
    }
    ctx.globalAlpha = 1;
    if (kind === 'concrete' || kind === 'stucco') {
      ctx.strokeStyle = 'rgba(35,32,28,.12)'; ctx.lineWidth = 1;
      for (let y = 0; y < size; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
    } else if (kind === 'glass') {
      ctx.fillStyle = 'rgba(220,235,237,.16)';
      for (let x = 12; x < size; x += 64) ctx.fillRect(x, 0, 2, size);
      for (let y = 48; y < size; y += 64) ctx.fillRect(0, y, size, 2);
    } else {
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = 'rgba(210,210,200,.12)';
        ctx.fillRect(rand() * size, rand() * size, 2 + rand() * 12, 1 + rand() * 2);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 1;
    return texture;
  };

  const concreteMap = makeMap('concrete');
  const stuccoMap = makeMap('stucco');
  const glassMap = makeMap('glass');
  const asphaltMap = makeMap('asphalt');
  const mat = (color: number, roughness = .8, metalness = .05) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const concrete = mat(0xb1b0a8); concrete.map = concreteMap;
  const stucco = mat(0xd2c0a4); stucco.map = stuccoMap;
  const darkConcrete = mat(0x777975); darkConcrete.map = concreteMap;
  const asphalt = mat(0x555657, .96); asphalt.map = asphaltMap;
  const glass = new THREE.MeshStandardMaterial({ color: 0xa8c0c7, roughness: .32, metalness: .18, map: glassMap });
  const darkGlass = new THREE.MeshStandardMaterial({ color: 0x52666e, roughness: .3, metalness: .16, map: glassMap });
  const white = mat(0xe0ddd4, .72);
  const blackMetal = mat(0x292d2e, .48, .55);
  const warmLamp = new THREE.MeshStandardMaterial({ color: 0xffe0a3, emissive: 0xffc56b, emissiveIntensity: .22, roughness: .5 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 10);
  const staticObjects: THREE.Object3D[] = [];
  const addBox = (w:number,h:number,d:number, material:THREE.Material, x:number,y:number,z:number, cast=false) => {
    const mesh = new THREE.Mesh(box, material);
    mesh.position.set(x,y,z); mesh.scale.set(w,h,d);
    mesh.castShadow = cast; mesh.receiveShadow = true;
    mesh.userData.cityStatic = true; mesh.userData.alwaysVisible = true;
    scene.add(mesh); staticObjects.push(mesh); return mesh;
  };
  const addCylinder = (radius:number,height:number,material:THREE.Material,x:number,y:number,z:number) => {
    const mesh = new THREE.Mesh(cylinder, material);
    mesh.position.set(x,y,z); mesh.scale.set(radius*2,height,radius*2);
    mesh.userData.cityStatic = true; mesh.userData.alwaysVisible = true;
    scene.add(mesh); staticObjects.push(mesh); return mesh;
  };

  // A contemporary mid-rise landmark with real-world proportions and muted materials.
  const bx = 9.5, bz = 9.5, floors = 11, floorH = 3.15, buildingH = floors * floorH;
  addBox(9.5, buildingH, 9.5, concrete, bx, buildingH / 2, bz, true);
  addBox(9.8, .32, 9.8, darkConcrete, bx, buildingH + .16, bz, true);
  // Window bays on all four faces, with dark mullions and subtle glass variation.
  for (let floor = 0; floor < floors; floor++) {
    const y = 1.0 + floor * floorH;
    for (let i = 0; i < 4; i++) {
      const offset = -3.25 + i * 2.15;
      addBox(1.25, 1.65, .07, floor % 3 === 0 ? glass : darkGlass, bx + offset, y, bz + 4.79);
      addBox(1.25, 1.65, .07, glass, bx + offset, y, bz - 4.79);
      addBox(.07, 1.65, 1.25, darkGlass, bx + 4.79, y, bz + offset);
      addBox(.07, 1.65, 1.25, glass, bx - 4.79, y, bz + offset);
    }
    // Continuous concrete floor ledges replace glowing sci-fi bands.
    if (floor > 0) {
      addBox(9.65, .12, .12, white, bx, floor * floorH, bz + 4.82);
      addBox(9.65, .12, .12, white, bx, floor * floorH, bz - 4.82);
    }
  }
  // Flat roof parapet, rooftop water tanks and HVAC equipment.
  addBox(9.8, .65, .22, white, bx, buildingH + .48, bz + 4.7);
  addBox(9.8, .65, .22, white, bx, buildingH + .48, bz - 4.7);
  addBox(.22, .65, 9.4, white, bx + 4.7, buildingH + .48, bz);
  addBox(.22, .65, 9.4, white, bx - 4.7, buildingH + .48, bz);
  for (const [x,z] of [[bx-2,bz-1],[bx+1,bz+1],[bx+2.4,bz-2]] as number[][]) {
    addBox(1.25, .8, 1.1, darkConcrete, x, buildingH + .65, z, true);
    addBox(.9, .12, .82, blackMetal, x, buildingH + 1.11, z);
    for (let k = -1; k <= 1; k++) addBox(.04, .42, .72, blackMetal, x + k*.22, buildingH + .88, z);
  }
  addCylinder(.7, 1.4, white, bx - 2.8, buildingH + 1.0, bz + 2.4);
  addBox(1.5, .18, 1.5, darkConcrete, bx - 2.8, buildingH + 1.72, bz + 2.4);

  // Modern low-rise storefronts and balcony details placed around the outer blocks.
  const rng = (seed:number) => { let s = seed >>> 0; return () => { s = (Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; };
  const random = rng(20261019);
  for (let gx = -5; gx <= 5; gx++) for (let gz = -5; gz <= 5; gz++) {
    if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) continue;
    const x = gx * 20 + 10, z = gz * 20 + 10;
    const h = 5.5 + random() * 13;
    const w = 7 + random() * 4, d = 7 + random() * 4;
    const facade = random() > .5 ? stucco : concrete;
    // Roof cap and ground-level recessed shopfront glazing.
    addBox(w, h, d, facade, x, h/2, z, true);
    addBox(w + .12, .22, d + .12, darkConcrete, x, h + .11, z);
    addBox(w*.72, 1.9, .08, darkGlass, x, 1.35, z + d/2 + .045);
    addBox(w*.72, .08, .12, blackMetal, x, 2.35, z + d/2 + .08);
    // A few rows of evenly spaced windows.
    const rows = Math.max(1, Math.floor((h - 2.5) / 2.5));
    const cols = Math.max(2, Math.floor(w / 2.1));
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const wx = x - w/2 + .9 + col * ((w - 1.8) / Math.max(1, cols - 1));
      const wy = 3.0 + row * 2.45;
      addBox(.85, 1.15, .055, (row+col)%4===0 ? glass : darkGlass, wx, wy, z + d/2 + .035);
      if (quality >= 2 && random() > .55) {
        addBox(.98, .08, .32, blackMetal, wx, wy - .62, z + d/2 + .16);
      }
    }
    // Occasional simple balconies with dark metal railings.
    if (h > 10 && random() > .42) {
      for (const row of [4.2, 7.1]) {
        addBox(1.5, .12, .65, concrete, x + w*.24, row, z + d/2 + .3);
        addBox(1.5, .55, .045, blackMetal, x + w*.24, row + .28, z + d/2 + .61);
      }
    }
    // Wall-mounted AC condenser boxes, a familiar modern urban detail.
    if (random() > .45) {
      const ax = x - w*.28, ay = Math.min(h - .7, 3.5 + random()*4);
      addBox(.75, .48, .38, white, ax, ay, z + d/2 + .2);
      addBox(.42, .3, .04, blackMetal, ax, ay, z + d/2 + .405);
    }
  }

  // Contemporary street furniture: warm LED street lamps and road-edge markings.
  const lampPositions: Array<[number,number]> = [];
  for (let x = -100; x <= 100; x += 40) {
    lampPositions.push([x, -8], [x, 32]);
  }
  for (const [x,z] of lampPositions) {
    addCylinder(.075, 5.5, blackMetal, x, 2.75, z);
    addBox(.12, .12, 1.25, blackMetal, x, 5.42, z + .52);
    addBox(.32, .09, .48, warmLamp, x, 5.35, z + 1.05);
  }
  // Road markings are matte paint, not neon strips.
  const paint = new THREE.MeshStandardMaterial({ color: 0xd6d0b5, roughness: .95 });
  for (let x = -100; x <= 100; x += 12) {
    addBox(4.2, .018, .12, paint, x, .035, -20);
    addBox(4.2, .018, .12, paint, x, .035, 20);
  }
  // Small roadside concrete planters and trees add scale and organic silhouettes.
  const soil = mat(0x5a4b39, .98);
  const trunk = mat(0x5b4432, .95);
  const foliage = new THREE.MeshStandardMaterial({ color: 0x526d45, roughness: .92 });
  const crownGeo = new THREE.SphereGeometry(1, quality >= 2 ? 10 : 7, quality >= 2 ? 8 : 5);
  for (let x = -90; x <= 90; x += 30) {
    for (const z of [-11, 11]) {
      addBox(2.1, .6, 1.8, darkConcrete, x, .3, z, true);
      addBox(1.7, .12, 1.4, soil, x, .65, z);
      addCylinder(.14, 2.1, trunk, x, 1.7, z);
      const crown = new THREE.Mesh(crownGeo, foliage);
      crown.position.set(x, 3.0, z); crown.scale.set(1.25, 1.45, 1.25);
      crown.castShadow = quality >= 2; crown.userData.cityStatic = true; crown.userData.alwaysVisible = true;
      scene.add(crown); staticObjects.push(crown);
    }
  }
}
