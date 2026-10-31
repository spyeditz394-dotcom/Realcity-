#!/usr/bin/env node
/**
 * Fetch a tiny, checksum-pinned subset of Kenney City Kit Commercial models.
 * The upstream pack is CC0. Assets are copied into public/models before Vite
 * builds so runtime requests are same-origin and have no third-party dependency.
 * Git blob SHA-1 checksums pin exact bytes; this is integrity, not a security signature.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const assets = [
  {
    name: 'realcity-building-d.glb',
    source: 'https://raw.githubusercontent.com/Papyszoo/CC0-Public-Domain-Models/main/packs/kenney-city-kit-commercial/models/building_d/building_d.glb',
    gitBlobSha1: 'cf0c89e6083f4c8811510e007d9c8ba3a7a227c1',
    bytes: 106164,
    variant: 'commercial facade D',
  },
  {
    name: 'realcity-building-e.glb',
    source: 'https://raw.githubusercontent.com/Papyszoo/CC0-Public-Domain-Models/main/packs/kenney-city-kit-commercial/models/building_e/building_e.glb',
    gitBlobSha1: '7ff4a5d74a1d93f0354126ad65fedef045b05c4a',
    bytes: 139212,
    variant: 'commercial facade E',
  },
  {
    name: 'realcity-building-n.glb',
    source: 'https://raw.githubusercontent.com/Papyszoo/CC0-Public-Domain-Models/main/packs/kenney-city-kit-commercial/models/building_n/building_n.glb',
    gitBlobSha1: '250ba859deb96c957e678aaf833b69cdb375e40e',
    bytes: 352236,
    variant: 'commercial facade N',
  },
];
const outputDir = path.resolve('public/models');
await mkdir(outputDir, { recursive: true });
for (const asset of assets) {
  const response = await fetch(asset.source, { redirect: 'error' });
  if (!response.ok) throw new Error(`Environment asset download failed (${response.status}): ${asset.name}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const gitBlobHash = createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  if (bytes.length !== asset.bytes) throw new Error(`Unexpected byte length for ${asset.name}: ${bytes.length}`);
  if (gitBlobHash !== asset.gitBlobSha1) throw new Error(`Git blob checksum mismatch for ${asset.name}: ${gitBlobHash}`);
  if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error(`Invalid GLB header: ${asset.name}`);
  }
  await writeFile(path.join(outputDir, asset.name), bytes);
  console.log(`Verified and bundled ${asset.name} (${bytes.length} bytes; ${asset.variant}; CC0)`);
}
