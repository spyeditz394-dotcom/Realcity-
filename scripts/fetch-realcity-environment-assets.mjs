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
  {
    name: 'realcity-building-a.glb',
    source: 'https://raw.githubusercontent.com/Papyszoo/CC0-Public-Domain-Models/main/packs/kenney-city-kit-commercial/models/building_a/building_a.glb',
    gitBlobSha1: '8a03830f1ab4eed5fc0d052b52f1a5c55c7496e8',
    variant: 'commercial facade A',
  },
  {
    name: 'realcity-building-b.glb',
    source: 'https://raw.githubusercontent.com/Papyszoo/CC0-Public-Domain-Models/main/packs/kenney-city-kit-commercial/models/building_b/building_b.glb',
    gitBlobSha1: '96ec68671ebb61950a17d23dcd284cba38432bbe',
    variant: 'commercial facade B',
  },
  {
    name: 'realcity-building-c.glb',
    source: 'https://raw.githubusercontent.com/Papyszoo/CC0-Public-Domain-Models/main/packs/kenney-city-kit-commercial/models/building_c/building_c.glb',
    gitBlobSha1: 'af4f90b02df21108f0f80834c41401e25ba8628e',
    variant: 'commercial facade C',
  },
  {
    name: 'realcity-building-f.glb',
    source: 'https://raw.githubusercontent.com/Papyszoo/CC0-Public-Domain-Models/main/packs/kenney-city-kit-commercial/models/building_f/building_f.glb',
    gitBlobSha1: '66c9eb4dfa201062002657414ab54b2b399d2884',
    variant: 'commercial facade F',
  },
  {
    name: 'realcity-building-g.glb',
    source: 'https://raw.githubusercontent.com/Papyszoo/CC0-Public-Domain-Models/main/packs/kenney-city-kit-commercial/models/building_g/building_g.glb',
    gitBlobSha1: '861fda665576628cc90b0dbfa05c32c5f287fa6d',
    variant: 'commercial facade G',
  },
  {
    name: 'realcity-building-h.glb',
    source: 'https://raw.githubusercontent.com/Papyszoo/CC0-Public-Domain-Models/main/packs/kenney-city-kit-commercial/models/building_h/building_h.glb',
    gitBlobSha1: '691bc722a57819750ff852a7a4689506e9bb7624',
    variant: 'commercial facade H',
  },
];
const outputDir = path.resolve('public/models');
await mkdir(outputDir, { recursive: true });
for (const asset of assets) {
  const response = await fetch(asset.source, { redirect: 'error' });
  if (!response.ok) throw new Error(`Environment asset download failed (${response.status}): ${asset.name}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const gitBlobHash = createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  if (Number.isInteger(asset.bytes) && bytes.length !== asset.bytes) throw new Error(`Unexpected byte length for ${asset.name}: ${bytes.length}`);
  if (gitBlobHash !== asset.gitBlobSha1) throw new Error(`Git blob checksum mismatch for ${asset.name}: ${gitBlobHash}`);
  if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error(`Invalid GLB header: ${asset.name}`);
  }
  await writeFile(path.join(outputDir, asset.name), bytes);
  console.log(`Verified and bundled ${asset.name} (${bytes.length} bytes; ${asset.variant}; CC0)`);
}
