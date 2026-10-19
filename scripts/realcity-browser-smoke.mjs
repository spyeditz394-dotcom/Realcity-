import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const host = 'http://127.0.0.1:4173';
const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CI: '1' }
});
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += chunk.toString(); });
server.stderr.on('data', chunk => { serverOutput += chunk.toString(); });

let browser;
try {
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(host);
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('Vite preview did not become ready within 30 seconds.\n' + serverOutput);

  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const pageErrors = [];
  const failedLocalRequests = [];
  const modelResponses = [];
  const assetRuntimeLogs = [];
  const consoleErrors = [];
  page.on('console', message => {
    const text = message.text();
    if (text.includes('REALCITY character asset validated') || text.includes('REALCITY imported vehicle models applied')) assetRuntimeLogs.push(text);
    if (message.type() === 'error') consoleErrors.push(text);
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => {
    if (request.url().startsWith(host) && /\.glb(?:$|\?)/i.test(request.url())) {
      failedLocalRequests.push({ url: request.url(), error: request.failure()?.errorText });
    }
  });
  page.on('response', response => {
    if (/\/models\/.*\.glb(?:$|\?)/i.test(response.url())) {
      modelResponses.push({ url: response.url(), status: response.status(), contentLength: response.headers()['content-length'] ?? null });
    }
  });

  await page.goto(host, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('#game canvas', { timeout: 20_000 });
  await page.waitForFunction(() => {
    const status = document.querySelector('#characterStatus')?.textContent ?? '';
    return status.includes('3D MODEL: LOADED') || status.includes('3D MODEL: BUILT-IN');
  }, { timeout: 25_000 });
  await page.waitForTimeout(8000);

  const result = await page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    const status = document.querySelector('#characterStatus')?.textContent ?? 'missing';
    const perf = performance.getEntriesByType('resource')
      .filter(entry => /\/models\/.*\.glb(?:$|\?)/i.test(entry.name))
      .map(entry => ({ url: entry.name, durationMs: Math.round(entry.duration), transferSize: entry.transferSize || null, encodedBodySize: entry.encodedBodySize || null }));
    return {
      title: document.title,
      canvas: canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null,
      characterStatus: status,
      localModelResources: perf,
      startupFailureText: document.body.innerText.includes('Startup failed')
    };
  });

  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/realcity-mobile-smoke.png', fullPage: false });
  const perfSamples = [];
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(500);
    const text = await page.locator('#perf').innerText().catch(() => '');
    const match = text.match(/FPS\s+(\d+).*?JS\s+([\d.]+)\/([\d.]+)ms.*?DC\s+(\d+).*?TRI\s+(\d+).*?GEO\s+(\d+).*?TEX\s+(\d+)/);
    if (match) perfSamples.push({ fps: Number(match[1]), jsMsAvg: Number(match[2]), jsMsPeak: Number(match[3]), drawCalls: Number(match[4]), triangles: Number(match[5]), geometries: Number(match[6]), textures: Number(match[7]) });
  }
  const sortedFps = perfSamples.map(sample => sample.fps).sort((a, b) => a - b);
  const percentile = (values, p) => values.length ? values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)] : null;
  const performanceSummary = {
    durationMs: 8000,
    sampleCount: perfSamples.length,
    fpsSamples: perfSamples.map(sample => sample.fps),
    medianFps: sortedFps.length ? sortedFps[Math.floor(sortedFps.length / 2)] : null,
    p95FrameTimeMsApprox: percentile(sortedFps.map(fps => 1000 / Math.max(1, fps)).sort((a, b) => a - b), 0.95),
    drawCalls: perfSamples.length ? Math.round(perfSamples.reduce((sum, sample) => sum + sample.drawCalls, 0) / perfSamples.length) : null,
    triangles: perfSamples.length ? Math.round(perfSamples.reduce((sum, sample) => sum + sample.triangles, 0) / perfSamples.length) : null,
    geometries: perfSamples.length ? Math.max(...perfSamples.map(sample => sample.geometries)) : null,
    textures: perfSamples.length ? Math.max(...perfSamples.map(sample => sample.textures)) : null,
    jsMsAvg: perfSamples.length ? Math.round(perfSamples.reduce((sum, sample) => sum + sample.jsMsAvg, 0) / perfSamples.length * 10) / 10 : null,
    jsMsPeak: perfSamples.length ? Math.max(...perfSamples.map(sample => sample.jsMsPeak)) : null,
    limitations: 'Headless Chromium + SwiftShader emulation, not physical-device FPS; p95 frame time is estimated from sampled HUD FPS.'
  };

  const controls = {};
  await page.locator('#timeBtn').click();
  controls.dayNightButtonPresent = await page.locator('#timeBtn').count() === 1;
  await page.locator('#qualityBtn').click();
  controls.qualityButtonPresent = await page.locator('#qualityBtn').count() === 1;
  await page.locator('#pauseBtn').click();
  controls.pauseOpened = await page.locator('#pauseMenu').evaluate(el => el.classList.contains('open'));
  await page.locator('#resumeBtn').click();
  controls.resumeClosedPauseMenu = !(await page.locator('#pauseMenu').evaluate(el => el.classList.contains('open')));
  controls.touchControlsPresent = await page.locator('#jump').count() === 1 && await page.locator('#sprint').count() === 1 && await page.locator('#interact').count() === 1;

  // Gameplay regression: approach the known parked sedan, enter, accelerate, stop and exit.
  await page.keyboard.down('w');
  await page.keyboard.down('d');
  await page.waitForTimeout(1100);
  await page.keyboard.up('w');
  await page.keyboard.up('d');
  await page.waitForTimeout(700);
  controls.interactLabelAfterApproach = (await page.locator('#interact').innerText()).trim();
  if (controls.interactLabelAfterApproach === 'ENTER VEHICLE') {
    await page.locator('#interact').click();
    await page.waitForTimeout(350);
    controls.enteredVehicle = (await page.locator('#interact').innerText()).trim() === 'EXIT VEHICLE'
      && await page.locator('#drivepad').evaluate(el => el.classList.contains('visible'));
    await page.keyboard.down('w');
    await page.waitForTimeout(1100);
    await page.keyboard.up('w');
    controls.drivingStateObserved = (await page.locator('#state').innerText()).includes('Driving');
    await page.keyboard.down('s');
    await page.waitForTimeout(1200);
    await page.keyboard.up('s');
    await page.waitForTimeout(1800);
    await page.locator('#interact').click();
    await page.waitForTimeout(350);
    controls.exitedVehicle = (await page.locator('#interact').innerText()).trim() !== 'EXIT VEHICLE'
      && !(await page.locator('#drivepad').evaluate(el => el.classList.contains('visible')));
  } else {
    controls.enteredVehicle = false;
    controls.drivingStateObserved = false;
    controls.exitedVehicle = false;
  }

  const report = { status: 'PASS', environment: 'GitHub Actions Ubuntu + headless Chromium + SwiftShader', viewport: '390x844 CSS px, DPR 1', smokeDurationMs: 8000, result, performanceSummary, perfSamples, controls, modelResponses, assetRuntimeLogs, consoleErrors, pageErrors, failedLocalRequests };
  console.log(JSON.stringify(report, null, 2));

  if (!controls.pauseOpened || !controls.resumeClosedPauseMenu || !controls.touchControlsPresent) throw new Error('Pause/resume or touch-control smoke check failed: ' + JSON.stringify(controls));
  if (!controls.enteredVehicle || !controls.drivingStateObserved || !controls.exitedVehicle) throw new Error('Vehicle enter/drive/exit regression failed: ' + JSON.stringify(controls));
  if (!result.canvas || result.startupFailureText) throw new Error('Canvas missing or startup failure displayed');
  if (result.characterStatus !== '3D MODEL: LOADED') throw new Error('Imported character did not load; observed ' + result.characterStatus);
  if (!modelResponses.some(item => item.url.includes('realcity-protagonist-upgraded.glb') && item.status === 200)) throw new Error('Local protagonist GLB was not requested successfully');
  if (!modelResponses.some(item => item.url.includes('realcity-sedan-cc0.glb') && item.status === 200)) throw new Error('Local sedan GLB was not requested successfully');
  if (!assetRuntimeLogs.some(line => line.includes('REALCITY imported vehicle models applied') && /\"vehiclesUpdated\":\s*[1-9]/.test(line))) throw new Error('Local sedan GLB downloaded but was not applied to any gameplay vehicle');
  if (pageErrors.length) throw new Error('Browser page errors: ' + pageErrors.join(' | '));
  if (consoleErrors.some(line => /REALCITY imported character failed|REALCITY bundled sedan unavailable|GLTFLoader|WebGLRenderer.*ERROR/i.test(line))) throw new Error('Critical browser console errors: ' + consoleErrors.join(' | '));
  if (failedLocalRequests.length) throw new Error('Failed local model requests: ' + JSON.stringify(failedLocalRequests));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
