# CortexForge Architecture Specification: The One-Brain Model

This document specifies the technical design, data structures, and execution flow of CortexForge.

---

## 1. Architectural Philosophy

Traditional agent toolchains assemble multiple independent plugins, resulting in:
- Repeated full-repository index scans.
- Disconnected SQLite databases and fragmented memory caches.
- Competing background worker processes consuming CPU and RAM.
- No cross-referencing between code symbols, past bugs, and architectural decisions.

CortexForge implements the **One-Brain Model**: all subsystems operate on a single canonical state representation with shared entity identifiers, managed by a lightweight, zero-latency local engine.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CORTEXFORGE ONE BRAIN                           │
├────────────────────────────────────────────────────────────────────────┤
│                       SHARED CANONICAL DATA BUS                        │
│   project_id  |  session_id  |  file_id  |  symbol_id  |  memory_id    │
├────────────────────────────┬────────────────────────────┬──────────────┤
│     COGNITIVE SERVICES     │     STRUCTURAL SERVICES    │ OPTIMIZATION │
│  - Task Classifier         │  - Deterministic AST Graph │ - Compressor │
│  - Context Budget Planner  │  - Incremental Parser      │ - Recovery   │
│  - Memory Quality Engine   │  - System Boundary Mapper  │ - Minimalism │
│  - Conflict Resolver       │  - Architecture Visualizer │ - Redaction  │
├────────────────────────────┴────────────────────────────┴──────────────┤
│                     HOST ADAPTER INTEGRATION LAYER                     │
│    Claude Code  |  Cursor  |  Gemini CLI  |  Antigravity  |  Codex     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Canonical Identifier Hierarchy

To prevent state drift between memory, graph, and compression subsystems, every entity is identified by a deterministic canonical string:

| Identifier Type | Format | Example |
| :--- | :--- | :--- |
| `project_id` | `proj_<hash(root_path)>` | `proj_8f921a` |
| `session_id` | `sess_<timestamp>_<rand>` | `sess_1775630000_3b1a` |
| `file_id` | `file_<rel_path>` | `file_src/services/Payment.ts` |
| `symbol_id` | `sym_<file_id>#<type>#<name>`| `sym_file_src/services/Payment.ts#class#PaymentService` |
| `memory_id` | `mem_<sha256(content_prefix)>`| `mem_9a7d3f` |
| `recovery_id`| `CF_REC_<sha256(payload)[:8]>` | `CF_REC_4F82B9` |
| `event_id` | `evt_<timestamp>_<seq>` | `evt_1775630001_001` |

---

## 3. Subsystem Breakdown

### 3.1 Host & Environment Detector (`src/detector/`)
- Detects running host environment: Claude Code (`CLAUDE_CODE=1`), Cursor (`CURSOR_PROJECT_DIR`), Gemini CLI, Antigravity (`ANTIGRAVITY_ENV`), Codex, Copilot.
- Inspects repository type, package managers (npm, pnpm, yarn, bun, poetry, cargo, go.mod), and git branch.
- Negotiates strongest integration mode: `HOOKS + MCP + SKILL` $\rightarrow$ `MCP ONLY` $\rightarrow$ `SKILL ONLY` $\rightarrow$ `CLI FALLBACK`.

### 3.2 Unified Storage Engine (`src/storage/`)
- Atomic, transactional persistence using structured JSON records with write-ahead verification.
- Stores memories, code graph nodes/edges, compression recovery blobs, and learning telemetry.
- Self-healing: Automatically detects and rebuilds corrupted database records from source files.

### 3.3 Task Classifier & Context Planner (`src/context/`)
- Parses user prompt into categorized intents: `BUG_FIX`, `FEATURE`, `REFACTOR`, `ARCHITECTURE`, `SECURITY`, `TESTING`.
- Computes **Minimum Sufficient Context**:
  - `BUG_FIX`: Prioritizes stack trace, target function, call sites, and historical bug resolutions.
  - `REFACTOR`: Prioritizes all inbound/outbound symbol references and test coverage files.
  - `ARCHITECTURE`: Prioritizes system boundary nodes, ADRs, and cross-service dependencies.
