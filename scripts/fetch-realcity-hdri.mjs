#!/usr/bin/env node
/**
 * Fetch the Poly Haven Urban Street 01 photographic HDRI (CC0).
 * The source collection documents Poly Haven assets as CC0. Pin exact bytes
 * with the upstream Git blob SHA so build-time downloads are reproducible.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const asset = {
  name: 'urban_street_01_2k.hdr',
  source: 'https://raw.githubusercontent.com/petroulacl/fps-buildings-env-kit/main/environment/skyboxes/polyhaven-hdri/urban_street_01_2k.hdr',
  bytes: 7286632,
  gitBlobSha1: 'b3132f2cf4dd715a53facc289ce4bc76796d90f5',
};
const response = await fetch(asset.source, { redirect: 'error' });
if (!response.ok) throw new Error(`HDRI download failed (${response.status})`);
const bytes = Buffer.from(await response.arrayBuffer());
const gitBlobHash = createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
if (bytes.length !== asset.bytes) throw new Error(`Unexpected HDRI byte length: ${bytes.length}`);
if (gitBlobHash !== asset.gitBlobSha1) throw new Error(`HDRI checksum mismatch: ${gitBlobHash}`);
const header = bytes.toString('ascii', 0, Math.min(bytes.length, 256));
if (!header.startsWith('#?RADIANCE') || !header.includes('FORMAT=32-bit_rle_rgbe')) {
  throw new Error('Invalid Radiance HDR header');
}
const outputDir = path.resolve('public/environments');
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, asset.name), bytes);
console.log(`Verified and bundled Poly Haven CC0 HDRI: ${asset.name} (${bytes.length} bytes)`);
