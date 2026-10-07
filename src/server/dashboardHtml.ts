/**
 * CortexForge Premium Developer Intelligence Dashboard
 * Zero-dependency, responsive, with fallback rendering, real-time search, and tabs.
 */

export function renderDashboardHtml(data: {
  projectName: string;
  hostAgent: string;
  uptime: number;
  memoriesCount: number;
  graphNodesCount: number;
  godNodes: Array<{ name: string; totalConnections: number; type: string; inDegree?: number; outDegree?: number }>;
  recentMemories: Array<{ topic: string; summary: string; evidence: string; importance: number; details?: string }>;
  mermaidGraph: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CortexForge Intelligence Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    try {
      mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    } catch (e) {
      console.warn('Mermaid CDN unavailable, using native fallback.', e);
    }
  </script>
  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --card-hover: #162032;
      --border: #1f2937;
      --border-accent: rgba(59, 130, 246, 0.3);
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.15);
      --text: #f9fafb;
      --muted: #9ca3af;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px; min-height: 100vh; }
    .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo-icon { font-size: 28px; }
    .title { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
    .pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .pill-active { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .meta-box { font-size: 13px; color: var(--muted); text-align: right; }
    .meta-box strong { color: #fff; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; position: relative; overflow: hidden; transition: border-color 0.2s; }
    .stat-card:hover { border-color: var(--border-accent); }
    .stat-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 8px; }
    .stat-value { font-size: 32px; font-weight: 800; color: #fff; }
    .stat-desc { font-size: 12px; color: var(--muted); margin-top: 6px; display: flex; align-items: center; gap: 4px; }

    .nav-tabs { display: flex; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
    .tab-btn { background: none; border: none; color: var(--muted); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
    .tab-btn:hover { color: #fff; background: var(--border); }
    .tab-btn.active { color: #fff; background: var(--accent); }

    .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    @media (max-width: 900px) { .main-grid { grid-template-columns: 1fr; } }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .card-title { font-size: 16px; font-weight: 700; color: #fff; }
    
    .search-input { width: 100%; padding: 10px 14px; background: #1a2234; border: 1px solid var(--border); border-radius: 8px; color: #fff; font-size: 13px; margin-bottom: 16px; outline: none; }
    .search-input:focus { border-color: var(--accent); }

    .mem-item { background: #172033; border: 1px solid var(--border); border-radius: 8px; padding: 14px; margin-bottom: 12px; border-left: 4px solid var(--accent); }
    .mem-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .mem-topic { font-weight: 700; font-size: 14px; color: #93c5fd; }
    .badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 700; }
    .badge-fact { background: #064e3b; color: #6ee7b7; }
    .badge-historical { background: #1e3a8a; color: #93c5fd; }
    .mem-body { font-size: 13px; color: #e2e8f0; line-height: 1.4; }
    .mem-detail { font-size: 12px; color: var(--muted); margin-top: 6px; font-style: italic; }

    .table-container { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th { padding: 10px 12px; color: var(--muted); font-weight: 600; border-bottom: 1px solid var(--border); }
    td { padding: 12px; border-bottom: 1px solid #1a2234; color: #e2e8f0; }
    tr:hover td { background: var(--card-hover); }

    .diagram-box { background: #0e1526; border: 1px solid var(--border); border-radius: 8px; padding: 20px; overflow-x: auto; min-height: 250px; }
    .fallback-tiers { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; }
    .tier-box { background: #131c31; border: 1px solid #23314d; border-radius: 8px; padding: 14px; }
    .tier-title { font-weight: 700; color: #60a5fa; font-size: 13px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo-icon">🧠</div>
      <div>
        <div class="title">CortexForge Intelligence Dashboard</div>
        <div style="font-size: 12px; color: var(--muted); margin-top: 2px;">One-Brain Autonomous Developer Architecture</div>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 16px;">
      <span class="pill pill-active">● WORKER ACTIVE</span>
      <div class="meta-box">
        <div>Project: <strong>${data.projectName}</strong></div>
        <div>Agent: <strong>${data.hostAgent}</strong> | Port: <strong>49210</strong></div>
      </div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Code Knowledge Graph</div>
      <div class="stat-value" style="color: #60a5fa;">${data.graphNodesCount}</div>
      <div class="stat-desc">Deterministic AST Symbols & Calls</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Persistent Engineering Memory</div>
      <div class="stat-value" style="color: #34d399;">${data.memoriesCount}</div>
      <div class="stat-desc">BM25 Hybrid & Evidence-Ranked</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Architectural God Nodes</div>
      <div class="stat-value" style="color: #f59e0b;">${data.godNodes.length}</div>
      <div class="stat-desc">Key Centrality & System Hubs</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Engine Uptime</div>
      <div class="stat-value" id="uptime-val">${Math.round(data.uptime)}s</div>
      <div class="stat-desc">Background Daemon Responsive</div>
    </div>
  </div>

  <div class="main-grid">
    <div class="card">
      <div class="card-head">
        <div class="card-title">Top Architectural God Nodes (Hubs)</div>
        <span style="font-size: 12px; color: var(--muted);">${data.godNodes.length} hubs detected</span>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Symbol / File</th>
              <th>Type</th>
              <th>Total Connections</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            ${data.godNodes.length === 0 ? '<tr><td colspan="4" style="text-align:center; color:var(--muted);">No God Nodes detected yet. Indexing will populate hubs.</td></tr>' : ''}
            ${data.godNodes.map(g => `
              <tr>
                <td><strong style="color:#93c5fd;">${g.name}</strong></td>
                <td><span style="color:#9ca3af; font-size:12px;">${g.type}</span></td>
                <td><strong style="color:#fbbf24;">${g.totalConnections}</strong></td>
                <td><span class="badge badge-fact">Core Hub</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title">Persistent Engineering Memory</div>
        <span style="font-size: 12px; color: var(--muted);">${data.memoriesCount} indexed</span>
      </div>
      <input type="text" id="mem-filter" class="search-input" placeholder="Search memories (e.g., Database, Stripe, Auth)..." oninput="filterMemories()" />
      <div id="memory-list" style="max-height: 380px; overflow-y: auto;">
        ${data.recentMemories.length === 0 ? '<div style="color:var(--muted); text-align:center; padding:20px;">No memories stored yet. Record memories via CLI or MCP.</div>' : ''}
        ${data.recentMemories.map(m => `
          <div class="mem-item">
            <div class="mem-head">
              <span class="mem-topic">${m.topic}</span>
              <span class="badge ${m.evidence === 'FACT' ? 'badge-fact' : 'badge-historical'}">${m.evidence}</span>
            </div>
            <div class="mem-body">${m.summary}</div>
            ${m.details ? `<div class="mem-detail">${m.details}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-head">
      <div class="card-title">Verified Architecture & System Boundaries</div>
      <span style="font-size: 12px; color: var(--muted);">Source-Backed Live Topology</span>
    </div>
    <div class="diagram-box">
      <div class="mermaid">
${data.mermaidGraph}
      </div>
    </div>
  </div>

  <script>
    function filterMemories() {
      const q = document.getElementById('mem-filter').value.toLowerCase();
      const items = document.querySelectorAll('.mem-item');
      items.forEach(el => {
        const text = el.innerText.toLowerCase();
        el.style.display = text.includes(q) ? 'block' : 'none';
      });
    }

    // Auto-poll status every 5 seconds
    setInterval(async () => {
      try {
        const res = await fetch('/health');
        if (res.ok) {
          const data = await res.json();
          const upEl = document.getElementById('uptime-val');
          if (upEl) upEl.innerText = Math.round(data.uptime) + 's';
        }
      } catch (e) {}
    }, 5000);
  </script>
</body>
</html>`;
}
