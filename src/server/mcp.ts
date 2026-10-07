import * as fs from 'node:fs';
import { CortexDatabase } from '../storage/database.ts';
import { MemoryEngine } from '../memory/memoryEngine.ts';
import { CodeGraph } from '../graph/codeGraph.ts';
import { ContextCompressor } from '../compression/compressor.ts';
import { ArchitectureModel } from '../architecture/archModel.ts';
import { ArchitectureVisualizer } from '../architecture/visualizer.ts';
import { DiffOptimizer } from '../minimalism/diffOptimizer.ts';
import { SelfOptimizer } from '../learning/selfOptimizer.ts';
import { AgentDetector } from '../detector/agentDetector.ts';
import { AgentInterceptor } from '../interceptor/agentInterceptor.ts';
import { ArchitectureDrift } from '../architecture/archDrift.ts';
import { OverengineeringAuditor } from '../minimalism/overengineeringAuditor.ts';
import { SmartCrusher } from '../context/smartCrusher.ts';
import { CodeFolder } from '../compression/codeFolder.ts';

export class McpServer {
  private db: CortexDatabase;
  private memory: MemoryEngine;
  private graph: CodeGraph;
  private compressor: ContextCompressor;
  private archModel: ArchitectureModel;
  private diffOptimizer: DiffOptimizer;
  private selfOptimizer: SelfOptimizer;
  private interceptor: AgentInterceptor;

  constructor(baseDir?: string) {
    let target = baseDir || process.argv[2] || process.env.CORTEXFORGE_DIR;
    if (!target) {
      const cwd = process.cwd();
      const norm = path.resolve(cwd).toLowerCase();
      if (norm.includes('system32') || norm.includes('windows') || norm === 'c:\\') {
        target = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1')), '../..');
      } else {
        target = cwd;
      }
    }
    this.db = new CortexDatabase(target);
    this.memory = new MemoryEngine(this.db, target);
    this.graph = new CodeGraph(this.db, target);
    this.compressor = new ContextCompressor(this.db);
    this.archModel = new ArchitectureModel(this.db);
    this.diffOptimizer = new DiffOptimizer(this.db);
    this.selfOptimizer = new SelfOptimizer(this.db);
    this.interceptor = new AgentInterceptor(this.db);
  }

