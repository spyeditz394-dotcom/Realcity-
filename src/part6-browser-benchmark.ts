// REALCITY Part 6: lightweight browser-side benchmark helper.
// This intentionally does not pretend to measure GPU time or renderer.info counters.
const css = document.createElement('style');
css.textContent = `
#rc6-toggle{position:fixed;z-index:20;right:12px;bottom:12px;padding:9px 11px;border:1px solid #7be3d477;border-radius:10px;background:#102029ee;color:#baf8ed;font:800 10px system-ui;letter-spacing:.05em}
#rc6-panel{position:fixed;z-index:21;right:12px;bottom:54px;width:min(92vw,330px);max-height:55vh;overflow:auto;display:none;padding:12px;border:1px solid #7be3d455;border-radius:12px;background:#09151df2;color:#e7f7fa;font:11px/1.5 ui-monospace,monospace;box-shadow:0 8px 30px #0008}
#rc6-panel.open{display:block}#rc6-panel button{padding:6px 8px;margin:3px;border-radius:6px;border:1px solid #ffffff30;background:#19343b;color:#dffbf6;font:inherit}#rc6-panel .rc6-note{color:#9fbcc4;font-size:10px}
`;
document.head.append(css);
const toggle = document.createElement('button');
toggle.id = 'rc6-toggle'; toggle.type = 'button'; toggle.textContent = 'PART 6 TEST';
const panel = document.createElement('section');
panel.id = 'rc6-panel';
panel.innerHTML = '<b>REALCITY · browser diagnostics</b><div id="rc6-scenario">Scenario: free roam</div><div id="rc6-metrics">Collecting frame samples…</div><div id="rc6-controls"></div><p class="rc6-note">Frame intervals are browser-observed, not GPU timings. This panel does not expose Three.js renderer counters or claim phone results. Use the existing game HUD for DC/TRI/GEO/TEX.</p>';
document.body.append(toggle, panel);
toggle.addEventListener('click', () => panel.classList.toggle('open'));
const scenarioNames = ['Load / idle','Stationary view','Move + rotate','Traffic + pedestrians','Shadow-heavy view','Night view','Vehicle driving','Sustained session'];
const controls = panel.querySelector('#rc6-controls');
const scenario = panel.querySelector('#rc6-scenario');
let currentScenario = scenarioNames[0];
for (const name of scenarioNames) {
  const b = document.createElement('button'); b.type='button'; b.textContent=name;
  b.addEventListener('click', () => { currentScenario=name; scenario.textContent='Scenario: '+name; });
  controls.append(b);
}
const samples=[];
let previous=performance.now(), lastPaint=previous, longTasks=0, totalFrames=0, droppedLike=0;
try {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver(list => { longTasks += list.getEntries().length; });
    observer.observe({entryTypes:['longtask']});
  }
} catch {}
function percentile(sorted, p) {
  return sorted.length ? sorted[Math.min(sorted.length-1, Math.floor((sorted.length-1)*p))] : 0;
}
function tick(now) {
  const delta=now-previous; previous=now;
  if (delta>0 && delta<1000) {
    samples.push(delta); if(delta>33.4) droppedLike++;
    if(samples.length>300) samples.shift();
    totalFrames++;
  }
  if(now-lastPaint>1000) {
    const sorted=[...samples].sort((a,b)=>a-b);
    const avg=samples.length?samples.reduce((a,b)=>a+b,0)/samples.length:0;
    const heap=performance.memory?.usedJSHeapSize;
    const canvas=document.querySelector('#game canvas');
    const gl=canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
    const limits=gl ? 'GL max texture '+gl.getParameter(gl.MAX_TEXTURE_SIZE)+' · viewport '+gl.getParameter(gl.MAX_VIEWPORT_DIMS).join('×') : 'WebGL context not available';
    panel.querySelector('#rc6-metrics').textContent =
      'FPS approx: '+(avg? (1000/avg).toFixed(1):'--')+
      ' · frame ms avg/p50/p95: '+avg.toFixed(1)+' / '+percentile(sorted,.5).toFixed(1)+' / '+percentile(sorted,.95).toFixed(1)+
      '\\nFrames sampled: '+totalFrames+' · intervals >33.4ms: '+droppedLike+
      '\\nLong-task entries: '+longTasks+
      '\\nViewport: '+innerWidth+'×'+innerHeight+' · DPR '+devicePixelRatio+
      (heap?'\\nJS heap: '+(heap/1048576).toFixed(1)+' MiB (Chromium-only estimate)':'\\nJS heap: unavailable in this browser')+
      '\\n'+limits;
    lastPaint=now;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
