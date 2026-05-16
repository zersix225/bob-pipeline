import { instrument } from "@fiberplane/hono-otel";
import { Hono } from "hono";

import api from "./api";
import type { HonoEnv } from "./types";

const app = new Hono<HonoEnv>();

app.get("/", (c) => c.html(DASHBOARD_HTML));

app.route("/api", api);

export default instrument(app);

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BobOps — Self-Healing CI/CD</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0d1117;color:#c9d1d9;font-family:'SF Mono','Fira Code',monospace;min-height:100vh;padding:2rem}
  header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2rem;border-bottom:1px solid #30363d;padding-bottom:1.25rem}
  .logo{font-size:1.4rem;font-weight:700;color:#58a6ff;letter-spacing:-0.5px}
  .tagline{color:#8b949e;font-size:0.8rem;margin-top:0.25rem}
  .live-badge{display:flex;align-items:center;gap:0.4rem;font-size:0.75rem;color:#3fb950;padding:0.3rem 0.7rem;border:1px solid #238636;border-radius:20px}
  .live-dot{width:7px;height:7px;background:#3fb950;border-radius:50%;animation:blink 1.5s infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
  .events{display:flex;flex-direction:column;gap:1rem}
  .card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1.25rem}
  .card.detecting{border-left:3px solid #f0883e}
  .card.analyzing{border-left:3px solid #58a6ff}
  .card.fixing{border-left:3px solid #d2a8ff}
  .card.pr_created{border-left:3px solid #3fb950}
  .card.auto_merged{border-left:3px solid #3fb950}
  .card.notified{border-left:3px solid #3fb950}
  .card.error{border-left:3px solid #f85149}
  .card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem}
  .repo{font-weight:700;color:#58a6ff;font-size:0.95rem}
  .meta{color:#8b949e;font-size:0.75rem;margin-top:0.2rem}
  .right{text-align:right}
  .badge{display:inline-flex;align-items:center;gap:0.3rem;padding:0.2rem 0.6rem;border-radius:20px;font-size:0.72rem;font-weight:600}
  .badge-merged{background:#1f6feb22;color:#3fb950;border:1px solid #238636}
  .badge-pr{background:#1f6feb22;color:#58a6ff;border:1px solid #1f6feb}
  .badge-error{background:#f8514922;color:#f85149;border:1px solid #f85149}
  .badge-working{background:#d2a8ff22;color:#d2a8ff;border:1px solid #8b5cf6}
  .ts{color:#8b949e;font-size:0.72rem;margin-top:0.3rem}
  .timeline{display:flex;flex-direction:column;gap:0.45rem}
  .step{display:flex;align-items:flex-start;gap:0.6rem;font-size:0.83rem}
  .icon{flex-shrink:0;width:16px;text-align:center;line-height:1.4}
  .step.done .icon{color:#3fb950}
  .step.error .icon{color:#f85149}
  .step-label{color:#c9d1d9}
  .step-ts{color:#8b949e;font-size:0.7rem;margin-top:1px}
  .analysis{margin-top:1rem;padding:0.85rem;background:#0d1117;border-radius:6px;border:1px solid #21262d}
  .analysis-label{font-size:0.72rem;color:#8b949e;margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:.5px}
  .analysis-value{font-size:0.85rem;color:#c9d1d9}
  .conf-row{display:flex;align-items:center;gap:0.6rem;margin-top:0.6rem}
  .conf-bar{flex:1;height:5px;background:#21262d;border-radius:3px}
  .conf-fill{height:100%;border-radius:3px;transition:width .6s ease}
  .pr-link{display:inline-block;margin-top:0.8rem;color:#58a6ff;font-size:0.82rem;text-decoration:none}
  .pr-link:hover{text-decoration:underline}
  .footer-row{display:flex;align-items:center;gap:1rem;margin-top:0.6rem}
  .duration{color:#8b949e;font-size:0.75rem}
  .empty{text-align:center;color:#8b949e;padding:5rem 2rem}
  .empty-icon{font-size:2.5rem;margin-bottom:0.75rem}
  .empty-title{font-size:1rem;margin-bottom:0.4rem;color:#c9d1d9}
  .empty-sub{font-size:0.8rem}
  #refresh-ts{color:#8b949e;font-size:0.72rem;margin-top:0.3rem}
</style>
</head>
<body>
<header>
  <div>
    <div class="logo">⚡ BobOps</div>
    <div class="tagline">Self-Healing CI/CD · Powered by IBM watsonx.ai</div>
    <div id="refresh-ts">Connecting…</div>
  </div>
  <div class="live-badge"><span class="live-dot"></span>Live</div>
</header>
<div id="events" class="events"></div>

<script>
function ago(iso){
  const s=Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(s<60)return s+'s ago';
  if(s<3600)return Math.floor(s/60)+'m ago';
  return Math.floor(s/3600)+'h ago';
}
function confColor(n){
  if(n>=90)return'#3fb950';
  if(n>=70)return'#d29922';
  return'#f85149';
}
function badge(e){
  const s=e.status;
  if(s==='auto_merged'||s==='notified')return'<span class="badge badge-merged">✓ Auto-merged</span>';
  if(s==='pr_created')return'<span class="badge badge-pr">↑ PR opened</span>';
  if(s==='error')return'<span class="badge badge-error">✗ Error</span>';
  return'<span class="badge badge-working">● Working…</span>';
}
function renderEvent(e){
  const steps=e.steps.map(s=>\`
    <div class="step \${s.status}">
      <span class="icon">\${s.status==='done'?'✓':'✗'}</span>
      <div><div class="step-label">\${s.label}</div><div class="step-ts">\${ago(s.timestamp)}</div></div>
    </div>\`).join('');

  let analysis='';
  if(e.analysis){
    const c=e.analysis.confidence;
    analysis=\`
      <div class="analysis">
        <div class="analysis-label">Root cause</div>
        <div class="analysis-value">\${e.analysis.root_cause}</div>
        <div class="conf-row">
          <span style="font-size:.75rem;color:#8b949e">Confidence</span>
          <span style="font-size:.8rem;color:\${confColor(c)};font-weight:600">\${c}%</span>
          <div class="conf-bar"><div class="conf-fill" style="width:\${c}%;background:\${confColor(c)}"></div></div>
        </div>
        \${e.analysis.affected_areas.length?'<div style="margin-top:.5rem;font-size:.75rem;color:#8b949e">Affects: '+e.analysis.affected_areas.join(', ')+'</div>':''}
      </div>\`;
  }

  const prLink=e.prUrl?\`<a class="pr-link" href="\${e.prUrl}" target="_blank">→ View Pull Request</a>\`:'';
  const dur=e.durationMs?\`<span class="duration">Fixed in \${(e.durationMs/1000).toFixed(0)}s</span>\`:'';

  return\`
    <div class="card \${e.status}">
      <div class="card-head">
        <div>
          <div class="repo">\${e.repo}</div>
          <div class="meta">branch: \${e.branch} · \${e.commitSha.slice(0,7)} · run #\${e.runId}</div>
        </div>
        <div class="right">
          \${badge(e)}
          <div class="ts">\${ago(e.timestamp)}</div>
        </div>
      </div>
      <div class="timeline">\${steps}</div>
      \${analysis}
      <div class="footer-row">\${prLink}\${dur}</div>
    </div>\`;
}

async function refresh(){
  try{
    const res=await fetch('/api/events');
    const events=await res.json();
    const el=document.getElementById('events');
    if(events.length===0){
      el.innerHTML='<div class="empty"><div class="empty-icon">🟢</div><div class="empty-title">All pipelines healthy</div><div class="empty-sub">BobOps is watching. Failures will appear here automatically.</div></div>';
    } else {
      el.innerHTML=events.map(renderEvent).join('');
    }
    document.getElementById('refresh-ts').textContent='Updated '+new Date().toLocaleTimeString();
  } catch(err){
    document.getElementById('refresh-ts').textContent='Connection error — retrying…';
  }
}

refresh();
setInterval(refresh,3000);
</script>
</body>
</html>`;
