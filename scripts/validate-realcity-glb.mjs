#!/usr/bin/env node
/**
 * Validate a binary glTF (GLB) before it is integrated into REALCITY.
 * Dependency-free structural gate; this does not replace visual animation review.
 *
 * Usage:
 *   node scripts/validate-realcity-glb.mjs public/models/realcity-protagonist-v2.glb protagonist
 *   node scripts/validate-realcity-glb.mjs public/models/realcity-pedestrian-casual.glb pedestrian
 */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const [inputPath, role = 'protagonist'] = process.argv.slice(2);
if (!inputPath) {
  console.error('Usage: node scripts/validate-realcity-glb.mjs <model.glb> [protagonist|pedestrian|vehicle]');
  process.exit(2);
}
if (!['protagonist', 'pedestrian', 'vehicle'].includes(role)) {
  console.error(`Unknown role "${role}". Use protagonist, pedestrian, or vehicle.`);
  process.exit(2);
}

const failures = [];
const warnings = [];
const checks = [];
const check = (condition, message) => {
  (condition ? checks : failures).push(message);
};
const warn = message => warnings.push(message);
const filePath = path.resolve(inputPath);

let bytes;
try {
  bytes = await readFile(filePath);
} catch (error) {
  console.error(`FAIL: Cannot read ${filePath}: ${error.message}`);
  process.exit(1);
}

const fileStat = await stat(filePath);
check(bytes.length >= 20, 'File is large enough to contain a GLB header and JSON chunk');

let gltf;
if (bytes.length >= 20) {
  const magic = bytes.toString('ascii', 0, 4);
  const version = bytes.readUInt32LE(4);
  const declaredLength = bytes.readUInt32LE(8);
  check(magic === 'glTF', 'GLB magic is glTF');
  check(version === 2, 'GLB version is 2');
  check(declaredLength === bytes.length, 'Declared GLB length matches actual file length');

  let offset = 12;
  let jsonChunkCount = 0;
  let binChunkCount = 0;
  while (offset + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    offset += 8;
    if (chunkLength % 4 !== 0) warn(`GLB chunk length ${chunkLength} is not 4-byte aligned; browser GLTFLoader acceptance must be confirmed by runtime smoke test`);
    if (offset + chunkLength > bytes.length) {
      failures.push('GLB chunk extends beyond end of file');
      break;
    }
    if (chunkType === 0x4E4F534A) {
      jsonChunkCount++;
      try {
        gltf = JSON.parse(bytes.toString('utf8', offset, offset + chunkLength).replace(/[\\u0000\\s]+$/g, ''));
      } catch (error) {
        failures.push(`JSON chunk cannot be parsed: ${error.message}`);
      }
    } else if (chunkType === 0x004E4942) {
      binChunkCount++;
    } else {
      warn(`Unknown GLB chunk type 0x${chunkType.toString(16)}`);
    }
    offset += chunkLength;
  }
  check(offset === bytes.length, 'GLB chunks consume the complete file');
  check(jsonChunkCount === 1, 'Exactly one JSON chunk is present');
  check(binChunkCount <= 1, 'At most one embedded BIN chunk is present');
}

