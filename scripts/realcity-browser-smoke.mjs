import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const origin = 'http://127.0.0.1:4173';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
let browser;
const errors = [];
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(origin); if (r.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Vite preview did not become ready');
  browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });
  let assetStatus = 0;
  page.on('response', response => { if (response.url().endsWith('/models/realcity-protagonist.glb')) assetStatus = response.status(); });
  await page.goto(origin + '/?qa=1', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => typeof window.__REALCITY_QA__ === 'function', null, { timeout: 10000 });
  await page.waitForFunction(() => window.__REALCITY_QA__().rigged === true, null, { timeout: 15000 });
  await page.waitForFunction(() => window.__REALCITY_QA__().pedestrianAssets > 0 && window.__REALCITY_QA__().sedanImported === true, null, { timeout: 15000 });
  await page.waitForFunction(() => window.__REALCITY_QA__().pedestrianWalking === true, null, { timeout: 15000 });
  await page.waitForFunction(() => window.__REALCITY_QA__().active === 'idle', null, { timeout: 5000 });
  const idle = await page.evaluate(() => window.__REALCITY_QA__());
  await page.keyboard.down('w');
  await page.waitForFunction(() => window.__REALCITY_QA__().active === 'walk', null, { timeout: 5000 });
  const walk = await page.evaluate(() => window.__REALCITY_QA__());
  await page.locator('#sprint').dispatchEvent('pointerdown', { pointerId: 1 });
  await page.waitForFunction(() => window.__REALCITY_QA__().active === 'run', null, { timeout: 5000 });
  const run = await page.evaluate(() => window.__REALCITY_QA__());
  await page.locator('#sprint').dispatchEvent('pointerup', { pointerId: 1 });
  await page.keyboard.up('w');
  await page.waitForFunction(() => window.__REALCITY_QA__().active === 'idle', null, { timeout: 5000 });
  await page.locator('#jump').click();
  await page.waitForFunction(() => window.__REALCITY_QA__().active === 'jump', null, { timeout: 5000 });
  const jump = await page.evaluate(() => window.__REALCITY_QA__());
  if (jump.position.y <= 0.01) throw new Error('Jump animation activated without upward player movement');
  await page.waitForFunction(() => window.__REALCITY_QA__().active === 'idle', null, { timeout: 15000 });
  await page.evaluate(() => window.__REALCITY_QA__().prepareVehicle());
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__REALCITY_QA__().inCar === true, null, { timeout: 5000 });
  const carBefore = await page.evaluate(() => window.__REALCITY_QA__());
  await page.keyboard.down('w');
  await page.waitForFunction(() => window.__REALCITY_QA__().vehicleSpeed > 0.5, null, { timeout: 5000 });
  await new Promise(resolve => setTimeout(resolve, 800));
  await page.keyboard.up('w');
  const carAfter = await page.evaluate(() => window.__REALCITY_QA__());
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/realcity-browser-smoke.png' });
  if (assetStatus !== 200) throw new Error('Protagonist GLB response status was ' + assetStatus);
  if (!idle.canvas || idle.bones < 20 || !idle.clips.some(x => /idle/i.test(x)) || !idle.clips.some(x => /walk/i.test(x)) || !idle.clips.some(x => /run/i.test(x)) || !['asset', 'procedural'].includes(idle.jumpAnimation)) throw new Error('Rig or expected locomotion support missing: ' + JSON.stringify(idle));
  if (idle.pedestrians < 10 || idle.vehicles < 1 || idle.pedestrianAssets < 1 || !idle.sedanImported) throw new Error('Expected imported starter city assets are missing: ' + JSON.stringify(idle));
  if (!carBefore.inCar || carAfter.vehiclePosition === null || Math.hypot(carAfter.vehiclePosition.x-carBefore.vehiclePosition.x,carAfter.vehiclePosition.z-carBefore.vehiclePosition.z)<0.05) throw new Error('Imported sedan did not move under throttle: '+JSON.stringify({carBefore,carAfter}));
  if (Math.hypot(walk.position.x-idle.position.x, walk.position.z-idle.position.z) < 0.01) throw new Error('Player position did not respond to forward input');
  if (errors.length) throw new Error('Browser errors: ' + errors.join(' | '));
  console.log(JSON.stringify({ ok: true, assetStatus, idle: idle.active, walk: walk.active, run: run.active, jump: jump.active, jumpAnimation: idle.jumpAnimation, jumpHeight: jump.position.y, pedestrians: idle.pedestrians, pedestrianAssets: idle.pedestrianAssets, vehicles: idle.vehicles, sedanImported: idle.sedanImported, vehicleMoved: true, bones: idle.bones, clips: idle.clips, playerMoved: true, browserErrors: errors.length }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
