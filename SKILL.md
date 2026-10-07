---
name: cortexforge
description: Use automatically when any coding agent operates on a codebase to provide persistent engineering memory, deterministic code knowledge graph, reversible context compression, minimalism verification, and source-backed architecture.
---

# CortexForge: Autonomous Developer Intelligence Platform

CortexForge is a unified autonomous intelligence layer that runs underneath coding agents (Claude Code, Gemini CLI, Cursor, Antigravity, Codex, Kiro, Copilot). It replaces fragmented context management with a unified **One-Brain** architecture.

---

## 1. Operating Identity & Core Mandate

When CortexForge is present, you operate with an enhanced cognitive architecture:
- **Persistent Engineering Memory**: Automatically retrieve historical decisions, architecture rationale, and past debugging solutions before touching code.
- **Deterministic Code Knowledge Graph**: Navigate symbols, call graphs, imports, and dependencies backed by verified static analysis evidence.
- **Reversible Context Compression**: Reduce context token consumption by 40%–80% using lossless extraction, log folding, and reversible recovery handles (`CF_REC_<hash>`).
- **Minimalism & Overengineering Guard**: Automatically review proposed diffs to eliminate duplicate utilities, unnecessary abstractions, and dead code.
- **Source-Backed Architecture**: Maintain continuous awareness of system boundaries, dataflows, and deployment topologies.

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
[2. RETRIEVAL PHASE]  ──> Retrieves high-scoring Memory & Code Graph nodes
   │
   ▼
[3. CONTEXT PLANNER]  ──> Calculates minimum sufficient context budget
   │
   ▼
[4. TOOL EXECUTION]   ──> Runs commands with automated log & output compression
   │
   ▼
[5. DIFF REVIEW]      ──> Audits planned changes for minimalism (Ponytail-grade pruning)
   │
   ▼
[6. MEMORY CAPTURE]   ──> Automatically indexes novel lessons, architecture decisions, and fixes
```

---

## 3. Intelligence Escalation Levels

Adapt depth based on task complexity without overloading the context window:

| Level | Designation | Activation Criteria | Subsystems Engaged |
| :--- | :--- | :--- | :--- |
| **0** | **Direct Action** | Trivial syntax fix, single-line typo | Minimalist check only |
| **1** | **Local Context** | Standard function edit, isolated test run | Local file graph + error compressor |
| **2** | **Memory + Graph** | Multi-file feature, bug diagnosis | Scored memory + AST call graph |
| **3** | **Deep Source** | Cross-module refactor, schema change | Full dependency graph + blast radius |
| **4** | **Architecture** | System redesign, database switch, new service | System boundaries + historical ADRs + diagrams |
| **5** | **Full Verification**| Breaking change, security-sensitive change | Complete audit + safety gate + benchmark |

---

## 4. Evidence Classification

When explaining code structure or historical decisions, explicitly classify your statements:
- `[FACT]`: Directly verified in current source code or static AST analysis.
- `[HISTORICAL]`: Recorded in persistent memory from a past session or commit.
- `[INFERENCE]`: Deduced from dependency graph patterns and architecture heuristics.
- `[UNCERTAIN]`: Hypothesized; requires runtime or manual verification.

---

## 5. Universal Command Surface (`/fusion`)

The user or agent can interact with CortexForge via the `/fusion` command namespace or MCP tools:

- `/fusion status`: Display system health, memory count, graph nodes, and token savings.
- `/fusion memory [query]`: Query persistent engineering decisions and historical solutions.
- `/fusion graph [symbol]`: Inspect callers, callees, definitions, and import trees.
- `/fusion architecture`: Generate or view source-backed Mermaid/SVG architecture maps.
- `/fusion review`: Audit uncommitted git diff for overengineering and duplicate logic.
- `/fusion audit`: Full repository minimalism, dead code, and dependency health check.
- `/fusion doctor`: Diagnose worker health, SQLite database integrity, and hook connectivity.
- `/fusion learn`: Preview or apply self-improved retrieval and compression policies.
- `/fusion recover <HANDLE>`: Reconstruct compressed content in byte-exact fidelity.
- `/fusion config`: Inspect and modify active runtime policies.
