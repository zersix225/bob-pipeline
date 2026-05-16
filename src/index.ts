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
<title>BobOps . Self-Healing CI/CD</title>
<style>
  :root{
    --navy:#2F4156;
    --teal:#567C8D;
    --sky:#C8D9E6;
    --beige:#F5EFEB;
    --white:#FFFFFF;

    --bg:var(--beige);
    --surface:var(--white);
    --surface-alt:#fbf6f2;
    --border:#dde6ee;
    --border-soft:#ecf0f4;

    --text:var(--navy);
    --text-soft:#5d6f80;
    --text-muted:#94a3b1;

    --accent:var(--teal);
    --accent-soft:var(--sky);
    --accent-strong:var(--navy);

    --success:#6f9a82;
    --success-soft:#dfeae3;
    --warning:#a98b5c;
    --warning-soft:#f0e6d4;
    --danger:#a55a52;
    --danger-soft:#f2dcd9;

    --shadow:0 1px 2px rgba(47,65,86,.04), 0 8px 24px rgba(47,65,86,.07);
    --radius:14px;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%}
  body{
    background:
      radial-gradient(900px 600px at 0% 0%, rgba(200,217,230,0.55) 0%, transparent 60%),
      radial-gradient(900px 600px at 100% 0%, rgba(245,239,235,0.8) 0%, transparent 55%),
      var(--bg);
    color:var(--text);
    font-family:'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;
    min-height:100vh;
    letter-spacing:-0.01em;
    -webkit-font-smoothing:antialiased;
  }

  .layout{display:flex;min-height:100vh}
  .sidebar{
    width:72px;background:var(--surface);border-right:1px solid var(--border-soft);
    display:flex;flex-direction:column;align-items:center;padding:1.5rem 0;gap:0.5rem;
    position:sticky;top:0;height:100vh;flex-shrink:0;
  }
  .brand-mark{
    width:40px;height:40px;border-radius:12px;
    background:linear-gradient(135deg,var(--teal),var(--navy));
    display:flex;align-items:center;justify-content:center;
    color:var(--white);font-weight:800;font-size:1.05rem;letter-spacing:-0.5px;
    margin-bottom:1rem;
  }
  .nav-item{
    width:40px;height:40px;border-radius:10px;position:relative;
    display:flex;align-items:center;justify-content:center;
    color:var(--text-muted);cursor:pointer;transition:all .15s ease;
    border:0;background:transparent;
  }
  .nav-item.active{background:var(--sky);color:var(--navy)}
  .nav-item:hover{background:var(--beige);color:var(--teal)}
  .nav-item .count{
    position:absolute;top:-2px;right:-2px;min-width:16px;height:16px;padding:0 4px;
    border-radius:8px;background:var(--teal);color:var(--white);
    font-size:0.62rem;font-weight:700;line-height:16px;text-align:center;
  }
  .nav-item.active .count{background:var(--navy)}
  .nav-spacer{flex:1}

  .main{flex:1;padding:2rem 2.5rem;max-width:1400px;margin:0 auto;width:100%;min-width:0}

  .topbar{
    display:flex;align-items:center;justify-content:space-between;gap:1rem;
    margin-bottom:1.75rem;flex-wrap:wrap;
  }
  .greeting h1{
    font-size:1.6rem;font-weight:700;color:var(--text);
    letter-spacing:-0.02em;
  }
  .greeting p{color:var(--text-soft);font-size:0.88rem;margin-top:0.25rem}

  .topbar-right{display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap}
  .search{
    background:var(--surface);border:1px solid var(--border);
    border-radius:999px;padding:0.55rem 1rem;
    display:flex;align-items:center;gap:0.5rem;width:240px;max-width:100%;
  }
  .search input{
    border:0;background:transparent;outline:0;
    font:inherit;color:var(--text);width:100%;
  }
  .search input::placeholder{color:var(--text-muted)}
  .pill{
    background:var(--surface);border:1px solid var(--border);
    border-radius:999px;padding:0.5rem 0.9rem;
    color:var(--text-soft);font-size:0.78rem;font-weight:500;
    display:flex;align-items:center;gap:0.5rem;
  }
  .pill .live-dot{
    width:7px;height:7px;border-radius:50%;background:var(--success);
    animation:pulse 1.8s ease-in-out infinite;
  }
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}

  .stats{
    display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;
    margin-bottom:1.25rem;
  }
  .stat{
    background:var(--surface);border:1px solid var(--border-soft);
    border-radius:var(--radius);padding:1.1rem 1.25rem;box-shadow:var(--shadow);
    position:relative;overflow:hidden;
  }
  .stat.accent{
    background:linear-gradient(135deg,var(--teal),var(--navy));
    color:#eaf2f7;border-color:transparent;
  }
  .stat-label{font-size:0.78rem;color:var(--text-soft);font-weight:500}
  .stat.accent .stat-label{color:#d4e0e8}
  .stat-value{font-size:1.55rem;font-weight:700;margin-top:0.4rem;letter-spacing:-0.02em}
  .stat-foot{font-size:0.72rem;color:var(--text-muted);margin-top:0.25rem}
  .stat.accent .stat-foot{color:#c1d2dc}
  .stat-icon{
    position:absolute;top:1.1rem;right:1.1rem;
    width:34px;height:34px;border-radius:10px;
    background:var(--sky);color:var(--navy);
    display:flex;align-items:center;justify-content:center;
    font-size:0.72rem;font-weight:700;letter-spacing:0.5px;
  }
  .stat.accent .stat-icon{background:rgba(255,255,255,0.18);color:var(--white)}

  .grid{display:grid;grid-template-columns:1.6fr 1fr;gap:1rem}

  .card{
    background:var(--surface);border:1px solid var(--border-soft);
    border-radius:var(--radius);padding:1.25rem 1.4rem;box-shadow:var(--shadow);
    min-width:0;
  }
  .card-head{
    display:flex;align-items:center;justify-content:space-between;
    margin-bottom:1rem;gap:0.75rem;flex-wrap:wrap;
  }
  .card-title{font-size:1rem;font-weight:700;color:var(--text)}
  .card-sub{font-size:0.78rem;color:var(--text-soft);margin-top:0.15rem}

  .table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .table{width:100%;border-collapse:collapse}
  .table th{
    text-align:left;font-size:0.72rem;color:var(--text-muted);
    text-transform:uppercase;letter-spacing:0.06em;font-weight:600;
    padding:0.6rem 0.75rem;border-bottom:1px solid var(--border-soft);
    white-space:nowrap;
  }
  .table td{
    padding:0.85rem 0.75rem;border-bottom:1px solid var(--border-soft);
    font-size:0.86rem;vertical-align:middle;
  }
  .table tr:last-child td{border-bottom:0}
  .table tr.selected{background:var(--beige)}
  .table tr:hover{background:var(--beige);cursor:pointer}

  .repo-cell{display:flex;flex-direction:column;gap:0.15rem;min-width:0}
  .repo-name{font-weight:600;color:var(--text);word-break:break-word}
  .repo-meta{font-size:0.72rem;color:var(--text-muted);font-family:'JetBrains Mono',monospace;word-break:break-all}

  .badge{
    display:inline-flex;align-items:center;gap:0.4rem;
    padding:0.25rem 0.65rem;border-radius:999px;
    font-size:0.72rem;font-weight:600;
    border:1px solid transparent;
  }
  .badge .dot{width:6px;height:6px;border-radius:50%}
  .badge.working{background:var(--sky);color:var(--navy);border-color:#b3c7d8}
  .badge.working .dot{background:var(--teal)}
  .badge.success{background:var(--success-soft);color:#3f5e4e;border-color:#c0d4c9}
  .badge.success .dot{background:var(--success)}
  .badge.danger{background:var(--danger-soft);color:#6b332e;border-color:#e6c1bd}
  .badge.danger .dot{background:var(--danger)}
  .badge.warning{background:var(--warning-soft);color:#6b5230;border-color:#e2cfa7}
  .badge.warning .dot{background:var(--warning)}

  .timestamp{color:var(--text-muted);font-size:0.78rem;white-space:nowrap}

  .detail-empty{
    color:var(--text-muted);font-size:0.85rem;text-align:center;padding:2rem 1rem;
  }

  .detail .timeline{display:flex;flex-direction:column;gap:0.8rem;margin-top:0.25rem}
  .step{display:flex;gap:0.75rem;align-items:flex-start;font-size:0.85rem}
  .step-dot{
    flex-shrink:0;width:10px;height:10px;border-radius:50%;
    margin-top:0.35rem;background:var(--teal);
    box-shadow:0 0 0 4px var(--sky);
  }
  .step.error .step-dot{background:var(--danger);box-shadow:0 0 0 4px var(--danger-soft)}
  .step-label{color:var(--text);line-height:1.4;word-break:break-word}
  .step-ts{color:var(--text-muted);font-size:0.72rem;margin-top:0.15rem}

  .analysis-block{
    margin-top:1rem;padding:1rem;border-radius:10px;
    background:var(--beige);border:1px solid var(--border-soft);
  }
  .analysis-label{
    font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;
    letter-spacing:0.06em;font-weight:600;
  }
  .analysis-value{font-size:0.88rem;color:var(--text);margin-top:0.3rem;line-height:1.5;word-break:break-word}
  .conf-row{display:flex;align-items:center;gap:0.6rem;margin-top:0.7rem}
  .conf-bar{flex:1;height:6px;background:var(--sky);border-radius:3px;overflow:hidden}
  .conf-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--teal),var(--navy))}
  .conf-text{font-size:0.78rem;font-weight:700;color:var(--navy)}
  .affected{margin-top:0.7rem;font-size:0.75rem;color:var(--text-soft);word-break:break-word}
  .affected b{color:var(--text)}

  .pr-link{
    display:inline-flex;align-items:center;gap:0.4rem;
    margin-top:1rem;color:var(--white);background:var(--teal);
    padding:0.55rem 0.95rem;border-radius:10px;
    font-size:0.82rem;font-weight:600;text-decoration:none;
    transition:background .15s ease;
  }
  .pr-link:hover{background:var(--navy)}
  .pr-link .arrow{font-size:0.9rem}

  .meta-row{display:flex;flex-wrap:wrap;gap:0.5rem 1.25rem;margin-bottom:1rem}
  .meta-row > div{font-size:0.78rem;color:var(--text-soft)}
  .meta-row b{color:var(--text);font-weight:600}

  .empty-state{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:4rem 2rem;color:var(--text-soft);text-align:center;
  }
  .empty-orb{
    width:64px;height:64px;border-radius:50%;
    background:linear-gradient(135deg,var(--sky),var(--teal));
    margin-bottom:1rem;box-shadow:0 6px 20px rgba(86,124,141,0.3);
  }
  .empty-state h3{color:var(--text);font-size:1.05rem;margin-bottom:0.3rem}
  .empty-state p{font-size:0.85rem;max-width:300px}

  /* Tablet */
  @media (max-width:1024px){
    .stats{grid-template-columns:repeat(2,1fr)}
    .grid{grid-template-columns:1fr}
    .main{padding:1.5rem}
  }

  /* Small tablet: convert sidebar to top filter bar */
  @media (max-width:768px){
    .layout{flex-direction:column}
    .sidebar{
      width:100%;height:auto;position:static;
      flex-direction:row;padding:0.75rem 1rem;gap:0.4rem;
      border-right:0;border-bottom:1px solid var(--border-soft);
      overflow-x:auto;-webkit-overflow-scrolling:touch;
    }
    .brand-mark{margin-bottom:0;margin-right:0.5rem;flex-shrink:0}
    .nav-item{flex-shrink:0}
    .nav-spacer{display:none}
    .main{padding:1.25rem}
    .greeting h1{font-size:1.35rem}
    .topbar{margin-bottom:1.25rem}
    .search{width:100%;flex:1;min-width:160px}
  }

  .empty-row td{padding:0!important}
  .empty-row:hover{background:transparent!important;cursor:default}

  /* Phone: stack stats, convert table rows to cards */
  @media (max-width:600px){
    .main{padding:1rem}
    .stats{grid-template-columns:1fr;gap:0.75rem}
    .stat-value{font-size:1.35rem}
    .card{padding:1rem}
    .topbar-right{width:100%}

    .table thead{
      position:absolute;width:1px;height:1px;padding:0;overflow:hidden;
      clip:rect(0,0,0,0);white-space:nowrap;border:0;
    }
    .table,.table tbody{display:block;width:100%}
    .table tr{
      display:block;border:1px solid var(--border-soft);border-radius:12px;
      padding:0.75rem 0.85rem;margin-bottom:0.6rem;background:var(--surface);
    }
    .table tr:hover{background:var(--beige)}
    .table tr.selected{background:var(--beige)}
    .table tr.empty-row{display:block;border:0;padding:0;background:transparent}
    .table tr.empty-row td{display:block;padding:0}
    .table tr.empty-row td::before{display:none}
    .table td{
      display:flex;justify-content:space-between;align-items:center;gap:1rem;
      padding:0.3rem 0;border-bottom:0;font-size:0.85rem;
    }
    .table td::before{
      content:attr(data-label);
      font-size:0.7rem;color:var(--text-muted);
      text-transform:uppercase;letter-spacing:0.06em;font-weight:600;
    }
    .table td:first-child{
      flex-direction:column;align-items:flex-start;gap:0.25rem;
      padding-bottom:0.5rem;margin-bottom:0.4rem;
      border-bottom:1px solid var(--border-soft);
    }
    .table td:first-child::before{display:none}
  }
</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <div class="brand-mark">B</div>
    <button type="button" class="nav-item active" data-filter="all" title="All events">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
      <span class="count" data-count="all">0</span>
    </button>
    <button type="button" class="nav-item" data-filter="active" title="Active (detecting, analyzing, fixing)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>
      <span class="count" data-count="active">0</span>
    </button>
    <button type="button" class="nav-item" data-filter="pr" title="PR opened">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5v7"/><path d="M18 15.5V9a3 3 0 0 0-3-3H9"/></svg>
      <span class="count" data-count="pr">0</span>
    </button>
    <button type="button" class="nav-item" data-filter="healed" title="Healed (auto merged or notified)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      <span class="count" data-count="healed">0</span>
    </button>
    <button type="button" class="nav-item" data-filter="failed" title="Failed">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>
      <span class="count" data-count="failed">0</span>
    </button>
    <div class="nav-spacer"></div>
  </aside>

  <main class="main">
    <div class="topbar">
      <div class="greeting">
        <h1>Pipeline Watch</h1>
        <p>Monitor pipeline health, root-cause analyses, and automated fixes from Bob.</p>
      </div>
      <div class="topbar-right">
        <div class="search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/></svg>
          <input id="search" placeholder="Search repo, branch, or commit"/>
        </div>
        <div class="pill" id="status-pill"><span class="live-dot"></span><span id="refresh-ts">Connecting</span></div>
      </div>
    </div>

    <section class="stats">
      <div class="stat accent">
        <div class="stat-label">Auto Healed</div>
        <div class="stat-value" id="stat-healed">0</div>
        <div class="stat-foot">Pipelines fixed automatically</div>
        <div class="stat-icon">AH</div>
      </div>
      <div class="stat">
        <div class="stat-label">In Progress</div>
        <div class="stat-value" id="stat-progress">0</div>
        <div class="stat-foot">Bob is currently working</div>
        <div class="stat-icon">IP</div>
      </div>
      <div class="stat">
        <div class="stat-label">PR Opened</div>
        <div class="stat-value" id="stat-pr">0</div>
        <div class="stat-foot">Waiting on human review</div>
        <div class="stat-icon">PR</div>
      </div>
      <div class="stat">
        <div class="stat-label">Failed</div>
        <div class="stat-value" id="stat-failed">0</div>
        <div class="stat-foot">Required manual attention</div>
        <div class="stat-icon">FA</div>
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title" id="activity-title">All Activity</div>
            <div class="card-sub">Latest pipeline events captured by Bob.</div>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table" id="activity-table">
            <thead>
              <tr>
                <th>Repository</th>
                <th>Status</th>
                <th>Duration</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody id="activity-body"></tbody>
          </table>
        </div>
      </div>

      <div class="card detail" id="detail-card">
        <div class="card-head">
          <div>
            <div class="card-title">Event Detail</div>
            <div class="card-sub" id="detail-sub">Select a pipeline event to inspect.</div>
          </div>
        </div>
        <div id="detail-body" class="detail-empty">No event selected yet.</div>
      </div>
    </section>
  </main>
</div>

<script>
let cachedEvents = [];
let selectedId = null;
let searchTerm = '';
let activeFilter = 'all';

const FILTERS = {
  all:    () => true,
  active: e => ['detecting','analyzing','fixing'].includes(e.status),
  pr:     e => e.status === 'pr_created',
  healed: e => e.status === 'auto_merged' || e.status === 'notified',
  failed: e => e.status === 'error',
};

const FILTER_LABEL = {
  all:'All Activity', active:'Active Pipelines', pr:'PRs Awaiting Review',
  healed:'Healed Pipelines', failed:'Failed Pipelines'
};

function ago(iso){
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

function fmtDuration(ms){
  if (!ms && ms !== 0) return '';
  const s = ms / 1000;
  if (s < 60) return s.toFixed(0) + 's';
  return Math.floor(s/60) + 'm ' + Math.floor(s%60) + 's';
}

function statusBadge(status){
  const map = {
    detecting:   { cls:'working', text:'Detecting' },
    analyzing:   { cls:'working', text:'Analyzing' },
    fixing:      { cls:'working', text:'Fixing'    },
    pr_created:  { cls:'warning', text:'PR Open'   },
    auto_merged: { cls:'success', text:'Merged'    },
    notified:    { cls:'success', text:'Notified'  },
    error:       { cls:'danger',  text:'Failed'    },
  };
  const s = map[status] || { cls:'working', text:status };
  return '<span class="badge ' + s.cls + '"><span class="dot"></span>' + s.text + '</span>';
}

function computeStats(events){
  return {
    healed: events.filter(e => e.status === 'auto_merged' || e.status === 'notified').length,
    progress: events.filter(e => ['detecting','analyzing','fixing'].includes(e.status)).length,
    pr: events.filter(e => e.status === 'pr_created').length,
    failed: events.filter(e => e.status === 'error').length,
  };
}

function filterEvents(events, q){
  if (!q) return events;
  const needle = q.toLowerCase();
  return events.filter(e =>
    (e.repo || '').toLowerCase().includes(needle) ||
    (e.branch || '').toLowerCase().includes(needle) ||
    (e.commitSha || '').toLowerCase().includes(needle)
  );
}

function renderStats(events){
  const s = computeStats(events);
  document.getElementById('stat-healed').textContent = s.healed;
  document.getElementById('stat-progress').textContent = s.progress;
  document.getElementById('stat-pr').textContent = s.pr;
  document.getElementById('stat-failed').textContent = s.failed;

  document.querySelector('[data-count="all"]').textContent = events.length;
  document.querySelector('[data-count="active"]').textContent = s.progress;
  document.querySelector('[data-count="pr"]').textContent = s.pr;
  document.querySelector('[data-count="healed"]').textContent = s.healed;
  document.querySelector('[data-count="failed"]').textContent = s.failed;
}

function applyActiveFilter(events){
  const fn = FILTERS[activeFilter] || FILTERS.all;
  return events.filter(fn);
}

function renderActivity(events){
  const body = document.getElementById('activity-body');
  const filtered = filterEvents(applyActiveFilter(events), searchTerm);
  const titleEl = document.getElementById('activity-title');
  if (titleEl) titleEl.textContent = FILTER_LABEL[activeFilter] || 'Activity';

  if (filtered.length === 0){
    body.innerHTML = '<tr class="empty-row"><td colspan="4"><div class="empty-state"><div class="empty-orb"></div><h3>All pipelines healthy</h3><p>Bob is watching. Failed runs will land here automatically.</p></div></td></tr>';
    return;
  }

  body.innerHTML = filtered.map(e => {
    const isSelected = e.id === selectedId ? ' class="selected"' : '';
    const sha = (e.commitSha || '').slice(0,7);
    return '<tr' + isSelected + ' data-id="' + e.id + '">' +
      '<td data-label="Repository"><div class="repo-cell">' +
        '<div class="repo-name">' + escapeHtml(e.repo) + '</div>' +
        '<div class="repo-meta">' + escapeHtml(e.branch) + ' . ' + sha + ' . run #' + e.runId + '</div>' +
      '</div></td>' +
      '<td data-label="Status">' + statusBadge(e.status) + '</td>' +
      '<td data-label="Duration"><span class="timestamp">' + (fmtDuration(e.durationMs) || '...') + '</span></td>' +
      '<td data-label="When"><span class="timestamp">' + ago(e.timestamp) + '</span></td>' +
    '</tr>';
  }).join('');

  body.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('click', () => {
      selectedId = row.getAttribute('data-id');
      renderActivity(cachedEvents);
      renderDetail(cachedEvents);
    });
  });
}

function renderDetail(events){
  const card = document.getElementById('detail-card');
  const body = document.getElementById('detail-body');
  const sub = document.getElementById('detail-sub');

  const filtered = applyActiveFilter(events);
  const selected = filtered.find(e => e.id === selectedId) || filtered[0];
  if (!selected){
    sub.textContent = 'Select a pipeline event to inspect.';
    body.className = 'detail-empty';
    body.innerHTML = 'No events captured yet.';
    return;
  }

  sub.textContent = selected.repo + ' . run #' + selected.runId;
  body.className = '';

  const steps = (selected.steps || []).map(s =>
    '<div class="step ' + (s.status === 'error' ? 'error' : '') + '">' +
      '<div class="step-dot"></div>' +
      '<div><div class="step-label">' + escapeHtml(s.label) + '</div>' +
      '<div class="step-ts">' + ago(s.timestamp) + '</div></div>' +
    '</div>'
  ).join('');

  let analysis = '';
  if (selected.analysis){
    const c = selected.analysis.confidence;
    const affected = (selected.analysis.affected_areas || []).join(', ');
    analysis =
      '<div class="analysis-block">' +
        '<div class="analysis-label">Root Cause</div>' +
        '<div class="analysis-value">' + escapeHtml(selected.analysis.root_cause) + '</div>' +
        '<div class="conf-row">' +
          '<span class="analysis-label">Confidence</span>' +
          '<div class="conf-bar"><div class="conf-fill" style="width:' + c + '%"></div></div>' +
          '<span class="conf-text">' + c + '%</span>' +
        '</div>' +
        (affected ? '<div class="affected"><b>Affects:</b> ' + escapeHtml(affected) + '</div>' : '') +
      '</div>';
  }

  let errorBlock = '';
  if (selected.error){
    errorBlock =
      '<div class="analysis-block" style="border-color:#f0c8c8;background:#fdeeee">' +
        '<div class="analysis-label" style="color:#7a1f1f">Error</div>' +
        '<div class="analysis-value">' + escapeHtml(selected.error) + '</div>' +
      '</div>';
  }

  const prLink = selected.prUrl
    ? '<a class="pr-link" href="' + selected.prUrl + '" target="_blank" rel="noopener">View Pull Request <span class="arrow">&rarr;</span></a>'
    : '';

  body.innerHTML =
    '<div class="meta-row">' +
      '<div><b>Branch:</b> ' + escapeHtml(selected.branch) + '</div>' +
      '<div><b>Commit:</b> ' + (selected.commitSha || '').slice(0,7) + '</div>' +
      '<div><b>Status:</b> ' + statusBadge(selected.status) + '</div>' +
      (selected.durationMs ? '<div><b>Duration:</b> ' + fmtDuration(selected.durationMs) + '</div>' : '') +
    '</div>' +
    '<div class="timeline">' + steps + '</div>' +
    analysis +
    errorBlock +
    prLink;
}

function escapeHtml(str){
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

async function refresh(){
  try{
    const res = await fetch('/api/events');
    const events = await res.json();
    cachedEvents = events;
    renderStats(events);
    renderActivity(events);
    renderDetail(events);
    document.getElementById('refresh-ts').textContent = 'Live . ' + new Date().toLocaleTimeString();
  } catch (err){
    document.getElementById('refresh-ts').textContent = 'Connection error';
  }
}

document.getElementById('search').addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderActivity(cachedEvents);
});

document.querySelectorAll('.nav-item[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.getAttribute('data-filter');
    document.querySelectorAll('.nav-item[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedId = null;
    renderActivity(cachedEvents);
    renderDetail(cachedEvents);
  });
});

refresh();
setInterval(refresh, 3000);
</script>
</body>
</html>`;
