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
  const fps = await page.evaluate(async () => {
    let frames = 0;
    const start = performance.now();
    return await new Promise(resolve => {
      function tick(now) {
        frames++;
        if (now - start >= 8000) resolve({ frames, durationMs: Math.round(now - start), averageFps: Math.round(frames * 1000 / (now - start) * 10) / 10 });
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  });

  const report = { status: 'PASS', environment: 'GitHub Actions Ubuntu + headless Chromium + SwiftShader', viewport: '390x844 CSS px, DPR 1', smokeDurationMs: 8000, result, fps, modelResponses, pageErrors, failedLocalRequests };
  console.log(JSON.stringify(report, null, 2));

  if (!result.canvas || result.startupFailureText) throw new Error('Canvas missing or startup failure displayed');
  if (result.characterStatus !== '3D MODEL: LOADED') throw new Error('Imported character did not load; observed ' + result.characterStatus);
  if (!modelResponses.some(item => item.url.includes('realcity-protagonist-upgraded.glb') && item.status === 200)) throw new Error('Local protagonist GLB was not requested successfully');
  if (!modelResponses.some(item => item.url.includes('realcity-sedan-cc0.glb') && item.status === 200)) throw new Error('Local sedan GLB was not requested successfully');
  if (pageErrors.length) throw new Error('Browser page errors: ' + pageErrors.join(' | '));
  if (failedLocalRequests.length) throw new Error('Failed local model requests: ' + JSON.stringify(failedLocalRequests));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
