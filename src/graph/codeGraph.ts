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

export interface ICommunity {
  id: string;
  name: string;
  nodeCount: number;
  symbols: string[];
  densityScore: number;
}

export interface IShortestPathResult {
  found: boolean;
  distance: number;
  path: Array<{ from: string; to: string; relationship: string }>;
  summary: string;
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

  /**
   * Shortest Path Traversal (Graphify): Computes the minimum dependency/call path between two symbols.
   */
  public findShortestPath(sourceName: string, targetName: string): IShortestPathResult {
    const allNodes = this.db.getAllNodes();
    const allEdges = this.db.getEdges();

    const sourceNode = allNodes.find(
      (n) => n.name.toLowerCase() === sourceName.toLowerCase() || n.id.includes(sourceName)
    );
    const targetNode = allNodes.find(
      (n) => n.name.toLowerCase() === targetName.toLowerCase() || n.id.includes(targetName)
    );

    if (!sourceNode || !targetNode) {
      return {
        found: false,
        distance: -1,
        path: [],
        summary: `One or both symbols not found in code graph ('${sourceName}', '${targetName}').`,
      };
    }

    if (sourceNode.id === targetNode.id) {
      return {
        found: true,
        distance: 0,
        path: [],
        summary: `Source and target are the same symbol ('${sourceNode.name}').`,
      };
    }

    // Bidirectional adjacency map
    const adj = new Map<string, Array<{ to: string; rel: string }>>();
    for (const e of allEdges) {
      if (!adj.has(e.sourceId)) adj.set(e.sourceId, []);
      adj.get(e.sourceId)!.push({ to: e.targetId, rel: e.relationship });

      // Inverse edge for navigable dependency exploration
      if (!adj.has(e.targetId)) adj.set(e.targetId, []);
      adj.get(e.targetId)!.push({ to: e.sourceId, rel: `inv_${e.relationship}` });
    }

    // BFS queue
    const queue: Array<{ id: string; path: Array<{ from: string; to: string; relationship: string }> }> = [
      { id: sourceNode.id, path: [] },
    ];
    const visited = new Set<string>([sourceNode.id]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.id === targetNode.id) {
        const readablePath = current.path
          .map((p) => `${this.getNodeName(p.from)} -[${p.relationship}]-> ${this.getNodeName(p.to)}`)
          .join(' => ');

        return {
          found: true,
          distance: current.path.length,
          path: current.path,
          summary: `Path found (${current.path.length} hops): ${readablePath}`,
        };
      }

      const neighbors = adj.get(current.id) || [];
      for (const n of neighbors) {
        if (!visited.has(n.to)) {
          visited.add(n.to);
          queue.push({
            id: n.to,
            path: [...current.path, { from: current.id, to: n.to, relationship: n.rel }],
          });
        }
      }
    }

    return {
      found: false,
      distance: -1,
      path: [],
      summary: `No connecting dependency path found between '${sourceNode.name}' and '${targetNode.name}'.`,
    };
  }

  private getNodeName(id: string): string {
    const node = this.db.getNode(id);
    return node ? node.name : id;
  }

  /**
   * Community Detection (Graphify Clustering):
   * Groups symbols into functional domains based on module locality and interaction density.
   */
  public detectCommunities(): ICommunity[] {
    const allNodes = this.db.getAllNodes();
    const allEdges = this.db.getEdges();

    // Group by top-level subsystem directory
    const groups = new Map<string, string[]>();

    for (const node of allNodes) {
      const parts = node.fileId.replace(/^file_/, '').split('/');
      const communityName = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0] || 'core';

      if (!groups.has(communityName)) {
        groups.set(communityName, []);
      }
      groups.get(communityName)!.push(node.name);
    }

    const communities: ICommunity[] = [];
    let idx = 1;

    for (const [name, symbols] of groups.entries()) {
      // Calculate internal edge density
      const symSet = new Set(symbols);
      const internalEdges = allEdges.filter(
        (e) => symSet.has(this.getNodeName(e.sourceId)) && symSet.has(this.getNodeName(e.targetId))
      );
      const maxPossible = symbols.length > 1 ? (symbols.length * (symbols.length - 1)) / 2 : 1;
      const densityScore = Math.min(1.0, Math.round((internalEdges.length / maxPossible) * 100) / 100);

      communities.push({
        id: `comm_${idx++}`,
        name: name.toUpperCase(),
        nodeCount: symbols.length,
        symbols: symbols.slice(0, 10),
        densityScore,
      });
    }

    return communities.sort((a, b) => b.nodeCount - a.nodeCount);
  }

  /**
   * Generates a GraphRAG-ready Markdown report of the codebase.
   */
  public generateGraphReport(): string {
    const nodes = this.db.getAllNodes();
    const edges = this.db.getEdges();
    const godNodes = this.detectGodNodes(2);
    const communities = this.detectCommunities();
    const cycles = this.detectCircularDependencies();

    return `# CortexForge Knowledge Graph Report

- **Total Symbols Indexed**: ${nodes.length}
- **Total Dependency Edges**: ${edges.length}
- **Architectural Hubs (God Nodes)**: ${godNodes.length}
- **Functional Communities**: ${communities.length}
- **Circular Loops Detected**: ${cycles.length}

## Top Architectural God Nodes
${godNodes.slice(0, 5).map((g) => `- **${g.name}** (${g.type}): ${g.totalConnections} connections [Criticality: ${g.criticalityScore}]`).join('\n')}

## Functional Communities
${communities.map((c) => `- **${c.name}** (${c.nodeCount} symbols, density: ${c.densityScore})`).join('\n')}

## Circular Dependency Audit
${cycles.length === 0 ? 'No circular import cycles detected.' : cycles.map((c) => `- Cycle: ${c.cycle.join(' -> ')}`).join('\n')}
`;
  }
}