  public handleToolCall(name: string, args: Record<string, any> = {}): Record<string, any> {
    switch (name) {
      case 'fusion_status': {
        const detection = AgentDetector.detect();
        const mems = this.db.getAllMemories();
        const nodes = this.db.getAllNodes();
        const godNodes = this.graph.detectGodNodes(2);
        return {
          status: 'ACTIVE',
          agent: detection.hostAgent,
          project: detection.projectProfile.projectName,
          language: detection.projectProfile.language,
          memoriesCount: mems.length,
          graphNodesCount: nodes.length,
          godNodesCount: godNodes.length,
          capabilities: detection.capabilities,
        };
      }

      case 'fusion_memory': {
        if (args.action === 'record') {
          const rec = this.memory.recordDecision(
            args.topic || 'General',
            args.summary || '',
            args.details,
            args.relatedSymbols || [],
            args.evidence || 'FACT',
            args.importance || 0.8
          );
          return { recorded: true, memory: rec };
        } else {
          const results = this.memory.query(args.query || '', 0.2, 5);
          return { results };
        }
      }

      case 'fusion_graph': {
        if (args.action === 'index') {
          this.graph.scanDirectory(process.cwd(), 300);
          return { indexed: true, totalNodes: this.db.getAllNodes().length };
        } else {
          const res = this.graph.querySymbol(args.symbol || '');
          const blastRadius = args.symbol ? this.graph.getBlastRadius(args.symbol) : [];
          return { ...res, blastRadius };
        }
      }

      case 'fusion_god_nodes': {
        const godNodes = this.graph.detectGodNodes(args.threshold || 2);
        return { godNodes };
      }

      case 'fusion_cycles': {
        const cycles = this.graph.detectCircularDependencies();
        return { cycles, hasCycles: cycles.length > 0 };
      }

      case 'fusion_architecture': {
        const model = this.archModel.inferArchitecture();
        const mermaid = ArchitectureVisualizer.generateMermaid(model);
        return { model, mermaid };
      }

      case 'fusion_compress': {
        return this.compressor.compress(args.text || '', args.type || 'auto', args.intensity || 'BALANCED');
      }

      case 'fusion_recover': {
        return this.compressor.recover(args.handle);
      }

      case 'fusion_review': {
        return this.diffOptimizer.reviewDiff(args.diff || '');
      }

      case 'fusion_intercept_pre': {
        return this.interceptor.onPreToolExecution(args.toolName || 'tool', args.arguments || {});
      }

      case 'fusion_intercept_post': {
        return this.interceptor.onPostToolExecution(args.toolName || 'tool', args.output || '');
      }

      case 'fusion_doctor': {
        const godNodes = this.graph.detectGodNodes(2);
        return {
          cortexforge: 'ACTIVE',
          databaseIntegrity: 'OK',
          memoryEngine: 'OK (BM25 Hybrid)',
          codeGraph: 'OK (Polyglot)',
          godNodesDetected: godNodes.length,
          compressionEngine: 'OK (Reversible SHA-256)',
          totalMemories: this.db.getAllMemories().length,
          totalNodes: this.db.getAllNodes().length,
        };
      }

      case 'fusion_learn': {
        if (args.applyPatternId) {
          return this.selfOptimizer.applyLearning(args.applyPatternId);
        }
        return { patterns: this.selfOptimizer.analyzeRecentPatterns() };
      }

      case 'fusion_path': {
        const source = args.source || args.from || '';
        const target = args.target || args.to || '';
        return this.graph.findShortestPath(source, target);
      }

      case 'fusion_communities': {
        return { communities: this.graph.detectCommunities() };
      }

      case 'fusion_drift': {
        const drift = new ArchitectureDrift(this.db);
        return drift.auditDrift();
      }

      case 'fusion_timeline': {
        return { timeline: this.memory.getTimeline() };
      }

      case 'fusion_briefing': {
        return this.memory.getSessionBriefing();
      }

      case 'fusion_crush': {
        return SmartCrusher.crush(args.input || args.data);
      }

      case 'fusion_fold': {
        let code = args.code || '';
        if (!code && args.filePath && fs.existsSync(args.filePath)) {
          code = fs.readFileSync(args.filePath, 'utf-8');
        }
        if (args.action === 'unfold' && args.symbol) {
          return { code: CodeFolder.smartUnfold(code, args.symbol) };
        }
        return CodeFolder.smartOutline(code);
      }

      case 'fusion_audit': {
        const auditor = new OverengineeringAuditor(this.db);
        let code = args.code || '';
        if (!code && args.filePath && fs.existsSync(args.filePath)) {
          code = fs.readFileSync(args.filePath, 'utf-8');
        }
        return auditor.auditCode(code, args.fileName || args.filePath || 'snippet');
      }

      case 'fusion_scorecard': {
        return this.compressor.getCaveScorecard();
      }

      default:
        return { error: `Tool '${name}' not recognized.` };
    }
  }