if (gltf) {
  check(gltf.asset?.version === '2.0', 'glTF asset version is 2.0');
  check(Array.isArray(gltf.scenes) && gltf.scenes.length > 0, 'At least one scene is present');
  check(Array.isArray(gltf.nodes) && gltf.nodes.length > 0, 'Scene graph has nodes');
  check(Array.isArray(gltf.meshes) && gltf.meshes.length > 0, 'At least one mesh is present');
  check(Array.isArray(gltf.materials) && gltf.materials.length > 0, 'At least one material is present');

  const bufferViews = gltf.bufferViews ?? [];
  const accessors = gltf.accessors ?? [];
  const buffers = gltf.buffers ?? [];
  const images = gltf.images ?? [];
  const skins = gltf.skins ?? [];
  const animations = gltf.animations ?? [];
  const primitives = gltf.meshes.flatMap(mesh => mesh.primitives ?? []);
  const vertexAccessors = primitives.map(p => p.attributes?.POSITION).filter(Number.isInteger).map(i => accessors[i]).filter(Boolean);
  const joints = skins.reduce((sum, skin) => sum + (skin.joints?.length ?? 0), 0);
  const clipNames = animations.map((clip, i) => clip.name || `<unnamed-${i}>`);
  const triangleCount = primitives.reduce((sum, p) => {
    const accessor = Number.isInteger(p.indices) ? accessors[p.indices] : null;
    if (p.mode !== undefined && p.mode !== 4) return sum;
    if (accessor?.count) return sum + Math.floor(accessor.count / 3);
    const position = Number.isInteger(p.attributes?.POSITION) ? accessors[p.attributes.POSITION] : null;
    return sum + Math.floor((position?.count ?? 0) / 3);
  }, 0);

  check(buffers.every(b => !b.uri || !/^https?:/i.test(b.uri)), 'No remote HTTP buffer dependencies');
  check(images.every(img => !img.uri || img.uri.startsWith('data:') || !/^https?:/i.test(img.uri)), 'No remote HTTP image dependencies');
  check(buffers.every(b => !b.uri || b.uri.startsWith('data:') || path.extname(b.uri).toLowerCase() !== '.bin'), 'External buffer references are not unexpected .bin files');
  check(accessors.every(a => Number.isInteger(a.count) && a.count >= 0), 'Accessor counts are valid non-negative integers');
  check(vertexAccessors.length > 0, 'At least one mesh primitive has POSITION data');
  check(vertexAccessors.every(a => Array.isArray(a.min) && Array.isArray(a.max) &&
    [...a.min, ...a.max].every(Number.isFinite)), 'Position accessors provide finite bounds');

  if (role === 'protagonist' || role === 'pedestrian') {
    check(skins.length > 0, 'Skinned character contains at least one skin');
    check(joints >= (role === 'protagonist' ? 20 : 12), `Character skeleton has enough joints (${joints} found)`);
    check(primitives.some(p => Number.isInteger(p.attributes?.JOINTS_0) && Number.isInteger(p.attributes?.WEIGHTS_0)),
      'Character mesh has joint indices and skin weights');
    const required = role === 'protagonist' ? ['idle', 'walk', 'run', 'jump'] : [];
    for (const name of required) {
      check(clipNames.some(clip => clip.toLowerCase().includes(name)), `Animation clip exists: ${name}`);
    }
    if (role === 'pedestrian' && !clipNames.some(clip => /idle|stand|breath/i.test(clip)) &&
        !clipNames.some(clip => /walk|walking/i.test(clip))) {
      warn('No embedded pedestrian animation clips; runtime must supply the tested procedural bone-animation fallback');
    }
    if (role === 'protagonist') {
      for (const name of ['land', 'turnleft', 'turnright']) {
        if (!clipNames.some(clip => clip.toLowerCase().replace(/[ _-]/g, '').includes(name))) {
          warn(`Recommended protagonist clip is missing: ${name}`);
        }
      }
    }
  }

  if (role === 'vehicle') {
    const nodeNames = (gltf.nodes ?? []).map(node => node.name ?? '');
    const wheelNodes = nodeNames.filter(name => /wheel|tire|tyre/i.test(name));
    check(wheelNodes.length >= 4, `Vehicle has at least four named wheel nodes (${wheelNodes.length} found)`);
  }

  const jointCounts = skins.map(skin => skin.joints?.length ?? 0);
  console.log(`REALCITY GLB validation: ${filePath}`);
  console.log(`Role: ${role} | Size: ${(fileStat.size / 1024 / 1024).toFixed(2)} MiB | Meshes: ${gltf.meshes.length} | Primitives: ${primitives.length} | Approx triangles: ${triangleCount} | Materials: ${gltf.materials.length} | Skins: ${skins.length} | Joints/skin: ${jointCounts.join(', ') || 'none'} | Clips: ${clipNames.join(', ') || 'none'}`);
} else {
  failures.push('Could not parse a glTF JSON chunk');
}

for (const message of checks) console.log(`PASS  ${message}`);
for (const message of warnings) console.warn(`WARN  ${message}`);
for (const message of failures) console.error(`FAIL  ${message}`);
console.log(`Result: ${checks.length} passed, ${warnings.length} warnings, ${failures.length} failures`);
if (failures.length) process.exit(1);
