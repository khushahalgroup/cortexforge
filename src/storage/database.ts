import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type {
  IProjectProfile,
  IMemoryRecord,
  IGraphNode,
  IGraphEdge,
  IRecoveryRecord,
  IInternalEvent,
  IArchitectureModel,
} from './schemas.ts';

interface IDatabaseState {
  version: number;
  project: IProjectProfile | null;
  memories: Record<string, IMemoryRecord>;
  nodes: Record<string, IGraphNode>;
  edges: IGraphEdge[];
  recoveries: Record<string, IRecoveryRecord>;
  architecture: IArchitectureModel | null;
  events: IInternalEvent[];
}

export class CortexDatabase {
  private dataDir: string;
  private dbFilePath: string;
  private state: IDatabaseState;

  constructor(baseDir: string = process.cwd()) {
    this.dataDir = path.join(baseDir, '.cortexforge');
    this.dbFilePath = path.join(this.dataDir, 'cortex.db.json');
    this.state = this.getInitialState();
    this.init();
  }

  private getInitialState(): IDatabaseState {
    return {
      version: 1,
      project: null,
      memories: {},
      nodes: {},
      edges: [],
      recoveries: {},
      architecture: null,
      events: [],
    };
  }

  private init(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        this.state = JSON.parse(raw);
      } catch (err) {
        console.warn('[CortexDatabase] Database file corrupted. Rebuilding fresh state.', err);
        // Backup corrupted file
        const backupPath = path.join(this.dataDir, `cortex.corrupt.${Date.now()}.json`);
        try {
          fs.copyFileSync(this.dbFilePath, backupPath);
        } catch {}
        this.state = this.getInitialState();
        this.persist();
      }
    } else {
      this.persist();
    }
  }

  public persist(): void {
    try {
      const tempPath = `${this.dbFilePath}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dbFilePath);
    } catch (err) {
      console.error('[CortexDatabase] Failed to write database state:', err);
    }
  }

  // --- Project Profile ---
  public setProject(project: IProjectProfile): void {
    this.state.project = project;
    this.persist();
  }

  public getProject(): IProjectProfile | null {
    return this.state.project;
  }

  // --- Memory Operations ---
  public upsertMemory(memory: IMemoryRecord): void {
    this.state.memories[memory.id] = memory;
    this.persist();
  }

  public getMemory(id: string): IMemoryRecord | undefined {
    return this.state.memories[id];
  }

  public getAllMemories(): IMemoryRecord[] {
    return Object.values(this.state.memories);
  }

  public findMemories(predicate: (m: IMemoryRecord) => boolean): IMemoryRecord[] {
    return Object.values(this.state.memories).filter(predicate);
  }

  // --- Code Graph Operations ---
  public upsertNode(node: IGraphNode): void {
    this.state.nodes[node.id] = node;
  }

  public getNode(id: string): IGraphNode | undefined {
    return this.state.nodes[id];
  }

  public getAllNodes(): IGraphNode[] {
    return Object.values(this.state.nodes);
  }

  public addEdge(edge: IGraphEdge): void {
    // Deduplicate edges
    const exists = this.state.edges.some(
      (e) =>
        e.sourceId === edge.sourceId &&
        e.targetId === edge.targetId &&
        e.relationship === edge.relationship
    );
    if (!exists) {
      this.state.edges.push(edge);
    }
  }

  public getEdges(): IGraphEdge[] {
    return this.state.edges;
  }

  public clearGraphForFile(fileId: string): void {
    const nodeIdsToRemove = new Set<string>();
    for (const [id, node] of Object.entries(this.state.nodes)) {
      if (node.fileId === fileId) {
        nodeIdsToRemove.add(id);
        delete this.state.nodes[id];
      }
    }
    this.state.edges = this.state.edges.filter(
      (e) => !nodeIdsToRemove.has(e.sourceId) && !nodeIdsToRemove.has(e.targetId)
    );
  }

  // --- Recovery Operations ---
  public saveRecovery(record: IRecoveryRecord): void {
    this.state.recoveries[record.handle] = record;
    this.persist();
  }

  public getRecovery(handle: string): IRecoveryRecord | undefined {
    return this.state.recoveries[handle];
  }

  // --- Architecture Operations ---
  public setArchitecture(arch: IArchitectureModel): void {
    this.state.architecture = arch;
    this.persist();
  }

  public getArchitecture(): IArchitectureModel | null {
    return this.state.architecture;
  }

  // --- Event Tracing ---
  public recordEvent(event: IInternalEvent): void {
    this.state.events.push(event);
    // Keep max 500 recent events
    if (this.state.events.length > 500) {
      this.state.events.shift();
    }
    this.persist();
  }

  public getRecentEvents(limit: number = 50): IInternalEvent[] {
    return this.state.events.slice(-limit);
  }
}
