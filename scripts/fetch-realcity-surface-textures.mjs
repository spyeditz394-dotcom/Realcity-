#!/usr/bin/env node
/**
 * Fetch small, checksum-pinned ambientCG photographic albedo maps.
 * ambientCG assets are CC0; only the two color maps needed by REALCITY are bundled.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const assets = [
  {
    name: 'asphalt021_color.jpg',
    source: 'https://raw.githubusercontent.com/petroulacl/fps-buildings-env-kit/main/environment/ground-textures/ambientcg/Asphalt021_2K-JPG/Asphalt021_2K-JPG_Color.jpg',
    bytes: 5678980,
    gitBlobSha1: 'dfefdd665a3e08db066b123dac1b21f399808f86',
  },
  {
    name: 'concrete012_color.jpg',
    source: 'https://raw.githubusercontent.com/petroulacl/fps-buildings-env-kit/main/environment/ground-textures/ambientcg/Concrete012_2K-JPG/Concrete012_2K-JPG_Color.jpg',
    bytes: 5200455,
    gitBlobSha1: '5d65cbd543853e0246b9929f265477c62ed5d9fa',
  },
];
const outputDir = path.resolve('public/textures');
await mkdir(outputDir, { recursive: true });
for (const asset of assets) {
  const response = await fetch(asset.source, { redirect: 'error' });
  if (!response.ok) throw new Error(`Surface texture download failed (${response.status}): ${asset.name}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const gitBlobHash = createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  if (bytes.length !== asset.bytes) throw new Error(`Unexpected byte length for ${asset.name}: ${bytes.length}`);
  if (gitBlobHash !== asset.gitBlobSha1) throw new Error(`Surface texture checksum mismatch for ${asset.name}: ${gitBlobHash}`);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error(`Invalid JPEG header: ${asset.name}`);
  await writeFile(path.join(outputDir, asset.name), bytes);
  console.log(`Verified and bundled ambientCG CC0 texture: ${asset.name} (${bytes.length} bytes)`);
}