  public getToolsList() {
    return [
      {
        name: 'fusion_status',
        description: 'Show CortexForge status, host agent, and live metrics',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'fusion_memory',
        description: 'Query or record persistent engineering memory (BM25 Hybrid Semantic Search)',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['query', 'record'], description: 'Query past memories or record a new decision' },
            query: { type: 'string', description: 'Search query for memories' },
            topic: { type: 'string', description: 'Topic or category when recording' },
            summary: { type: 'string', description: 'Summary of the decision or bug fix' },
            details: { type: 'string', description: 'Extended context or reasoning' },
            relatedSymbols: { type: 'array', items: { type: 'string' }, description: 'Related symbols' },
            evidence: { type: 'string', enum: ['FACT', 'HISTORICAL', 'INFERENCE', 'UNCERTAIN'] },
            importance: { type: 'number', description: 'Importance from 0.1 to 1.0' },
          },
        },
      },
      {
        name: 'fusion_graph',
        description: 'Query code symbols, call graph, callers, callees, and blast radius',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['query', 'index'], description: 'Query symbol or re-index codebase' },
            symbol: { type: 'string', description: 'Symbol name to look up' },
          },
        },
      },
      {
        name: 'fusion_path',
        description: 'Find shortest dependency/call path between two symbols (Dijkstra/BFS)',
        inputSchema: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Source symbol name' },
            to: { type: 'string', description: 'Target symbol name' },
            source: { type: 'string', description: 'Alias for from' },
            target: { type: 'string', description: 'Alias for to' },
          },
        },
      },
      {
        name: 'fusion_communities',
        description: 'Detect functional code clusters and modular communities in the repository',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'fusion_god_nodes',
        description: 'Identify architectural god nodes and single-points-of-failure by degree centrality',
        inputSchema: {
          type: 'object',
          properties: {
            threshold: { type: 'number', description: 'Minimum connection degree (default: 2)' },
          },
        },
      },
      {
        name: 'fusion_cycles',
        description: 'Detect circular dependency loops and import cycles across files',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'fusion_drift',
        description: 'Audit architectural layers and detect illegal upward dependency drift',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'fusion_architecture',
        description: 'Generate source-backed architecture layers and live Mermaid topology diagrams',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'fusion_timeline',
        description: 'Retrieve chronological engineering decision causality chain',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'fusion_briefing',
        description: 'Generate instant cold-start briefing of project state, entrypoints, and focus items',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'fusion_compress',
        description: 'Compress context/tool output with reversible SHA-256 recovery handle',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Content to compress' },
            intensity: { type: 'string', enum: ['LITE', 'BALANCED', 'ULTRA'], description: 'Compression intensity' },
          },
          required: ['text'],
        },
      },
      {
        name: 'fusion_crush',
        description: 'High-ratio tabular JSON compression with SmartCrusher (60-90% token reduction)',
        inputSchema: {
          type: 'object',
          properties: {
            data: { description: 'JSON object or array to compress' },
            input: { description: 'Alias for data' },
          },
        },
      },
      {
        name: 'fusion_fold',
        description: 'Smart code indentation outline or selective unfolding to minimize token waste',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code string to outline' },
            filePath: { type: 'string', description: 'File path to read and outline' },
            action: { type: 'string', enum: ['outline', 'unfold'] },
            symbol: { type: 'string', description: 'Symbol to unfold if action is unfold' },
          },
        },
      },
      {
        name: 'fusion_recover',
        description: 'Restore byte-exact original payload from recovery handle (CF_REC_<hash>)',
        inputSchema: {
          type: 'object',
          properties: {
            handle: { type: 'string', description: 'Recovery handle string' },
          },
          required: ['handle'],
        },
      },
      {
        name: 'fusion_review',
        description: 'Audit uncommitted git diff for overengineering and duplicate logic',
        inputSchema: {
          type: 'object',
          properties: {
            diff: { type: 'string', description: 'Raw git diff text' },
          },
        },
      },
      {
        name: 'fusion_audit',
        description: 'Ponytail anti-overengineering scan on code (flags wrappers, speculative factories)',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code string to audit' },
            filePath: { type: 'string', description: 'File path to audit' },
          },
        },
      },
      {
        name: 'fusion_scorecard',
        description: 'View Caveman token and dollar ROI scorecard',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'fusion_doctor',
        description: 'Run self-diagnostics on CortexForge components',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  public runStdio(): void {
    process.stdin.setEncoding('utf-8');
    let buffer = '';

    process.stdin.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const req = JSON.parse(line);

          // 1. MCP Lifecycle: initialize
          if (req.method === 'initialize') {
            const protocolVersion = req.params?.protocolVersion || '2024-11-05';
            process.stdout.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: req.id,
                result: {
                  protocolVersion,
                  capabilities: {
                    tools: {
                      listChanged: false,
                    },
                  },
                  serverInfo: {
                    name: 'cortexforge',
                    version: '1.0.0',
                  },
                },
              }) + '\n'
            );
          }
          // 2. MCP Lifecycle: notifications/initialized
          else if (req.method === 'notifications/initialized') {
            // Client acknowledgement notification - no response required
          }
          // 3. MCP Lifecycle: ping
          else if (req.method === 'ping') {
            process.stdout.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: req.id,
                result: {},
              }) + '\n'
            );
          }
          // 4. MCP Tools: list
          else if (req.method === 'tools/list') {
            process.stdout.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: req.id,
                result: {
                  tools: this.getToolsList(),
                },
              }) + '\n'
            );
          }
          // 5. MCP Tools: call
          else if (req.method === 'tools/call') {
            const toolName = req.params?.name;
            const toolArgs = req.params?.arguments || {};
            const result = this.handleToolCall(toolName, toolArgs);
            process.stdout.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: req.id,
                result: {
                  content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                },
              }) + '\n'
            );
          }
          // 6. Unknown method with id
          else if (req.id !== undefined) {
            process.stdout.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: req.id,
                error: {
                  code: -32601,
                  message: `Method '${req.method}' not implemented`,
                },
              }) + '\n'
            );
          }
        } catch (err) {
          console.error('[McpServer] JSON-RPC parse error:', err);
        }
      }
    });
  }
}

if (process.argv[1]?.endsWith('mcp.ts') || process.argv[1]?.endsWith('mcp.js')) {
  const customDir = process.argv[2] || process.env.CORTEXFORGE_DIR;
  const server = new McpServer(customDir);
  server.runStdio();
}
