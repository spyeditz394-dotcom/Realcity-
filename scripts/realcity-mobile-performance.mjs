import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

// Allocate a per-run port so an orphaned preview cannot satisfy readiness checks.
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const address = probe.address(); if (!address || typeof address === 'string') return reject(new Error('Could not allocate a local preview port')); probe.close(error => error ? reject(error) : resolve(address.port)); });
});
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const assert = (ok, message, details) => {
  if (!ok) throw new Error(message + (details === undefined ? '' : ': ' + JSON.stringify(details)));
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { const response = await fetch(origin); if (response.ok) { ready = true; break; } } catch {}
    await wait(500);
  }
  if (!ready) throw new Error('Vite preview did not become ready');
  browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const results = [];
  for (const profile of [
    { name: 'mobile-low-emulated', viewport: { width: 360, height: 800 }, deviceScaleFactor: 1, quality: 0, mobile: true },
    { name: 'mobile-medium-emulated', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, quality: 1, mobile: true },
    { name: 'desktop-reference', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, quality: 2, mobile: false }
  ]) {
    const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor, isMobile: profile.mobile, hasTouch: profile.mobile });
    const page = await context.newPage();
    // The CI Chromium host can expose only 2–4 logical CPUs. Override capability hints
    // before app startup so the desktop reference actually exercises the desktop path;
    // mobile profiles deliberately emulate a constrained Android-class device.
    await page.addInitScript(({ mobile }) => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => mobile ? 4 : 8 });
      Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => mobile ? 4 : 8 });
    }, { mobile: profile.mobile });
    const errors = [];
    const failedRequests = [];
    const failedResponses = [];
    const checks = [];
    page.on('pageerror', e => errors.push(e.stack || e.message));
    page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown' }));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) failedResponses.push({ status: r.status(), url: r.url() }); });
    await page.goto(origin + '/?qa=1', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => typeof window.__REALCITY_QA__ === 'function' && window.__REALCITY_QA__().canvas && window.__REALCITY_QA__().rigged, null, { timeout: 25000 });
    const startupQuality = await page.locator('#qualityText').textContent();
    if (profile.mobile) assert(startupQuality === 'BALANCED', 'Mobile-safe BALANCED startup preset', startupQuality);
    checks.push('startup and bundled character asset ready');
    const selectedQuality = await page.evaluate(q => window.__REALCITY_QA__().setQualityForTest(q), profile.quality);
    assert(selectedQuality === profile.quality, 'Requested graphics preset actually applied to renderer', { requested: profile.quality, selectedQuality });
    const qualityMatrix = await page.evaluate(requested => {
      const qa = window.__REALCITY_QA__();
      const records = [];
      for (const quality of [0,1,2,3]) {
        qa.setQualityForTest(quality);
        const stats = qa.rendererStats();
        records.push({quality:stats.quality,pixelRatio:stats.pixelRatio,mobileSafeDefault:stats.mobileSafeDefault,shadows:stats.shadows});
      }
      qa.setQualityForTest(requested);
      return records;
    }, profile.quality);
    assert(qualityMatrix.length === 4 && qualityMatrix.every((v,i) => v.quality === i && Number.isFinite(v.pixelRatio) && v.pixelRatio > 0 && v.pixelRatio <= ((v.mobileSafeDefault ? [1.0,1.1,1.25,1.5] : [1.0,1.25,1.5,2.0])[i] + .01)), 'LOW/BALANCED/HIGH/ULTRA remain within their resolution caps when switched live', qualityMatrix);
    assert(qualityMatrix.every((v,i) => v.shadows.enabled === (i>=1 && (!v.mobileSafeDefault || i>=2))), 'Quality switching applies the expected balanced/high/ultra shadow policy', qualityMatrix.map(v=>({quality:v.quality,mobileSafeDefault:v.mobileSafeDefault,shadows:v.shadows})));
    assert(qualityMatrix[2].shadows.qualityMapSize <= 768 && qualityMatrix[3].shadows.qualityMapSize <= 1536, 'High/Ultra shadow maps remain bounded', qualityMatrix.map(v=>({quality:v.quality,shadows:v.shadows})));
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => typeof window.__REALCITY_QA__ === 'function' && window.__REALCITY_QA__().canvas && window.__REALCITY_QA__().rigged, null, { timeout: 25000 });
    const appliedQuality = await page.evaluate(() => window.__REALCITY_QA__().rendererStats().quality);
    assert(appliedQuality === profile.quality, 'Graphics preset persists across reload and matches the selected profile', { requested: profile.quality, appliedQuality });
    checks.push('requested graphics preset applied and persisted across reload');
    checks.push('all four quality presets, pixel-ratio caps and selective shadow modes verified');

    const layout = await page.evaluate(() => {
      const rect = el => { const r = el.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom }; };
      const ids = ['map','pauseBtn','qualityBtn','timeBtn','jump','sprint','interact','serviceBtn','gasBtn','brakeBtn'];
      const controls = Object.fromEntries(ids.map(id => [id, document.getElementById(id) ? rect(document.getElementById(id)) : null]));
      const visible = el => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
      const required = ['map','pauseBtn','qualityBtn','timeBtn','jump','sprint','interact','serviceBtn'];
      const overflow = document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight;
      return { width:innerWidth,height:innerHeight,overflow,controls,missing:required.filter(id=>!visible(document.getElementById(id))),canvas:rect(document.querySelector('#game canvas')) };
    });
    assert(!layout.overflow, 'No page overflow at emulated device viewport', layout);
    assert(layout.missing.length === 0, 'Core HUD/touch controls visible at viewport', layout.missing);
    if (profile.mobile) {
      await page.setViewportSize({width:profile.viewport.height,height:profile.viewport.width});
      await wait(180);
      const rotated = await page.evaluate(() => { const c=document.querySelector('#game canvas');const r=c?.getBoundingClientRect();return {width:innerWidth,height:innerHeight,canvasWidth:r?.width,canvasHeight:r?.height,quality:window.__REALCITY_QA__().rendererStats().quality,overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight}; });
      assert(rotated.width===profile.viewport.height&&rotated.height===profile.viewport.width&&rotated.canvasWidth===rotated.width&&rotated.canvasHeight===rotated.height&&!rotated.overflow&&rotated.quality===profile.quality,'Portrait/landscape resize preserves canvas fit, quality and HUD viewport',rotated);
      await page.setViewportSize(profile.viewport);
      await wait(180);
    }
    for (const [id, box] of Object.entries(layout.controls)) {
      if (!box || (id === 'gasBtn' || id === 'brakeBtn')) continue;
      assert(box.x >= -1 && box.y >= -1 && box.right <= profile.viewport.width + 1 && box.bottom <= profile.viewport.height + 1,
        'Control remains within viewport: ' + id, box);
    }
    checks.push('mobile HUD fits viewport with controls inside safe screen bounds');
    if (profile.mobile) checks.push('orientation/viewport rotation keeps canvas aspect and graphics profile stable');

    const beforePeds = await page.evaluate(() => window.__REALCITY_QA__().pedestrianPositions);
    await wait(2400);
    const afterPeds = await page.evaluate(() => window.__REALCITY_QA__().pedestrianPositions);
    const movedPeds = beforePeds.filter((p,i) => afterPeds[i] && distance(p, afterPeds[i]) > 0.05).length;
    assert(movedPeds >= 3, 'Pedestrian population moves over time', { movedPedestrians:movedPeds, total:afterPeds.length });
    checks.push('pedestrians move across a timed observation window');

    // Hold the real on-screen movement pad, then release it and ensure movement stops.
    await page.evaluate(() => window.__REALCITY_QA__().preparePlayerMovementForTest());
    const start = await page.evaluate(() => window.__REALCITY_QA__().position);
    const up = page.locator('[data-key="w"]');
    const upBox = await up.boundingBox();
    assert(upBox, 'On-screen forward touch control has a hit target');
    await page.mouse.move(upBox.x + upBox.width/2, upBox.y + upBox.height/2);
    await page.mouse.down();
    await wait(950);
    await page.mouse.up();
    const moved = await page.evaluate(() => window.__REALCITY_QA__().position);
    assert(distance(start,moved) > 0.25, 'On-screen forward control moves player', {start,moved});
    checks.push('on-screen movement press/release works');
    await wait(250);

    // Long enough to expose a stuck throttle, frozen vehicle, or unstable motion.
    await page.evaluate(() => window.__REALCITY_QA__().prepareVehicle());
    await page.keyboard.press('e');
    await page.waitForFunction(() => window.__REALCITY_QA__().inCar, null, { timeout:5000 });
    const carStart = await page.evaluate(() => window.__REALCITY_QA__().vehiclePosition);
    const gas = page.locator('#gasBtn');
    const gasBox = await gas.boundingBox();
    assert(gasBox, 'Vehicle accelerator is available after entering car');
    await page.mouse.move(gasBox.x + gasBox.width/2, gasBox.y + gasBox.height/2);
    await page.mouse.down();
    // Wait for observed movement, not a fixed wall-clock delay under SwiftShader RAF.
    await page.waitForFunction(({x,z}) => { const q=window.__REALCITY_QA__(); return q.vehiclePosition && Math.hypot(q.vehiclePosition.x-x,q.vehiclePosition.z-z)>0.2 && Number.isFinite(q.vehicleSpeed) && q.vehicleSpeed>1; }, {x:carStart.x,z:carStart.z}, {timeout:15000}).catch(async error => { const state=await page.evaluate(()=>window.__REALCITY_QA__()); throw new Error('Vehicle failed to move under sustained throttle: '+JSON.stringify({carStart,state,cause:error.message})); });
    const sustained = await page.evaluate(() => window.__REALCITY_QA__());
    await page.mouse.up();
    const brake = page.locator('#brakeBtn');
    const brakeBox = await brake.boundingBox();
    assert(brakeBox, 'Vehicle brake control is available during sustained driving');
    await page.mouse.move(brakeBox.x + brakeBox.width/2, brakeBox.y + brakeBox.height/2);
    await page.mouse.down(); await wait(3000);
    const brakeStartSpeed=await page.evaluate(()=>window.__REALCITY_QA__().vehicleSpeed);
    await page.waitForFunction(()=>Math.abs(window.__REALCITY_QA__().vehicleSpeed)<=1.0,null,{timeout:15000}).catch(async error=>{const state=await page.evaluate(()=>window.__REALCITY_QA__());throw new Error('Vehicle failed to settle under sustained brake input: '+JSON.stringify({brakeStartSpeed,state,cause:error.message}));});
    const brakeHeldState=await page.evaluate(()=>window.__REALCITY_QA__());
    assert(Number.isFinite(brakeHeldState.vehicleSpeed)&&brakeHeldState.vehicleSpeed>=-0.05,'Sustained brake does not transition into reverse',{brakeStartSpeed,speed:brakeHeldState.vehicleSpeed});
    await page.mouse.up(); const braked=await page.evaluate(()=>window.__REALCITY_QA__());
    assert(Number.isFinite(braked.vehicleSpeed)&&Math.abs(braked.vehicleSpeed)<=1.0,'Held brake brings vehicle to a safe exit speed (<= 1 unit/s)',{brakeStartSpeed,speed:braked.vehicleSpeed});
    await page.mouse.move(10,10); // Leave the touch brake control so pointer-leave cannot keep its input latched.
    await wait(200); // Ensure the simulation observes a fully released input and clears the brake latch.
    await page.keyboard.up('s'); // Explicitly release any stale keyboard brake state before the reverse trial.
    await page.bringToFront();
    await page.locator('#game canvas').click({position:{x:20,y:20}}); // Re-establish a real browser input target after pointer controls and focus transitions.
    await wait(200); // Let the simulation observe a released brake before testing intentional reverse.
    await page.keyboard.down('s');
    await page.waitForFunction(()=>window.__REALCITY_QA__().vehicleSpeed < -0.2,null,{timeout:5000}).catch(async error=>{const state=await page.evaluate(()=>window.__REALCITY_QA__());throw new Error('Deliberate reverse from rest did not move backward: '+JSON.stringify({state,cause:error.message}));});
    const reverseState=await page.evaluate(()=>window.__REALCITY_QA__());
    assert(Number.isFinite(reverseState.vehicleSpeed)&&reverseState.vehicleSpeed>=-5.5,'Deliberate reverse remains bounded',{speed:reverseState.vehicleSpeed});
    await page.keyboard.up('s');
    const sustainedDistance = sustained.vehiclePosition ? distance(carStart, sustained.vehiclePosition) : 0;
    assert(sustained.inCar && sustained.vehiclePosition && Number.isFinite(sustainedDistance) && sustainedDistance > 0.2 && Number.isFinite(sustained.vehicleSpeed) && sustained.vehicleSpeed > 1,
      'Sustained throttle moves vehicle over several seconds', {inCar:sustained.inCar,carStart,carEnd:sustained.vehiclePosition,displacement:sustainedDistance,speed:sustained.vehicleSpeed});
    assert(braked.inCar && Number.isFinite(braked.vehicleSpeed) && Number.isFinite(braked.vehiclePosition.x) && Number.isFinite(braked.vehiclePosition.z),
      'Vehicle remains in a valid state after sustained throttle and braking', {speed:braked.vehicleSpeed,position:braked.vehiclePosition});
    await page.keyboard.press('e');
    await page.waitForFunction(() => !window.__REALCITY_QA__().inCar, null, { timeout:10000 });
    checks.push('sustained driving, braking and vehicle exit exercised');

    const measurement = await page.evaluate(async () => {
      const q = window.__REALCITY_QA__();
      const canvas = document.querySelector('#game canvas');
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      const before = performance.memory ? performance.memory.usedJSHeapSize : null;
      const samples = [];
      await new Promise(resolve => {
        let start = 0, last = 0;
        const tick = now => {
          if (!start) start = now;
          if (last) samples.push(now - last);
          last = now;
          if (now - start < 12000) requestAnimationFrame(tick); else resolve();
        };
        requestAnimationFrame(tick);
      });
      samples.sort((a,b) => a-b);
      const percentile = p => samples.length ? samples[Math.min(samples.length - 1, Math.floor(samples.length * p))] : null;
      const renderer = gl ? {
        context: gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl',
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
      } : null;
      return {
        canvas: canvas ? { cssWidth:canvas.clientWidth,cssHeight:canvas.clientHeight,backingWidth:canvas.width,backingHeight:canvas.height,pixelRatioX:canvas.width/Math.max(1,canvas.clientWidth),pixelRatioY:canvas.height/Math.max(1,canvas.clientHeight) } : null,
        renderer, scene:{pedestrians:q.pedestrians,vehicles:q.vehicles,buildings:q.buildingCount??null},
        rendererStats:q.rendererStats(),
        fps:samples.length?Number((1000/(samples.reduce((a,b)=>a+b,0)/samples.length)).toFixed(1)):null,
        frameMs:{median:percentile(.5)===null?null:Number(percentile(.5).toFixed(2)),p95:percentile(.95)===null?null:Number(percentile(.95).toFixed(2)),samples:samples.length},
        jsHeapBytesBefore:before,jsHeapBytesAfter:performance.memory?performance.memory.usedJSHeapSize:null,
        memoryApi:performance.memory?'Chromium performance.memory (approximate JS heap only)':'unavailable; browser does not expose reliable total/GPU memory',
        userAgent:navigator.userAgent
      };
    });
    assert(measurement.canvas && measurement.renderer && measurement.frameMs.samples >= 10, 'Renderer and frame-time sampling available (10+ samples; measured FPS remains reported separately)', measurement);
    const staticBatching = measurement.rendererStats?.staticBatching;
    assert(staticBatching && staticBatching.batchedSourceMeshes >= 300 && staticBatching.batchesCreated > 0 && staticBatching.estimatedDrawCallsSaved >= 200, 'Hundreds of compatible static city boxes are batched while gameplay objects remain separate', staticBatching);
    const spatialIndex = measurement.rendererStats?.spatialIndex;
    assert(spatialIndex?.ready === true && spatialIndex.solidCount >= 500 && spatialIndex.collisionCells > 50 && spatialIndex.cameraBlockerCells > 50, 'Static collision and camera blockers have usable spatial indexes', spatialIndex);
    assert(spatialIndex.collisionQueryCount > 100 && spatialIndex.meanCollisionCandidates < 30, 'Static collision checks examine local candidates rather than scanning the whole city', spatialIndex);
    assert(spatialIndex.cameraRayQueryCount > 20 && spatialIndex.meanCameraRayCandidates < 30, 'Camera occlusion queries inspect a bounded local candidate set', spatialIndex);
    assert(measurement.rendererStats.shadows && typeof measurement.rendererStats.shadows.enabled === 'boolean' && measurement.rendererStats.shadows.qualityMapSize>=256, 'Runtime shadow configuration is present and bounded', measurement.rendererStats.shadows);
    assert(measurement.rendererStats.calls < 180, 'Visible renderer draw-call count stays below Phase 10 budget', measurement.rendererStats);
    const cpuProfile = measurement.rendererStats?.cpuProfile;
    assert(cpuProfile && Number.isFinite(cpuProfile.updateAvgMs) && Number.isFinite(cpuProfile.renderCallAvgMs), 'Update and synchronous renderer-call CPU timing are recorded separately', cpuProfile);
    if (profile.mobile) { assert(measurement.rendererStats.mobileSafeDefault === true, 'Touch viewport selects the mobile-safe renderer path', measurement.rendererStats); assert(measurement.rendererStats.pixelRatio <= 1.001, 'Mobile-safe rendering caps drawing resolution at native viewport scale', measurement.rendererStats); if (measurement.fps < 24) assert(measurement.rendererStats.adaptiveRenderScale < 0.99, 'Adaptive renderer lowers resolution when sustained emulated FPS is below 24', measurement.rendererStats); }
    else { assert(measurement.rendererStats.mobileSafeDefault === false, 'Desktop reference does not accidentally select mobile-safe renderer path', measurement.rendererStats); assert(Math.abs(measurement.rendererStats.pixelRatio - Math.min(profile.deviceScaleFactor, [1.0,1.25,1.5,2.0][profile.quality])) < .02, 'Desktop renderer pixel ratio follows the actual device-pixel ratio under the selected quality cap', measurement.rendererStats); }
    assert(errors.length === 0, 'No JavaScript/console errors in profile', errors);
    assert(failedRequests.length === 0, 'No failed browser requests in profile', failedRequests);
    assert(failedResponses.length === 0, 'No HTTP error responses in profile', failedResponses);
    checks.push('WebGL renderer, frame pacing and browser network health measured');
    checks.push('static road, curb and prop boxes report spatially grouped instancing statistics');
    if (profile.mobile) {
      await mkdir('test-results', {recursive:true});
      await page.screenshot({path:'test-results/realcity-mobile-'+profile.name+'.png',fullPage:true});
    }
    results.push({profile,startupQuality,appliedQuality,layout,movedPedestrians:movedPeds,checks, ...measurement,browserErrors:errors,failedRequests,failedResponses});
    await context.close();
  }
  // Reproducible population matrix: same real Three.js scene/simulation, viewport, DPR,
  // scripted camera movement, warm-up and timed samples for each population and repeat.
  const benchmarkRuns = [];
  const benchmarkViewport = { width: 390, height: 844 };
  const benchmarkDpr = 1;
  const benchmarkSeed = 20261021;
  const percentile = (sorted, p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] : null;
  for (const npcCount of [5, 10, 20, 40]) {
    for (let repeat = 1; repeat <= 3; repeat++) {
      const context = await browser.newContext({ viewport: benchmarkViewport, deviceScaleFactor: benchmarkDpr, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.stack || e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.addInitScript(({ seed }) => {
        // The production game has deterministic seeded generation; preserve the seed in evidence
        // and seed Math.random before app module evaluation for any remaining random consumers.
        let state = seed >>> 0;
        Math.random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
      }, { seed: benchmarkSeed });
      const startedAt = new Date().toISOString();
      await page.goto(origin + '/?qa=1&npcCount=' + npcCount, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForFunction(() => typeof window.__REALCITY_QA__ === 'function' && window.__REALCITY_QA__().rigged, null, { timeout: 25000 });
      const initial = await page.evaluate(() => window.__REALCITY_QA__());
      assert(initial.pedestrians === npcCount, 'Benchmark scenario starts with requested production NPC population', { requested:npcCount, actual:initial.pedestrians });
      const glInfo = await page.evaluate(() => {
        const canvas = document.querySelector('#game canvas');
        const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
        return { renderer:gl ? gl.getParameter(gl.RENDERER) : null, vendor:gl ? gl.getParameter(gl.VENDOR) : null, context:gl ? (gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl') : null };
      });
      await wait(3000); // warm-up is excluded from the measured window
      const measured = await page.evaluate(async () => {
        const q = window.__REALCITY_QA__();
        const canvas = document.querySelector('#game canvas');
        const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
        const frames = [];
        const start = performance.now();
        let previous = 0, pathStep = 0;
        await new Promise(resolve => {
          const tick = now => {
            if (previous) frames.push(now - previous);
            previous = now;
            if (now - start >= 10000) { resolve(); return; }
            // Repeatable camera yaw/pitch path, while leaving the actual game simulation running.
            if (now - start >= pathStep * 1250) {
              q.setCameraForTest((pathStep % 8) * Math.PI / 4, .18 + (pathStep % 3) * .08);
              pathStep++;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        const sorted = [...frames].sort((a,b) => a-b);
        const p = n => sorted.length ? sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*n))] : null;
        return {
          durationMs:performance.now()-start,
          rawFrameTimesMs:frames,
          p50Ms:p(.50),p95Ms:p(.95),p99Ms:p(.99),maxMs:sorted.length?sorted[sorted.length-1]:null,
          averageFps:frames.length ? 1000/(frames.reduce((a,b)=>a+b,0)/frames.length) : null,
          framesOver33_3Ms:frames.filter(v=>v>33.3).length,
          framesOver50Ms:frames.filter(v=>v>50).length,
          frameCount:frames.length,
          finalNpcCount:q.pedestrians,
          buildSha:window.__BUILD_SHA__ || 'unavailable',
          viewport:{width:innerWidth,height:innerHeight},
          dpr:devicePixelRatio
        };
      });
      benchmarkRuns.push({
        label:'CI environment',commitSha:initial.buildSha || (await page.evaluate(()=>window.__BUILD_SHA__||'unavailable')),
        npcCount,seed:benchmarkSeed,repeat,startedAt,warmupMs:3000,measurementTargetMs:10000,
        browserVersion:browser.version(),webgl:glInfo, ...measured, errors
      });
      await context.close();
    }
  }
  const benchmarkSummary = [5,10,20,40].map(npcCount => {
    const runs = benchmarkRuns.filter(r => r.npcCount === npcCount);
    const fps = runs.map(r => r.averageFps).filter(Number.isFinite);
    const p95 = runs.map(r => r.p95Ms).filter(Number.isFinite);
    return {
      label:'CI environment',npcCount,runCount:runs.length,
      averageFpsMean:fps.length?fps.reduce((a,b)=>a+b,0)/fps.length:null,
      averageFpsSpread:fps.length?Math.max(...fps)-Math.min(...fps):null,
      p95MsMean:p95.length?p95.reduce((a,b)=>a+b,0)/p95.length:null,
      p95MsSpread:p95.length?Math.max(...p95)-Math.min(...p95):null,
      errors:runs.reduce((n,r)=>n+r.errors.length,0)
    };
  });
  const benchmarkReport = {
    generatedAt:new Date().toISOString(),label:'CI environment',
    note:'Headless Chromium with SwiftShader and mobile viewport emulation; not OPPO A5 Pro/device performance. Thresholds are not changed or added by this benchmark.',
    browserVersion:browser.version(),viewport:benchmarkViewport,dpr:benchmarkDpr,seed:benchmarkSeed,
    warmupMs:3000,measurementTargetMs:10000,summary:benchmarkSummary,runs:benchmarkRuns
  };
  await mkdir('test-results', {recursive:true});
  await writeFile('test-results/realcity-npc-benchmarks.json',JSON.stringify(benchmarkReport,null,2));
  assert(benchmarkRuns.length === 12 && benchmarkSummary.every(s => s.runCount === 3), '5/10/20/40 NPC benchmark matrix has three real runs per population', benchmarkSummary);
  assert(benchmarkRuns.every(r => r.rawFrameTimesMs.length >= 30 && r.errors.length === 0), 'Every NPC benchmark run has meaningful raw samples and zero browser errors', benchmarkRuns.map(r=>({npcCount:r.npcCount,repeat:r.repeat,frames:r.frameCount,errors:r.errors.length})));
  const report = {generatedAt:new Date().toISOString(),note:'Chromium desktop with mobile viewport/touch emulation only. Not a physical Android/OPPO A5 Pro measurement; no device thermals or total/GPU memory are available.',npcBenchmarks:benchmarkReport,emulatedPerformanceWarnings:results.filter(r=>r.fps<15).map(r=>({profile:r.profile.name,fps:r.fps,message:'Below 15 FPS in SwiftShader emulation. This is a software-renderer warning, not a physical-device benchmark; real-device validation is still required.'})),results};
  await writeFile('test-results/realcity-mobile-performance.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