- Enforces 25% context window headroom to prevent model attention degradation.

### 3.4 Multi-Stage Compression & Recovery Engine (`src/compression/`)
- Strategies:
  1. *JSON Normalization*: Prunes redundant metadata, whitespace, and null structures.
  2. *Terminal Log Folding*: Collapses successful compiler passes and noisy progress bars into summary lines.
  3. *Test Output Extraction*: Preserves failing assertion diffs while folding passing tests.
  4. *Diff Compaction*: Extracts changed chunks while deduplicating unchanged context.
- **Perfect Recovery**: Every lossy transformation generates a `CF_REC_<hash>` handle backed by an on-disk SHA-256 payload cache. Calling `recover(CF_REC_<hash>)` restores the original bytes instantly.

### 3.5 Memory Quality Engine & Conflict Resolver (`src/memory/`)
- Every candidate memory is scored by:
  $$\text{Score} = (\text{Importance} \times 0.4) + (\text{Recency} \times 0.2) + (\text{Frequency} \times 0.2) + (\text{Utility} \times 0.2)$$
- **Evidence-Based Conflict Resolution**: Current source code always outranks historical conversational memory. If a memory states *"Database is Mongo"* but `package.json` contains `pg` and `src/db.ts` uses PostgreSQL, the memory is flagged as `DEPRECATED` and suppressed.

### 3.6 Deterministic Code Graph (`src/graph/`)
- Native AST and regular expression scanner for TypeScript, JavaScript, Python, Go, and Rust.
- Extracts entities (Classes, Functions, Interfaces, Routes, Endpoints) and directed edges (`imports`, `calls`, `defines`, `depends_on`).
- Incremental: Re-parses only modified files on save events in $< 15\text{ms}$.

### 3.7 Visual Architecture & Archify Engine (`src/architecture/`)
- Aggregates code graph nodes into high-level subsystems: Frontend, Backend API, Database, Cache, Message Queue, External Services.
- Dynamically emits source-backed Mermaid diagrams, dataflow maps, and sequence charts with verified file citations.

### 3.8 Minimalism & Diff Optimizer (`src/minimalism/`)
- Pre-commit diff auditing (Ponytail discipline).
- Compares staged code against existing repository utilities. Detects duplicate helper functions, unused imports, overengineered abstractions, and dead code.
- Generates compact, actionable signals indicating LOC reductions.

### 3.9 Secret Redactor & Safety Gate (`src/security/`)
- Scans context and tool outputs for sensitive patterns (API keys, private keys, connection strings, auth tokens).
- Replaces secrets with typed redaction tokens: `<redacted:AWS_KEY>`, `<redacted:STRIPE_SECRET>`.
- Intercepts destructive commands (`rm -rf`, `DROP TABLE`, `git push --force`) with explicit safety gates.

---

## 4. End-to-End Execution Flow

```text
1. USER sends prompt to Agent.
2. Hook/MCP intercepts prompt.
3. TaskClassifier identifies: [Task: BUG_FIX | Target: PaymentService]
4. MemoryEngine finds: [Historical Fix: "Stripe idempotency key must be unique per attempt"]
5. CodeGraph extracts: [Callers: CheckoutController -> PaymentService -> StripeClient]
6. ContextPlanner constructs prioritized context bundle (8.2k tokens instead of 45k).
7. Agent runs tool: `npm test` -> generates 12KB noisy test output.
8. Compressor optimizes log: 12KB -> 480B [Failing test isolated, Handle: CF_REC_7A921B].
9. Agent proposes fix: Adds `generateUUID()` utility.
10. DiffOptimizer intercepts: "Reuse existing src/utils/uuid.ts. Saves 18 LOC."
11. Fix applied -> Test passes.
12. MemoryEngine records resolution under canonical ID `sym_PaymentService#charge`.
```
