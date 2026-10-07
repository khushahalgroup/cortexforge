# CortexForge License Matrix & Clean-Room IP Statement

This document formalizes the intellectual property discipline, license compliance, and clean-room implementation boundaries governing CortexForge.

---

## 1. Intellectual Property & Clean-Room Policy

CortexForge is an original, ground-up implementation built using clean-room engineering principles:
1. **Zero Source Code Copying**: No proprietary, GPL-restricted, or third-party source files were copied into CortexForge.
2. **Behavioral & Architectural Synthesis**: CortexForge incorporates public architectural concepts (knowledge graphs, reversible compression, persistent memory schemas, minimalism heuristics) through independent TypeScript implementations.
3. **Canonical Data Modeling**: CortexForge establishes an independent canonical ID architecture (`CF_REC_*`, `project_id`, `symbol_id`) and unified storage engine.

---

## 2. Reference Project License Audit

| Project | License Type | Distribution Compatibility | Relationship to CortexForge |
| :--- | :--- | :--- | :--- |
| **Caveman** | MIT | Permissive / Compatible | Architectural inspiration for terse output; reimplemented with reversible checksum handles. |
| **Headroom** | MIT | Permissive / Compatible | Architectural inspiration for context budgeting; reimplemented as an adaptive task planner. |
| **Claude-Mem** | MIT | Permissive / Compatible | Architectural inspiration for persistent memory; reimplemented with evidence-based conflict resolution. |
| **Ponytail** | MIT | Permissive / Compatible | Architectural inspiration for minimalism; reimplemented as a pre-commit diff optimizer. |
| **Graphify** | MIT | Permissive / Compatible | Architectural inspiration for code graphs; reimplemented as an incremental AST/regex engine. |
| **Archify** | MIT | Permissive / Compatible | Architectural inspiration for diagrams; reimplemented as source-backed Mermaid generators. |

---

## 3. CortexForge License Declaration

CortexForge is distributed under the **Apache License, Version 2.0**:

- **Permissive Use**: Commercial, non-commercial, personal, and enterprise use are permitted.
- **Modification & Distribution**: Modification, distribution, and sublicensing are permitted under Apache-2.0 terms.
- **Patent Grant**: Includes an explicit contributor patent grant to protect downstream users and enterprises.
- **Trademark Notice**: CortexForge and the CortexForge logo are trademarks of the project authors.

---

## 4. Third-Party Dependency Policy

CortexForge maintains strict zero-dependency core discipline:
- No bloated external frameworks.
- Utilizes native Node.js 20+ / 24+ standard modules (`node:fs`, `node:path`, `node:crypto`, `node:http`, `node:child_process`, `node:os`).
- Full type safety using native TypeScript execution (`--experimental-strip-types`).
