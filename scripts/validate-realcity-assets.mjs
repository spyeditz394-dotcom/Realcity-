#!/usr/bin/env node
/**
 * Validate every locally bundled REALCITY GLB with the existing structural gate.
 * This checks file integrity/metadata, not photorealism or final visual quality.
 */
import { spawnSync } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const assets = [
  ['public/models/realcity-protagonist.glb', 'protagonist'],
  ['public/models/realcity-pedestrian-casual.glb', 'pedestrian'],
  ['public/models/realcity-pedestrian-worker.glb', 'pedestrian'],
  ['public/models/realcity-sedan.glb', 'vehicle'],
  ['public/models/realcity-hatchback-sports.glb', 'vehicle'],
  ['public/models/realcity-taxi.glb', 'vehicle'],
  ['public/models/realcity-suv.glb', 'vehicle'],
  ['public/models/realcity-van.glb', 'vehicle'],
  ['public/models/realcity-truck.glb', 'vehicle'],
  ['public/models/realcity-building-d.glb', 'building'],
  ['public/models/realcity-building-e.glb', 'building'],
  ['public/models/realcity-building-n.glb', 'building'],
];
const validator = path.resolve('scripts/validate-realcity-glb.mjs');
let failed = 0;
let totalBytes = 0;
for (const [asset, role] of assets) {
  try {
    const info = await stat(asset);
    totalBytes += info.size;
  } catch {
    console.error(`FAIL missing local asset: ${asset}`);
    failed++;
    continue;
  }
  console.log(`\n=== ${asset} [${role}] ===`);
  const result = spawnSync(process.execPath, [validator, asset, role], { encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) failed++;
}
console.log(`\nREALCITY bundled asset gate: ${assets.length - failed}/${assets.length} assets passed; total package size ${(totalBytes / 1024 / 1024).toFixed(2)} MiB.`);
if (failed) process.exit(1);
