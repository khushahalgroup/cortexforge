import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IGraphNode, IGraphEdge } from '../storage/schemas.ts';
import type { CortexDatabase } from '../storage/database.ts';
import { AstParser } from './astParser.ts';

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
    } catch (err) {
      console.warn(`[CodeGraph] Failed to index file ${relPath}:`, err);
    }
  }

  public scanDirectory(dirPath: string = this.projectRoot, maxFiles: number = 300): void {
    const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'build', '.cortexforge', '.next']);
    const allowedExtensions = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs']);

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
          const ext = path.extname(entry.name);
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
}
