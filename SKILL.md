---
name: cortexforge
description: Use automatically when any coding agent operates on a codebase to provide persistent engineering memory, deterministic code knowledge graph, reversible context compression, minimalism verification, and source-backed architecture.
---

# CortexForge: Autonomous Developer Intelligence Platform

CortexForge is a unified autonomous intelligence layer that runs underneath modern AI coding agents (**Claude Code**, **Gemini CLI**, **Cursor**, **Google Antigravity**, **OpenAI Codex**, **GitHub Copilot**, and **Kiro**). It replaces fragmented tools with a unified **One-Brain** architecture that integrates and outperforms **Headroom**, **Claude-Mem**, **Caveman**, **Ponytail**, **Graphify**, and **Archify** combined.

---

## 1. Operating Identity & Core Mandate

When CortexForge is present, you operate with an enhanced cognitive architecture:
- **Persistent Engineering Memory (Claude-Mem+)**: Retrieve historical decisions, causal timelines, session briefings, and bug solutions backed by BM25 hybrid ranking.
- **Deterministic Code Knowledge Graph (Graphify+)**: Navigate polyglot symbols, calculate shortest dependency paths, detect God node hubs, and cluster functional communities.
- **Context & Headroom Intelligence (Headroom+)**: Maintain dynamic headroom budgets, enforce prompt cache alignment (>90% hit rate), and crush tabular JSON using SmartCrusher.
- **Reversible Context Compression (Caveman+)**: Reduce context tokens by 40%–80% using ULTRA mode, smart function folding (`smartOutline`), and byte-exact SHA-256 recovery handles (`CF_REC_<hash>`).
- **Minimalism & Anti-Bloat Guard (Ponytail+)**: Audit code and diffs to eliminate passthrough wrappers, single-impl factories, speculative generics, and dead utilities while tracking LOC avoided.
- **Source-Backed Architecture Engine (Archify+)**: Enforce downward layer boundaries (Test -> Presentation -> Application -> Domain -> Infrastructure) with drift scoring and auto-generate Mermaid sequence diagrams.

---

## 2. Zero-Configuration Auto-Activation

You do NOT require the user to invoke `/fusion` manually. The moment a user submits a prompt, execute the **Automatic Intelligence Loop**:

```text
USER PROMPT
   │
   ▼
[1. TASK CLASSIFIER]  ──> Classifies: Bug, Feature, Refactor, Architecture, Security
   │
   ▼
[2. RETRIEVAL PHASE]  ──> Retrieves Memory, Graph nodes, and Cache-aligned prefixes
   │
   ▼
[3. CONTEXT PLANNER]  ──> Calculates headroom budget, crushes JSON, folds unneeded bodies
   │
   ▼
[4. TOOL EXECUTION]   ──> Runs commands with interceptor safety gates and output compression
   │
   ▼
[5. DIFF REVIEW]      ──> Audits changes for minimalism (no passthroughs, no complexity spikes)
   │
   ▼
[6. MEMORY CAPTURE]   ──> Automatically extracts observations, decisions, and causal timelines
```

---

## 3. Intelligence Escalation Levels

Adapt depth based on task complexity without overloading the context window:

| Level | Designation | Activation Criteria | Subsystems Engaged |
| :--- | :--- | :--- | :--- |
| **0** | **Direct Action** | Trivial syntax fix, single-line typo | Minimalist check only |
| **1** | **Local Context** | Standard function edit, isolated test run | Local file graph + error compressor + code folder |
| **2** | **Memory + Graph** | Multi-file feature, bug diagnosis | Scored memory + AST call graph + shortest path |
| **3** | **Deep Source** | Cross-module refactor, schema change | Full dependency graph + blast radius + community clusters |
| **4** | **Architecture** | System redesign, database switch, new service | System boundaries + layer drift audit + historical ADRs + diagrams |
| **5** | **Full Verification**| Breaking change, security-sensitive change | Complete audit + safety gate + benchmark + scorecard |

---

## 4. Evidence Classification

When explaining code structure or historical decisions, explicitly classify your statements:
- `[FACT]`: Directly verified in current source code or static AST analysis.
- `[HISTORICAL]`: Recorded in persistent memory from a past session or commit.
- `[INFERENCE]`: Deduced from dependency graph patterns, shortest paths, and architecture heuristics.
- `[UNCERTAIN]`: Hypothesized; requires runtime or manual verification.

---

## 5. Universal Command Surface (`/fusion` & MCP Tools)

The user or agent can interact with CortexForge via the CLI (`cortexforge <cmd>`), slash command `/fusion`, or native MCP tools:

### Knowledge & Graph Navigation
- `fusion_query_symbol` / `/fusion graph [symbol]`: Inspect definitions, callers, callees, and dependencies.
- `fusion_god_nodes` / `/fusion god-nodes`: Identify architectural bottlenecks and high-centrality symbols.
- `fusion_path` / `/fusion path <from> <to>`: Compute the shortest dependency path between any two symbols.
- `fusion_communities` / `/fusion communities`: Cluster codebase into functional architectural modules.
- `fusion_blast_radius` / `/fusion blast-radius <sym>`: Determine cascading dependent symbols impacted by changes.
- `fusion_cycles` / `/fusion cycles`: Detect circular import loops across files.

### Memory & Causality
- `fusion_query_memory` / `/fusion memory [query]`: Query persistent decisions via BM25 hybrid ranking.
- `fusion_save_memory`: Persist an architectural decision or fix with verifiable evidence.
- `fusion_timeline` / `/fusion timeline`: View chronological sequence of past decisions and fixes.
- `fusion_briefing` / `/fusion briefing`: Generate cold-start project briefing and key symbol index.

### Architecture & Minimalism
- `fusion_architecture` / `/fusion architecture`: Generate Mermaid layer maps, sequence flows, or blast-radius diagrams.
- `fusion_drift` / `/fusion drift`: Audit architectural layer violations and compute drift score.
- `fusion_audit` / `/fusion audit`: Scan for passthrough wrappers, speculative factories, and dead utilities.
- `fusion_scorecard` / `/fusion scorecard`: Review tokens saved, compression ratio, LOC avoided, and dollar ROI.

### Context Compression & Headroom
- `fusion_fold` / `/fusion fold <file>`: Collapse function bodies into compact outlines (75–85% token savings).
- `fusion_crush` / `/fusion crush <file>`: Compress repetitive JSON arrays into matrix format.
- `fusion_compress`: Compress arbitrary noisy logs with reversible handles.
- `fusion_recover` / `/fusion recover <HANDLE>`: Reconstruct compressed content with 100% byte-exact fidelity.
- `fusion_status` / `/fusion status`: Display system health, worker status, and active intelligence stats.
