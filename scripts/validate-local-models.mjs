import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

function inspect(path, kind) {
  const bytes = readFileSync(path);
  assert.ok(bytes.length >= 20, path + ': file is too small to be GLB');
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, path + ': invalid GLB magic');
  assert.equal(bytes.readUInt32LE(4), 2, path + ': expected GLB 2.0');
  assert.equal(bytes.readUInt32LE(8), bytes.length, path + ': declared length differs from file length');
  const jsonLength = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, path + ': first chunk is not JSON');
  const doc = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8').trim());
  assert.equal(doc.asset?.version, '2.0', path + ': invalid glTF asset version');
  const primitives = (doc.meshes ?? []).flatMap(mesh => mesh.primitives ?? []);
  const vertices = primitives.reduce((sum, primitive) => sum + (doc.accessors?.[primitive.attributes?.POSITION]?.count ?? 0), 0);
  assert.ok(primitives.length > 0 && vertices > 0, path + ': no renderable mesh positions');
  assert.ok((doc.materials ?? []).length > 0, path + ': no materials');
  assert.ok(!(doc.images ?? []).some(image => image.uri && !image.uri.startsWith('data:')), path + ': external image URI dependency is not allowed');
  if (kind === 'character') {
    assert.ok((doc.skins ?? []).length > 0, path + ': character has no skin');
    assert.ok((doc.skins ?? []).some(skin => (skin.joints ?? []).length >= 20), path + ': humanoid joint count is unexpectedly low');
    assert.ok((doc.images ?? []).length > 0, path + ': character has no embedded images');
  }
  return {
    status: 'PASS',
    kind,
    file: path,
    bytes: statSync(path).size,
    meshes: (doc.meshes ?? []).length,
    primitives: primitives.length,
    vertices,
    materials: (doc.materials ?? []).length,
    images: (doc.images ?? []).length,
    textures: (doc.textures ?? []).length,
    skins: (doc.skins ?? []).length,
    joints: (doc.skins ?? []).reduce((sum, skin) => sum + (skin.joints ?? []).length, 0),
    animationClips: (doc.animations ?? []).map(clip => clip.name ?? '(unnamed)'),
    externalImageDependencies: (doc.images ?? []).filter(image => image.uri && !image.uri.startsWith('data:')).length
  };
}

const report = [
  inspect('public/models/realcity-protagonist-upgraded.glb', 'character'),
  inspect('public/models/realcity-sedan-cc0.glb', 'vehicle')
];
console.log(JSON.stringify(report, null, 2));
