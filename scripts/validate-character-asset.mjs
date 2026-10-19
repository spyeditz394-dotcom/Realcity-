import assert from 'node:assert/strict';

const commit = 'aa02a4e6d8337a0604d2da131bcbbeb1f01badf0';
const path = 'public/assets/vendor/quaternius/night-striker.glb';
const urls = [
  `https://cdn.jsdelivr.net/gh/Seyamalam/blood-league-kickoff@${commit}/${path}`,
  `https://raw.githubusercontent.com/Seyamalam/blood-league-kickoff/${commit}/${path}`,
];
const timeoutMs = 12_000;
let bytes;
let source;
let lastError;

for (const url of urls) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    bytes = await response.arrayBuffer();
    source = url;
    break;
  } catch (error) {
    lastError = error;
  } finally {
    clearTimeout(timer);
  }
}

if (!bytes) throw new Error(`Could not download pinned character GLB: ${lastError}`);
assert.ok(bytes.byteLength >= 20, `GLB too small: ${bytes.byteLength} bytes`);
const view = new DataView(bytes);
assert.equal(view.getUint32(0, true), 0x46546c67, 'Invalid GLB magic');
assert.equal(view.getUint32(4, true), 2, 'Expected glTF 2.0 binary');
assert.equal(view.getUint32(8, true), bytes.byteLength, 'GLB declared length does not match download');

const jsonLength = view.getUint32(12, true);
const jsonType = view.getUint32(16, true);
assert.equal(jsonType, 0x4e4f534a, 'First GLB chunk must be JSON');
const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, jsonLength)).trim());
assert.equal(gltf.asset?.version, '2.0', 'Expected glTF asset version 2.0');

const meshes = gltf.meshes ?? [];
const primitives = meshes.flatMap(mesh => mesh.primitives ?? []);
const vertexCount = primitives.reduce((sum, primitive) => {
  const accessor = gltf.accessors?.[primitive.attributes?.POSITION];
  return sum + (accessor?.count ?? 0);
}, 0);
const skins = gltf.skins ?? [];
const materials = gltf.materials ?? [];
const images = gltf.images ?? [];
const textures = gltf.textures ?? [];
const animations = gltf.animations ?? [];

assert.ok(meshes.length > 0, 'No meshes found');
assert.ok(vertexCount > 0, 'No POSITION vertices found');
assert.ok(skins.length > 0, 'No skin/skeleton found');
assert.ok(materials.length > 0, 'No materials found');
assert.ok(images.length > 0 || primitives.some(p => p.attributes?.COLOR_0 !== undefined),
  'No embedded/referenced images or vertex colors found');
assert.ok(!images.some(image => image.uri && !image.uri.startsWith('data:')),
  'GLB depends on an external image URI; package textures into the GLB before accepting it');

const result = {
  status: 'PASS',
  source,
  commit,
  bytes: bytes.byteLength,
  meshes: meshes.length,
  primitives: primitives.length,
  vertices: vertexCount,
  skins: skins.length,
  joints: skins.reduce((sum, skin) => sum + (skin.joints?.length ?? 0), 0),
  materials: materials.length,
  images: images.length,
  textures: textures.length,
  animations: animations.map(clip => clip.name ?? '(unnamed)'),
  externalImageDependencies: images.filter(image => image.uri && !image.uri.startsWith('data:')).length,
};
console.log(JSON.stringify(result, null, 2));
