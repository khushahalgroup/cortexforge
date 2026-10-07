/**
 * CortexForge Canonical Schemas & Types
 * Enforces unified One-Brain data representations across all subsystems.
 */

export interface IProjectProfile {
  projectId: string; // proj_<hash>
  rootPath: string;
  projectName: string;
  language: string;
  framework?: string;
  packageManager: string;
  gitBranch?: string;
  lastIndexedAt: number;
}

export interface IMemoryRecord {
  id: string; // mem_<hash>
  projectId: string;
  topic: string;
  summary: string;
  details?: string;
  evidence: 'FACT' | 'HISTORICAL' | 'INFERENCE' | 'UNCERTAIN';
  importance: number; // 0.0 - 1.0
  utilityScore: number;
  recency: number; // Timestamp
  accessCount: number;
  relatedSymbols: string[]; // Array of symbol_id
  isDeprecated?: boolean;
  deprecationReason?: string;
}

export type SymbolType =
  | 'file'
  | 'class'
  | 'interface'
  | 'function'
  | 'method'
  | 'variable'
  | 'route'
  | 'database_model';

export interface IGraphNode {
  id: string; // sym_<file_id>#<type>#<name>
  fileId: string; // file_<rel_path>
  name: string;
  type: SymbolType;
  line: number;
  signature?: string;
  documentation?: string;
}

export interface IGraphEdge {
  sourceId: string;
  targetId: string;
  relationship: 'imports' | 'calls' | 'inherits' | 'implements' | 'routes_to' | 'depends_on';
  evidenceLine?: number;
}

export interface IRecoveryRecord {
  handle: string; // CF_REC_<hash>
  originalSize: number;
  compressedSize: number;
  sha256: string;
  payload: string; // Byte-exact original content
  strategy: string;
  createdAt: number;
}

export interface ISystemBoundary {
  name: string;
  tier: 'frontend' | 'backend' | 'database' | 'cache' | 'queue' | 'external';
  symbols: string[];
  description: string;
}

export interface IArchitectureModel {
  projectId: string;
  boundaries: ISystemBoundary[];
  dataflows: Array<{ from: string; to: string; protocol: string }>;
  updatedAt: number;
}

export interface IInternalEvent {
  id: string;
  type: string;
  timestamp: number;
  projectId: string;
  sessionId: string;
  source: string;
  payload: Record<string, unknown>;
  durationMs: number;
  tokensSaved?: number;
  status: 'success' | 'warning' | 'error';
}
