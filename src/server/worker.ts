import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CortexDatabase } from '../storage/database.ts';
import { MemoryEngine } from '../memory/memoryEngine.ts';
import { CodeGraph } from '../graph/codeGraph.ts';
import { ContextCompressor } from '../compression/compressor.ts';
import { ArchitectureModel } from '../architecture/archModel.ts';
import { ArchitectureVisualizer } from '../architecture/visualizer.ts';
import { AgentDetector } from '../detector/agentDetector.ts';
import { renderDashboardHtml } from './dashboardHtml.ts';

export class CortexWorker {
  private server?: http.Server;
  private port: number;
  private pidFilePath: string;
  private db: CortexDatabase;
  private memory: MemoryEngine;
  private graph: CodeGraph;
  private compressor: ContextCompressor;
  private arch: ArchitectureModel;

  constructor(port = 49210, baseDir = process.cwd()) {
    this.port = port;
    this.pidFilePath = path.join(baseDir, '.cortexforge', 'worker.pid');
    this.db = new CortexDatabase(baseDir);
    this.memory = new MemoryEngine(this.db, baseDir);
    this.graph = new CodeGraph(this.db, baseDir);
    this.compressor = new ContextCompressor(this.db);
    this.arch = new ArchitectureModel(this.db);
  }

  public async start(): Promise<void> {
    if (this.isAlreadyRunning()) {
      console.info(`[CortexWorker] Worker is already active on port ${this.port}.`);
      return;
    }

    this.server = http.createServer((req, res) => {
      const url = req.url || '/';

      // 1. Interactive Web Dashboard
      if (url === '/' || url === '/dashboard') {
        const detection = AgentDetector.detect();
        const archModel = this.arch.inferArchitecture();
        const mermaid = ArchitectureVisualizer.generateMermaid(archModel);
        const godNodes = this.graph.detectGodNodes(2).slice(0, 6);
        const recentMemories = this.memory.getAllActive().slice(-5).reverse();

        const html = renderDashboardHtml({
          projectName: detection.projectProfile.projectName,
          hostAgent: detection.hostAgent,
          uptime: process.uptime(),
          memoriesCount: this.db.getAllMemories().length,
          graphNodesCount: this.db.getAllNodes().length,
          godNodes,
          recentMemories,
          mermaidGraph: mermaid,
        });

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      // 2. Health check
      if (url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'ACTIVE',
            uptime: process.uptime(),
            port: this.port,
            memories: this.db.getAllMemories().length,
            graphNodes: this.db.getAllNodes().length,
          })
        );
        return;
      }

      // 3. API Status
      if (url === '/api/status' || url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            worker: 'ACTIVE',
            project: this.db.getProject(),
            memoriesCount: this.db.getAllMemories().length,
            graphNodesCount: this.db.getAllNodes().length,
          })
        );
        return;
      }

      // 4. API God Nodes
      if (url === '/api/god-nodes') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.graph.detectGodNodes(1)));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });

    return new Promise((resolve, reject) => {
      this.server?.listen(this.port, '127.0.0.1', () => {
        fs.writeFileSync(this.pidFilePath, process.pid.toString(), 'utf-8');
        console.info(`[CortexWorker] CortexForge worker active at http://127.0.0.1:${this.port}`);
        console.info(`[CortexWorker] Dashboard available at http://127.0.0.1:${this.port}/dashboard`);
        resolve();
      });

      this.server?.on('error', (err) => {
        reject(err);
      });
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
    }
    if (fs.existsSync(this.pidFilePath)) {
      try {
        fs.unlinkSync(this.pidFilePath);
      } catch {}
    }
  }

  public isAlreadyRunning(): boolean {
    if (!fs.existsSync(this.pidFilePath)) return false;
    try {
      const pid = parseInt(fs.readFileSync(this.pidFilePath, 'utf-8').trim(), 10);
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
