import { chromium, devices } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const origin = 'http://127.0.0.1:4174';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { const response = await fetch(origin); if (response.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Vite preview did not become ready');
  browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const results = [];
  for (const profile of [
    { name: 'mobile-low-emulated', viewport: { width: 360, height: 800 }, deviceScaleFactor: 1, quality: 0 },
    { name: 'mobile-medium-emulated', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, quality: 1 },
    { name: 'desktop-reference', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, quality: 2 }
  ]) {
    const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor, isMobile: profile.name.startsWith('mobile'), hasTouch: profile.name.startsWith('mobile') });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin + '/?qa=1', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => typeof window.__REALCITY_QA__ === 'function' && window.__REALCITY_QA__().canvas, null, { timeout: 20000 });
    const startupQuality = await page.locator('#qualityText').textContent();
    if (profile.name.startsWith('mobile') && startupQuality !== 'BALANCED') throw new Error(`Expected mobile-safe BALANCED startup, got ${startupQuality}`);
    // Apply the selected quality through the same persisted settings contract used by the game.
    await page.evaluate(q => {
      const key = 'realcity-settings';
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
      localStorage.setItem(key, JSON.stringify({ ...saved, quality: q, version: 4 }));
    }, profile.quality);
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => typeof window.__REALCITY_QA__ === 'function' && window.__REALCITY_QA__().canvas, null, { timeout: 20000 });
    const measurement = await page.evaluate(async () => {
      const q = window.__REALCITY_QA__();
      const canvas = document.querySelector('#game canvas');
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      const before = performance.memory ? performance.memory.usedJSHeapSize : null;
      const samples = [];
      await new Promise(resolve => {
        let start = 0, last = 0, frames = 0;
        const tick = now => {
          if (!start) start = now;
          if (last) samples.push(now - last);
          last = now; frames++;
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
        canvas: canvas ? { cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight, backingWidth: canvas.width, backingHeight: canvas.height, pixelRatioX: canvas.width / Math.max(1, canvas.clientWidth), pixelRatioY: canvas.height / Math.max(1, canvas.clientHeight) } : null,
        renderer, scene: { pedestrians: q.pedestrians, vehicles: q.vehicles, buildings: q.buildingCount ?? null },
        fps: samples.length ? Number((1000 / (samples.reduce((a,b) => a+b, 0) / samples.length)).toFixed(1)) : null,
        frameMs: { median: percentile(.5) === null ? null : Number(percentile(.5).toFixed(2)), p95: percentile(.95) === null ? null : Number(percentile(.95).toFixed(2)), samples: samples.length },
        jsHeapBytesBefore: before,
        jsHeapBytesAfter: performance.memory ? performance.memory.usedJSHeapSize : null,
        memoryApi: performance.memory ? 'Chromium performance.memory (approximate JS heap only)' : 'unavailable; browser does not expose reliable total/GPU memory',
        userAgent: navigator.userAgent
      };
    });
    results.push({ profile, startupQuality, ...measurement, browserErrors: errors });
    await context.close();
  }
  await mkdir('test-results', { recursive: true });
  const report = { generatedAt: new Date().toISOString(), note: 'Desktop Chromium device emulation only. These measurements are NOT physical Android performance results and do not report total/GPU memory or thermal behavior.', results };
  await writeFile('test-results/realcity-mobile-performance.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (results.some(r => r.browserErrors.length || !r.canvas || !r.renderer)) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
