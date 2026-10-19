import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const origin = 'http://127.0.0.1:4174';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { stdio: 'ignore' });
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
    const errors = [];
    const failedResponses = [];
    const checks = [];
    page.on('pageerror', e => errors.push(e.stack || e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) failedResponses.push({ status: r.status(), url: r.url() }); });
    await page.goto(origin + '/?qa=1', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => typeof window.__REALCITY_QA__ === 'function' && window.__REALCITY_QA__().canvas && window.__REALCITY_QA__().rigged, null, { timeout: 25000 });
    const startupQuality = await page.locator('#qualityText').textContent();
    if (profile.mobile) assert(startupQuality === 'BALANCED', 'Mobile-safe BALANCED startup preset', startupQuality);
    checks.push('startup and bundled character asset ready');
    await page.evaluate(q => {
      const key = 'realcity-settings'; let saved = {};
      try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
      localStorage.setItem(key, JSON.stringify({ ...saved, quality: q, version: 4 }));
    }, profile.quality);
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => typeof window.__REALCITY_QA__ === 'function' && window.__REALCITY_QA__().canvas && window.__REALCITY_QA__().rigged, null, { timeout: 25000 });

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
    for (const [id, box] of Object.entries(layout.controls)) {
      if (!box || (id === 'gasBtn' || id === 'brakeBtn')) continue;
      assert(box.x >= -1 && box.y >= -1 && box.right <= profile.viewport.width + 1 && box.bottom <= profile.viewport.height + 1,
        'Control remains within viewport: ' + id, box);
    }
    checks.push('mobile HUD fits viewport with controls inside safe screen bounds');

    const beforePeds = await page.evaluate(() => window.__REALCITY_QA__().pedestrianPositions);
    await wait(2400);
    const afterPeds = await page.evaluate(() => window.__REALCITY_QA__().pedestrianPositions);
    const movedPeds = beforePeds.filter((p,i) => afterPeds[i] && distance(p, afterPeds[i]) > 0.05).length;
    assert(movedPeds >= 3, 'Pedestrian population moves over time', { movedPedestrians:movedPeds, total:afterPeds.length });
    checks.push('pedestrians move across a timed observation window');

    // Hold the real on-screen movement pad, then release it and ensure movement stops.
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
    await wait(3200);
    const sustained = await page.evaluate(() => window.__REALCITY_QA__());
    await page.mouse.up();
    await page.keyboard.down('s');
    await wait(2200);
    await page.keyboard.up('s');
    const braked = await page.evaluate(() => window.__REALCITY_QA__());
    assert(sustained.inCar && sustained.vehiclePosition && distance(carStart,sustained.vehiclePosition) > 1,
      'Sustained throttle moves vehicle over several seconds', {carStart,carEnd:sustained.vehiclePosition,speed:sustained.vehicleSpeed});
    assert(braked.inCar && Number.isFinite(braked.vehicleSpeed) && Number.isFinite(braked.vehiclePosition.x) && Number.isFinite(braked.vehiclePosition.z),
      'Vehicle remains in a valid state after sustained throttle and braking', {speed:braked.vehicleSpeed,position:braked.vehiclePosition});
    await page.keyboard.press('e');
    await page.waitForFunction(() => !window.__REALCITY_QA__().inCar, null, { timeout:5000 });
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
          if (now - start < 5000) requestAnimationFrame(tick); else resolve();
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
    assert(measurement.canvas && measurement.renderer && measurement.frameMs.samples >= 30, 'Renderer and frame-time sampling available', measurement);
    if (profile.mobile) assert(measurement.rendererStats.pixelRatio <= 1.001, 'Mobile-safe rendering caps drawing resolution at native viewport scale', measurement.rendererStats);
    assert(errors.length === 0, 'No JavaScript/console errors in profile', errors);
    assert(failedResponses.length === 0, 'No HTTP error responses in profile', failedResponses);
    checks.push('WebGL renderer, frame pacing and browser network health measured');
    if (profile.mobile) {
      await mkdir('test-results', {recursive:true});
      await page.screenshot({path:'test-results/realcity-mobile-'+profile.name+'.png',fullPage:true});
    }
    results.push({profile,startupQuality,layout,movedPedestrians:movedPeds,checks, ...measurement,browserErrors:errors,failedResponses});
    await context.close();
  }
  await mkdir('test-results', {recursive:true});
  const report = {generatedAt:new Date().toISOString(),note:'Chromium desktop with mobile viewport/touch emulation only. Not a physical Android/OPPO A5 Pro measurement; no device thermals or total/GPU memory are available.',results};
  await writeFile('test-results/realcity-mobile-performance.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
