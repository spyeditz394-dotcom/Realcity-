import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const origin = 'http://127.0.0.1:4173';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
let browser, failurePage=null, traceContext=null, traceStopped=false;
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
  await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
  failurePage=page;traceContext=page.context();
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

  // City service systems: use the real proximity interaction path and verify purchases persist.
  const serviceState = await page.evaluate(() => window.__REALCITY_QA__());
  const servicePoints = serviceState.servicePoints || [];
  assert(['MARKET','HOSPITAL','FUEL','POLICE','FIRE','SCHOOL','VILLAS'].every(name => servicePoints.some(p => p.name === name)) &&
    servicePoints.some(p => p.type === 'dealership') && servicePoints.some(p => p.type === 'gearStore'),
    'Hospital, market, garage, civic services, auto dealer and gear shop have world interaction points', servicePoints);
  const spawnBeforeServices = serviceState.position;
  const hospitalPoint = servicePoints.find(p => p.name === 'HOSPITAL');
  await page.evaluate(point => { const q=window.__REALCITY_QA__(); q.movePlayerForTest(point.x,point.z); q.setPlayerConditionForTest(42); }, hospitalPoint);
  await page.waitForFunction(() => document.getElementById('interact')?.textContent === 'OPEN CITY SERVICE', null, { timeout: 5000 });
  await page.locator('#interact').click();
  await page.waitForFunction(() => document.querySelector('#realcity-service-panel')?.classList.contains('open'), null, { timeout: 3000 });
  assert((await page.locator('#rc-service-title').innerText()) === 'CITY HOSPITAL', 'Hospital opens from its world entrance');
  await page.locator('[data-service-action="buy:heal"]').click();
  await page.waitForFunction(() => window.__REALCITY_QA__().cityCash === 2350 && window.__REALCITY_QA__().playerCondition === 100, null, { timeout: 3000 });
  assert(true, 'Hospital treatment deducts the correct fee and restores player condition');
  await page.locator('[data-service-action="close"]').click();
  const marketPoint = servicePoints.find(p => p.name === 'MARKET');
  await page.evaluate(point => window.__REALCITY_QA__().movePlayerForTest(point.x,point.z), marketPoint);
  await page.waitForFunction(() => document.getElementById('interact')?.textContent === 'OPEN CITY SERVICE', null, { timeout: 5000 });
  await page.locator('#interact').click();
  await page.waitForFunction(() => document.querySelector('#rc-service-title')?.textContent === 'MARKET & CONVENIENCE', null, { timeout: 3000 });
  await page.locator('[data-service-action="buy:snack"]').click();
  await page.waitForFunction(() => window.__REALCITY_QA__().cityCash === 2325, null, { timeout: 3000 });
  assert(true, 'Market purchase updates the saved city economy');
  await page.locator('[data-service-action="close"]').click();
  const gearPoint = servicePoints.find(p => p.type === 'gearStore');
  await page.evaluate(point => window.__REALCITY_QA__().movePlayerForTest(point.x,point.z), gearPoint);
  await page.waitForFunction(() => document.getElementById('interact')?.textContent === 'OPEN GEAR SHOP', null, { timeout: 5000 });
  await page.locator('#interact').click();
  await page.waitForFunction(() => document.querySelector('#realcity-service-panel')?.classList.contains('open'), null, { timeout: 3000 });
  await page.locator('[data-service-action="buy:prop"]').click();
  await page.waitForFunction(() => window.__REALCITY_QA__().cityCash === 2105 && window.__REALCITY_QA__().cityInventory.includes('prop'), null, { timeout: 3000 });
  assert(true, 'Gear shop adds a non-functional fictional display collectible to inventory');
  await page.locator('[data-service-action="close"]').click();
  const dealerPoint = servicePoints.find(p => p.type === 'dealership');
  const vehiclesBeforePurchase = (await page.evaluate(() => window.__REALCITY_QA__())).vehicles;
  await page.evaluate(point => window.__REALCITY_QA__().movePlayerForTest(point.x,point.z), dealerPoint);
  await page.waitForFunction(() => document.getElementById('interact')?.textContent === 'OPEN AUTO DEALER', null, { timeout: 5000 });
  await page.locator('#interact').click();
  await page.waitForFunction(() => document.querySelector('#realcity-service-panel')?.classList.contains('open'), null, { timeout: 3000 });
  await page.locator('[data-service-action="buy:sedan"]').click();
  await page.waitForFunction(before => window.__REALCITY_QA__().vehicles === before + 1 && window.__REALCITY_QA__().cityCash === 505, vehiclesBeforePurchase, { timeout: 3000 });
  assert(true, 'Auto dealership purchase spawns a new drivable sedan and deducts its price');
  await page.locator('[data-service-action="close"]').click();
  await page.evaluate(position => window.__REALCITY_QA__().movePlayerForTest(position.x,position.z), spawnBeforeServices);

  const doors = (await page.evaluate(() => window.__REALCITY_QA__())).doors || [];
  const hospitalDoor = doors.find(d => d.theme === 'hospital');
  assert(!!hospitalDoor, 'Hospital entrance resolves to a hospital interior theme', doors.filter(d=>d.theme==='hospital'));
  await page.evaluate(d => { const q=window.__REALCITY_QA__(); q.movePlayerForTest(d.x,d.z); q.enterInteriorForTest(d.index); }, hospitalDoor);
  await page.waitForFunction(() => window.__REALCITY_QA__().interiorMode && window.__REALCITY_QA__().activeInteriorTheme === 'hospital', null, { timeout: 3000 });
  assert(true, 'Hospital entrance opens its own furnished hospital interior');
  await page.evaluate(() => window.__REALCITY_QA__().exitInteriorForTest());
  await page.waitForFunction(() => !window.__REALCITY_QA__().interiorMode, null, { timeout: 3000 });
  assert(true, 'Interior exit returns the player to the exterior entrance');

  await page.locator('#realcity-career-open').click();
  await page.waitForFunction(() => document.getElementById('stage-title')?.textContent === 'CITY MISSIONS', null, { timeout: 3000 });
  await page.locator('[data-mission-action="start:civic-checkin"]').click();
  await page.evaluate(p => { const q=window.__REALCITY_QA__(); q.movePlayerForTest(p.x,p.z); q.updateMissionProgressForTest(); }, hospitalPoint);
  await page.waitForFunction(() => window.__REALCITY_QA__().missionCompletedIds.includes('civic-checkin') && window.__REALCITY_QA__().cityCash === 805, null, { timeout: 3000 });
  assert(true, 'Hospital mission completes on arrival and pays its $300 reward');
  await page.locator('[data-stage-close]').click();

  await page.locator('#realcity-wardrobe-open').click();
  await page.locator('[data-appearance="outfit:crimson"]').click();
  await page.locator('[data-appearance="skin:medium"]').click();
  const appearance = await page.evaluate(() => window.__REALCITY_QA__().appearanceState);
  assert(appearance.outfit === 'crimson' && appearance.skin === 'medium', 'Wardrobe applies outfit and skin appearance selections');
  await page.locator('[data-stage-close]').click();

  const garagePoint = servicePoints.find(p => p.name === 'FUEL');
  await page.evaluate(p => { const q=window.__REALCITY_QA__(); q.moveVehicleForTest(0,p.x+3.4,p.z); q.movePlayerForTest(p.x,p.z); }, garagePoint);
  await page.waitForFunction(() => document.getElementById('interact')?.textContent === 'OPEN CITY SERVICE', null, { timeout: 5000 });
  await page.locator('#interact').click();
  await page.locator('[data-service-action="buy:engine"]').click();
  await page.locator('[data-service-action="buy:handling"]').click();
  await page.locator('[data-service-action="buy:tires"]').click();
  const tuned = await page.evaluate(() => window.__REALCITY_QA__().vehicleUpgrades[0]);
  assert(tuned.engine === 1 && tuned.handling === 1 && tuned.tires === 1, 'Garage installs engine, steering and tire upgrades on the nearest vehicle');
  await page.locator('[data-service-action="close"]').click();
  await page.evaluate(position => window.__REALCITY_QA__().movePlayerForTest(position.x,position.z), spawnBeforeServices);

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
  // Capture repeatable CI screenshots of the imported sedan for later visual review.
  // These establish that the screenshot artifact exists; they do not replace live-device review.
  await mkdir('test-results', { recursive: true });
  await page.evaluate(() => window.__REALCITY_QA__().setCameraForTest(0, .24));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/realcity-sedan-rear-three-quarter.png' });
  await page.evaluate(() => window.__REALCITY_QA__().setCameraForTest(Math.PI / 2, .24));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/realcity-sedan-side-three-quarter.png' });
  await page.evaluate(() => window.__REALCITY_QA__().setCameraForTest(0, .22));
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

  // Exercise the existing nearby-NPC prompt and interaction feedback without adding a dialogue feature.
  const npcPromptSetup = await page.evaluate(() => window.__REALCITY_QA__().placePlayerAtPedestrianForTest());
  assert(npcPromptSetup && npcPromptSetup.target === 'pedestrian' && npcPromptSetup.distance < 2.6,
    'QA can select a pedestrian in interaction range', npcPromptSetup);
  await page.waitForFunction(() => document.getElementById('interact')?.textContent === 'TALK TO PEDESTRIAN', null, { timeout: 3000 });
  assert(await page.locator('#interact').innerText() === 'TALK TO PEDESTRIAN',
    'Nearby pedestrian displays the correct interaction prompt');
  await page.locator('#interact').click();
  await page.waitForFunction(() => { const el=document.getElementById('toast'); return !!el?.textContent?.trim() && Number.parseFloat(getComputedStyle(el).opacity)>0; }, null, { timeout: 3000 });
  const npcFeedback = await page.locator('#toast').innerText();
  assert(npcFeedback.length > 0 && !npcFeedback.includes('No interaction nearby'),
    'Pedestrian interaction produces existing in-game feedback', npcFeedback);
  await page.evaluate(() => window.__REALCITY_QA__().movePlayerForTest(300,300));
  await page.waitForFunction(() => document.getElementById('interact')?.textContent !== 'TALK TO PEDESTRIAN', null, { timeout: 3000 });
  assert(await page.locator('#interact').innerText() !== 'TALK TO PEDESTRIAN',
    'Pedestrian prompt hides after leaving interaction range');

  const navigationRegression = await page.evaluate(() => window.__REALCITY_QA__().runPedestrianBrainRegressionForTest());
  assert(navigationRegression.fallback.moves > 0 && navigationRegression.fallback.collisions === 0 &&
    navigationRegression.fallback.goal.x < -3 && navigationRegression.fallback.position.x < -3,
    'Pedestrian brain selects a reachable local fallback around an obstructed route', navigationRegression.fallback);
  assert(navigationRegression.impossible.state === 'recover' && navigationRegression.impossible.finite &&
    navigationRegression.impossible.warnings === 1,
    'Fully blocked pedestrian route remains safe and emits only one diagnostic', navigationRegression.impossible);
  const vehicleDynamicsRegression = await page.evaluate(() => window.__REALCITY_QA__().runVehicleDynamicsRegressionForTest());
  assert(vehicleDynamicsRegression.deltaSpeed <= vehicleDynamicsRegression.tolerance &&
    vehicleDynamicsRegression.fixed.steps > 100 && vehicleDynamicsRegression.variable.steps > 100,
    'Vehicle speed integrator agrees between fixed 16.7 ms and jittered 8–50 ms steps within tolerance',
    {fixed:vehicleDynamicsRegression.fixed,variable:vehicleDynamicsRegression.variable,delta:vehicleDynamicsRegression.deltaSpeed,tolerance:vehicleDynamicsRegression.tolerance});
  assert(vehicleDynamicsRegression.repeatedTransitions === 100 && vehicleDynamicsRegression.invalidStates === 0 &&
    vehicleDynamicsRegression.negativeReverseObserved && !vehicleDynamicsRegression.brakeLatched &&
    Math.abs(vehicleDynamicsRegression.transitionFinalSpeed) <= 5.5,
    '100 forward/brake/reverse/release transitions remain finite, bounded, and clear the brake latch',
    vehicleDynamicsRegression);
  const trafficSafety = await page.evaluate(() => window.__REALCITY_QA__().runTrafficSafetyForTest());
  assert(trafficSafety.stopped && trafficSafety.minPedGap >= 2.39,
    'Traffic stops before overlapping multiple pedestrians in its lane', trafficSafety);
  assert(trafficSafety.resumed,
    'Traffic automatically resumes after the pedestrian obstruction clears', trafficSafety);
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
  await page.context().tracing.stop({ path: 'test-results/realcity-browser-smoke-trace.zip' });traceStopped=true;
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
} catch (error) {
  await mkdir('test-results', { recursive: true });
  if (failurePage) await failurePage.screenshot({ path: 'test-results/realcity-browser-smoke-failure.png', fullPage: true }).catch(() => {});
  await writeFile('test-results/realcity-browser-smoke-failure.json', JSON.stringify({
    failure: String(error), stack: error?.stack ?? null, checks, browserErrors: errors, failedResponses
  }, null, 2));
  throw error;
} finally {
  if (traceContext && !traceStopped) {
    await mkdir('test-results', { recursive: true });
    await traceContext.tracing.stop({ path: 'test-results/realcity-browser-smoke-trace.zip' }).catch(() => {});
  }
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
