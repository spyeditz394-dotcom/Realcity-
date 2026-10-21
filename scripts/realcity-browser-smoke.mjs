import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const origin = 'http://127.0.0.1:4173';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
let browser;
const errors = [];
const failedResponses = [];
const checks = [];
const assert = (condition, message, details) => {
  if (!condition) throw new Error(message + (details === undefined ? '' : ': ' + JSON.stringify(details)));
  checks.push(message);
};
const distance2d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(origin);
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Vite preview did not become ready');

  browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', error => errors.push('pageerror: ' + (error.stack || error.message)));
  page.on('console', message => {
    if (message.type() === 'error') errors.push('console: ' + message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() });
  });

  await page.goto(origin + '/?qa=1', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => typeof window.__REALCITY_QA__ === 'function', null, { timeout: 10000 });
  await page.waitForFunction(() => window.__REALCITY_QA__().rigged === true, null, { timeout: 15000 });
  await page.waitForFunction(() => window.__REALCITY_QA__().pedestrianAssets > 0 && window.__REALCITY_QA__().sedanImported === true, null, { timeout: 15000 });
  await page.waitForFunction(() => window.__REALCITY_QA__().pedestrianWalking === true, null, { timeout: 15000 });
  await page.waitForFunction(() => { const q = window.__REALCITY_QA__(); return q.pedestrianModelNames?.length >= 3 && q.importedTrafficModels >= 4; }, null, { timeout: 20000 });
  await page.waitForFunction(() => window.__REALCITY_QA__().active === 'idle', null, { timeout: 5000 });
  await page.waitForFunction(() => window.__REALCITY_QA__().importedBuildingCount >= 3, null, { timeout: 20000 });
  checks.push('three or more locally bundled CC0 building variants loaded into the city');

  const initial = await page.evaluate(() => window.__REALCITY_QA__());
  assert(initial.cityGridCells === 1024 && initial.cityExtent === 640 && initial.roadGridLines === 33,
    'Expanded city uses 1,024 cells and a full-span 33-line road grid', {
      cityGridCells: initial.cityGridCells, cityExtent: initial.cityExtent, roadGridLines: initial.roadGridLines
    });
  assert(['Civic','Downtown','Industrial','Luxury','Market','Parks','Residential','Suburbs'].every(name => initial.districts?.includes(name)),
    'All eight district categories are represented by generated cells', initial.districts);
  assert(['POLICE','HOSPITAL','FIRE','SCHOOL','FUEL','MARKET','VILLAS'].every(name => initial.landmarks?.includes(name)),
    'All seven required landmark sign treatments are generated', initial.landmarks);
  assert(initial.canvas, 'WebGL canvas is mounted');
  const canvas = await page.locator('#game canvas').boundingBox();
  const radar = await page.locator('#map').boundingBox();
  assert(canvas && canvas.width >= 640 && canvas.height >= 360, 'Game canvas has a usable rendered viewport', canvas);
  assert(radar && radar.width >= 100 && radar.height >= 100, 'City radar/minimap is present and sized', radar);
  assert(initial.bones >= 20 && initial.clips.some(name => /idle/i.test(name)) &&
    initial.clips.some(name => /walk/i.test(name)) && initial.clips.some(name => /run/i.test(name)) &&
    ['asset', 'procedural'].includes(initial.jumpAnimation),
    'Protagonist rig and locomotion animation support are present', { bones: initial.bones, clips: initial.clips, jumpAnimation: initial.jumpAnimation });
  assert(initial.pedestrianModelNames?.length >= 3,
    'Pedestrians use at least three distinct imported model sources', initial.pedestrianModelNames);
  assert(initial.importedTrafficModels >= 4 && initial.trafficModelNames?.length >= 4,
    'At least four imported traffic vehicle meshes are installed', {
      importedTrafficModels: initial.importedTrafficModels, trafficModelNames: initial.trafficModelNames
    });

  assert(initial.pedestrians >= 10 && initial.pedestrianAssets >= 1 && initial.vehicles >= 1 && initial.sedanImported,
    'City population and imported vehicle assets are available', {
      pedestrians: initial.pedestrians, pedestrianAssets: initial.pedestrianAssets,
      vehicles: initial.vehicles, sedanImported: initial.sedanImported
    });
  assert(['sedan','suv','van'].every(style => initial.vehicleStyles?.includes(style)),
    'City traffic contains distinct sedan, SUV and van silhouettes', initial.vehicleStyles);

  assert(initial.pedestrianWalking && initial.pedestrianActive === 'walk',
    'At least one imported pedestrian is actively walking', { pedestrianActive: initial.pedestrianActive });
  const initialRendererStats = await page.evaluate(() => window.__REALCITY_QA__().rendererStats());
  assert(initialRendererStats.visiblePedestrians >= 1,
    'At least one pedestrian is rendered near the player spawn', {
      visiblePedestrians: initialRendererStats.visiblePedestrians,
      pedestrians: initial.pedestrians,
      player: initial.position
    });

  const collision = await page.evaluate(() => window.__REALCITY_QA__().collisionProbe());
  assert(collision && collision.buildingCount >= 1 && collision.playerBlockedAtBuilding && collision.vehicleBlockedAtBuilding,
    'Player and vehicle are blocked by building collision volumes', collision);
  assert(collision.playerBoundaryBlocked && collision.playerClearOutsideEdge && collision.vehicleClearOutsideEdge,
    'Collision boundary blocks penetration while allowing clearance outside the wall', collision);

  // Check the real keyboard path, not just the exposed animation state.
  await page.keyboard.down('w');
  await page.waitForFunction(() => window.__REALCITY_QA__().active === 'walk', null, { timeout: 5000 });
  const walking = await page.evaluate(() => window.__REALCITY_QA__());
  assert(distance2d(walking.position, initial.position) > 0.01, 'Forward input changes player world position', {
    before: initial.position, after: walking.position
  });

  await page.locator('#sprint').dispatchEvent('pointerdown', { pointerId: 1 });
  await page.waitForFunction(() => window.__REALCITY_QA__().active === 'run', null, { timeout: 5000 });
  const running = await page.evaluate(() => window.__REALCITY_QA__());
  assert(running.active === 'run', 'Sprint control switches the protagonist to run animation');
  await page.locator('#sprint').dispatchEvent('pointerup', { pointerId: 1 });
  await page.keyboard.up('w');
  await page.waitForFunction(() => window.__REALCITY_QA__().active === 'idle', null, { timeout: 5000 });
  assert(true, 'Releasing movement input returns protagonist to idle');

  await page.locator('#jump').click();
  await page.waitForFunction(() => {
    const q = window.__REALCITY_QA__();
    return q.jumpPeak > 0.01 && q.jumpFrames > 0;
  }, null, { timeout: 5000 });
  const jumping = await page.evaluate(() => window.__REALCITY_QA__());
  assert(jumping.jumpPeak > 0.01 && jumping.jumpFrames >= 1,
    'Jump control produces airborne movement and animation frames', { peak: jumping.jumpPeak, frames: jumping.jumpFrames });
  await page.waitForFunction(() => window.__REALCITY_QA__().active === 'idle', null, { timeout: 15000 });

  // Exercise live graphics/time controls and verify their UI + persistence contract.
  const timeBefore = await page.locator('#timeText').innerText();
  await page.locator('#timeBtn').click();
  await page.waitForFunction(before => document.querySelector('#timeText')?.textContent !== before, timeBefore, { timeout: 3000 });
  const timeAfter = await page.locator('#timeText').innerText();
  const storedNightMode = await page.evaluate(() => JSON.parse(localStorage.getItem('realcity-settings') || '{}').nightMode);
  assert(timeAfter !== timeBefore && storedNightMode === (timeAfter === 'NIGHT'),
    'Day/night control updates scene mode and persists the preference', { timeBefore, timeAfter, storedNightMode });
  await page.locator('#timeBtn').click();

  const qualityBefore = await page.locator('#qualityText').innerText();
  await page.locator('#qualityBtn').click();
  await page.waitForFunction(before => document.querySelector('#qualityText')?.textContent !== before, qualityBefore, { timeout: 3000 });
  const qualityAfter = await page.locator('#qualityText').innerText();
  const storedSettings = await page.evaluate(() => JSON.parse(localStorage.getItem('realcity-settings') || '{}'));
  assert(qualityAfter !== qualityBefore && Number.isInteger(storedSettings.quality) && storedSettings.version >= 4,
    'Graphics quality control changes setting and persists it', { qualityBefore, qualityAfter, version: storedSettings.version, quality: storedSettings.quality });

  // Pause/resume must actually open and close the overlay without crashing the scene.
  await page.locator('#pauseBtn').click();
  await page.waitForFunction(() => document.querySelector('#pauseMenu')?.classList.contains('open'), null, { timeout: 3000 });
  assert(await page.locator('#pauseMenu').isVisible(), 'Pause control opens the pause menu');
  await page.locator('#resumeBtn').click();
  await page.waitForFunction(() => !document.querySelector('#pauseMenu')?.classList.contains('open'), null, { timeout: 3000 });
  assert(!(await page.locator('#pauseMenu').isVisible()), 'Resume control closes the pause menu');

  // Vehicle lifecycle: enter, accelerate, brake to a safe exit speed, exit, then service.
  await page.evaluate(() => window.__REALCITY_QA__().prepareVehicle());
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__REALCITY_QA__().inCar === true, null, { timeout: 5000 });
  const carBefore = await page.evaluate(() => window.__REALCITY_QA__());
  await page.keyboard.down('w');
  await page.waitForFunction(() => window.__REALCITY_QA__().vehicleSpeed > 0.5, null, { timeout: 5000 });
  await new Promise(resolve => setTimeout(resolve, 800));
  await page.keyboard.up('w');
  await page.keyboard.down('s');
  await page.waitForFunction(() => Math.abs(window.__REALCITY_QA__().vehicleSpeed) < 1.2, null, { timeout: 10000 }).catch(() => {});
  await page.keyboard.up('s');
  const carAfter = await page.evaluate(() => window.__REALCITY_QA__());
  assert(carBefore.inCar && carAfter.vehiclePosition &&
    distance2d(carBefore.vehiclePosition, carAfter.vehiclePosition) > 0.05,
    'Player can enter the imported sedan and throttle moves it', {
      before: carBefore.vehiclePosition, after: carAfter.vehiclePosition,
      speedAfter: carAfter.vehicleSpeed
    });

  if (Math.abs(carAfter.vehicleSpeed) < 1.2) {
    await page.keyboard.press('e');
    await page.waitForFunction(() => window.__REALCITY_QA__().inCar === false, null, { timeout: 5000 });
    assert(true, 'Player can exit the vehicle after slowing down');
  } else {
    throw new Error('Vehicle remained too fast for a safe exit after braking: ' + carAfter.vehicleSpeed);
  }

  const damagedHealth = await page.evaluate(() => window.__REALCITY_QA__().setParkedVehicleHealthForTest(41));
  assert(damagedHealth === 41, 'QA setup records a damaged parked vehicle condition');
  await page.locator('#serviceBtn').click();
  await page.waitForFunction(() => window.__REALCITY_QA__().vehicleStates.find(v => !v.traffic)?.health === 100, null, { timeout: 3000 });
  assert(await page.locator('#serviceBtn').isVisible(), 'Service control restores vehicle condition to 100%');

  // Save a known parked-car state, reload the actual page, and verify persistence.
  await page.evaluate(() => { const q = window.__REALCITY_QA__(); q.prepareVehicle(); q.persistStateForTest(); });
  const beforeReload = await page.evaluate(() => window.__REALCITY_QA__().vehicleStates.find(v => !v.traffic));
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => typeof window.__REALCITY_QA__ === 'function' && window.__REALCITY_QA__().rigged === true && window.__REALCITY_QA__().sedanImported === true, null, { timeout: 15000 });
  await page.waitForFunction(() => window.__REALCITY_QA__().importedTrafficModels >= 4, null, { timeout: 15000 });
  const afterReload = await page.evaluate(() => window.__REALCITY_QA__().vehicleStates.find(v => !v.traffic));
  const restoredState = await page.evaluate(() => window.__REALCITY_QA__());
  assert(beforeReload && afterReload && distance2d(beforeReload, afterReload) < 0.05 &&
    afterReload.health === 100 && restoredState.inCar === false,
    'Vehicle position, health and on-foot state survive a browser reload', { beforeReload, afterReload, inCar: restoredState.inCar });

  const buildIdentity = await page.evaluate(() => ({ globalSha:window.__BUILD_SHA__ || null, qaSha:window.__REALCITY_QA__().buildSha || null }));
  const versionResponse = await fetch(origin + '/version.json');
  const versionJson = versionResponse.ok ? await versionResponse.json() : null;
  assert(typeof buildIdentity.globalSha === 'string' && buildIdentity.globalSha.length > 7 &&
    buildIdentity.globalSha === buildIdentity.qaSha && versionJson?.buildSha === buildIdentity.globalSha,
    'Build SHA is exposed consistently by runtime, QA diagnostics, and version.json',
    {buildIdentity,versionStatus:versionResponse.status,versionJson});
  const debugPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await debugPage.goto(origin + '/?qa=1&debug=perf', { waitUntil: 'networkidle', timeout: 30000 });
  await debugPage.waitForFunction(() => !!document.getElementById('realcity-debug-perf') &&
    document.getElementById('realcity-debug-perf').textContent.includes('Build:'), null, { timeout: 10000 });
  const debugText = await debugPage.locator('#realcity-debug-perf').innerText();
  assert(debugText.includes('p95 frame:') && debugText.includes('NPCs:') && debugText.includes(buildIdentity.globalSha),
    'Measurement-only debug overlay shows FPS, p95 frame time, NPC count, and build SHA', debugText);
  await debugPage.screenshot({ path: 'test-results/realcity-debug-perf.png', fullPage: true });
  await debugPage.close();

  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/realcity-browser-smoke.png', fullPage: true });
  assert(errors.length === 0, 'No browser JavaScript or console errors', errors);
  assert(failedResponses.length === 0, 'No HTTP requests returned an error status', failedResponses);

  console.log(JSON.stringify({
    ok: true,
    checksPassed: checks.length,
    checks,
    protagonist: { assetStatus: 200, bones: initial.bones, clips: initial.clips, jumpAnimation: initial.jumpAnimation },
    city: { pedestrians: initial.pedestrians, pedestrianAssets: initial.pedestrianAssets, vehicles: initial.vehicles },
    collision,
    gameplay: { playerMoved: true, walk: walking.active, run: running.active, jumpPeak: jumping.jumpPeak, jumpFrames: jumping.jumpFrames, vehicleMoved: true, vehicleEnteredAndExited: true },
    settings: { dayNightToggled: true, qualityChanged: true, pauseResume: true },
    browserErrors: errors.length,
    failedResponses
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
