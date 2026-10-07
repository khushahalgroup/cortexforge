/**
 * Generates an interactive, zero-dependency HTML dashboard for CortexForge
 */

export function renderDashboardHtml(data: {
  projectName: string;
  hostAgent: string;
  uptime: number;
  memoriesCount: number;
  graphNodesCount: number;
  godNodes: Array<{ name: string; totalConnections: number; type: string }>;
  recentMemories: Array<{ topic: string; summary: string; evidence: string; importance: number }>;
  mermaidGraph: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CortexForge Intelligence Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>mermaid.initialize({ startOnLoad: true, theme: 'dark' });</script>
  <style>
    :root {
      --bg: #0b0f17;
      --card-bg: #111827;
      --border: #1f2937;
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.2);
      --success: #10b981;
      --warning: #f59e0b;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 24px; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 800; display: flex; align-items: center; gap: 10px; color: #60a5fa; }
    .badge { background: #1e3a8a; color: #93c5fd; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge.active { background: #064e3b; color: #6ee7b7; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 24px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); }
    .card-title { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 10px; }
    .stat { font-size: 32px; font-weight: 800; color: #fff; }
    .memory-item { padding: 12px; background: #1f2937; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid var(--accent); }
    .memory-topic { font-weight: 600; color: #93c5fd; font-size: 14px; margin-bottom: 4px; }
    .memory-summary { font-size: 13px; color: #d1d5db; }
    .god-node-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .mermaid { background: #1e293b; padding: 20px; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <span>🧠 CortexForge</span>
      <span class="badge active">● ACTIVE</span>
    </div>
    <div style="font-size: 14px; color: var(--text-muted);">
      Project: <strong style="color: #fff;">${data.projectName}</strong> | Host: <strong style="color: #fff;">${data.hostAgent}</strong>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Persistent Memories</div>
      <div class="stat">${data.memoriesCount}</div>
      <div style="color: var(--success); font-size: 13px; margin-top: 6px;">Evidence-Ranked & Conflict-Safe</div>
    </div>
    <div class="card">
      <div class="card-title">Code Knowledge Graph</div>
      <div class="stat">${data.graphNodesCount}</div>
      <div style="color: var(--accent); font-size: 13px; margin-top: 6px;">Deterministic AST Symbols & Calls</div>
    </div>
    <div class="card">
      <div class="card-title">Engine Uptime</div>
      <div class="stat">${Math.round(data.uptime)}s</div>
      <div style="color: var(--text-muted); font-size: 13px; margin-top: 6px;">Background Worker Active</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
    <div class="card">
      <div class="card-title">Top Architectural God Nodes (Hubs)</div>
      ${data.godNodes.length === 0 ? '<div style="color: var(--text-muted);">Index project to view god nodes.</div>' : ''}
      ${data.godNodes.map(g => `
        <div class="god-node-item">
          <div><strong style="color:#93c5fd;">${g.name}</strong> <span style="color:#6b7280;">(${g.type})</span></div>
          <div><span class="badge">${g.totalConnections} connections</span></div>
        </div>
      `).join('')}
    </div>

    <div class="card">
      <div class="card-title">Recent Engineering Decisions</div>
      ${data.recentMemories.length === 0 ? '<div style="color: var(--text-muted);">No memories recorded yet.</div>' : ''}
      ${data.recentMemories.map(m => `
        <div class="memory-item">
          <div class="memory-topic">[${m.evidence}] ${m.topic}</div>
          <div class="memory-summary">${m.summary}</div>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-title">Verified Architecture & System Boundaries</div>
    <div class="mermaid">
${data.mermaidGraph}
    </div>
  </div>
</body>
</html>`;
}
