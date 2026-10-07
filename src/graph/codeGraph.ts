import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IGraphNode, IGraphEdge } from '../storage/schemas.ts';
import type { CortexDatabase } from '../storage/database.ts';
import { AstParser } from './astParser.ts';

export interface IGodNodeInfo {
  nodeId: string;
  name: string;
  type: string;
  inDegree: number;
  outDegree: number;
  totalConnections: number;
  criticalityScore: number; // 0.0 - 1.0
}

export interface ICircularDependency {
  cycle: string[];
}

export class CodeGraph {
  private db: CortexDatabase;
  private projectRoot: string;

  constructor(db: CortexDatabase, projectRoot: string = process.cwd()) {
    this.db = db;
    this.projectRoot = projectRoot;
  }

  public indexFile(filePath: string): void {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.projectRoot, filePath);
    if (!fs.existsSync(fullPath)) return;

    const relPath = path.relative(this.projectRoot, fullPath).replace(/\\/g, '/');
    const fileId = `file_${relPath}`;

    // Clear old records for this file before re-indexing
    this.db.clearGraphForFile(fileId);

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const { nodes, edges } = AstParser.parseFile(relPath, content);

      for (const node of nodes) {
        this.db.upsertNode(node);
      }
      for (const edge of edges) {
        this.db.addEdge(edge);
      }
      this.db.persist();
    } catch (err) {
      console.warn(`[CodeGraph] Failed to index file ${relPath}:`, err);
    }
  }

  public scanDirectory(dirPath: string = this.projectRoot, maxFiles: number = 500): void {
    const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'build', '.cortexforge', '.next']);
    const allowedExtensions = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.prisma', '.sql']);

    let filesScanned = 0;

    const walk = (currentDir: string) => {
      if (filesScanned >= maxFiles) return;

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (filesScanned >= maxFiles) break;

        if (entry.isDirectory()) {
          if (!ignoredDirs.has(entry.name)) {
            walk(path.join(currentDir, entry.name));
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (allowedExtensions.has(ext)) {
            this.indexFile(path.join(currentDir, entry.name));
            filesScanned++;
          }
        }
      }
    };

    if (fs.existsSync(dirPath)) {
      walk(dirPath);
    }
    this.db.persist();
  }

  public querySymbol(symbolName: string): {
    nodes: IGraphNode[];
    inboundEdges: IGraphEdge[];
    outboundEdges: IGraphEdge[];
  } {
    const allNodes = this.db.getAllNodes();
    const allEdges = this.db.getEdges();

    const matchedNodes = allNodes.filter(
      (n) => n.name.toLowerCase() === symbolName.toLowerCase() || n.id.includes(symbolName)
    );

    const nodeIds = new Set(matchedNodes.map((n) => n.id));

    const inboundEdges = allEdges.filter((e) => nodeIds.has(e.targetId));
    const outboundEdges = allEdges.filter((e) => nodeIds.has(e.sourceId));

    return {
      nodes: matchedNodes,
      inboundEdges,
      outboundEdges,
    };
  }

  public getBlastRadius(symbolId: string): string[] {
    const allEdges = this.db.getEdges();
    const visited = new Set<string>();
    const queue = [symbolId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!visited.has(current)) {
        visited.add(current);
        const dependents = allEdges.filter((e) => e.targetId === current).map((e) => e.sourceId);
        for (const dep of dependents) {
          if (!visited.has(dep)) {
            queue.push(dep);
          }
        }
      }
    }

    return Array.from(visited);
  }

  /**
   * God Node Detection: Identifies key architectural hubs and central points of failure
   */
  public detectGodNodes(threshold: number = 3): IGodNodeInfo[] {
    const allNodes = this.db.getAllNodes();
    const allEdges = this.db.getEdges();

    const inDegreeMap = new Map<string, number>();
    const outDegreeMap = new Map<string, number>();

    for (const edge of allEdges) {
      outDegreeMap.set(edge.sourceId, (outDegreeMap.get(edge.sourceId) || 0) + 1);
      inDegreeMap.set(edge.targetId, (inDegreeMap.get(edge.targetId) || 0) + 1);
    }

    const godNodes: IGodNodeInfo[] = [];

    for (const node of allNodes) {
      const inDeg = inDegreeMap.get(node.id) || 0;
      const outDeg = outDegreeMap.get(node.id) || 0;
      const total = inDeg + outDeg;

      if (total >= threshold) {
        // Criticality score increases with in-degree (dependents)
        const criticalityScore = Math.min(1.0, (inDeg * 1.5 + outDeg * 0.5) / 10);
        godNodes.push({
          nodeId: node.id,
          name: node.name,
          type: node.type,
          inDegree: inDeg,
          outDegree: outDeg,
          totalConnections: total,
          criticalityScore: Math.round(criticalityScore * 100) / 100,
        });
      }
    }

    return godNodes.sort((a, b) => b.totalConnections - a.totalConnections);
  }

  /**
   * Circular Dependency Detection: Identifies cyclic imports across files
   */
  public detectCircularDependencies(): ICircularDependency[] {
    const fileEdges = this.db.getEdges().filter((e) => e.relationship === 'imports');
    const adj = new Map<string, string[]>();

    for (const e of fileEdges) {
      if (!adj.has(e.sourceId)) adj.set(e.sourceId, []);
      adj.get(e.sourceId)!.push(e.targetId);
    }

    const visited = new Set<string>();
    const inStack = new Set<string>();
    const cycles: ICircularDependency[] = [];

    const dfs = (node: string, path: string[]) => {
      visited.add(node);
      inStack.add(node);
      path.push(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (inStack.has(neighbor)) {
          // Found cycle
          const cycleStartIdx = path.indexOf(neighbor);
          if (cycleStartIdx !== -1) {
            cycles.push({ cycle: [...path.slice(cycleStartIdx), neighbor] });
          }
        }
      }

      inStack.delete(node);
    };

    for (const node of adj.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }
}
