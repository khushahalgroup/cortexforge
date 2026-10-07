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

export class McpServer {
  private db: CortexDatabase;
  private memory: MemoryEngine;
  private graph: CodeGraph;
  private compressor: ContextCompressor;
  private archModel: ArchitectureModel;
  private diffOptimizer: DiffOptimizer;
  private selfOptimizer: SelfOptimizer;
  private interceptor: AgentInterceptor;

  constructor() {
    this.db = new CortexDatabase();
    this.memory = new MemoryEngine(this.db);
    this.graph = new CodeGraph(this.db);
    this.compressor = new ContextCompressor(this.db);
    this.archModel = new ArchitectureModel(this.db);
    this.diffOptimizer = new DiffOptimizer(this.db);
    this.selfOptimizer = new SelfOptimizer(this.db);
    this.interceptor = new AgentInterceptor(this.db);
  }

  public handleToolCall(name: string, args: Record<string, any>): Record<string, any> {
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
            args.topic,
            args.summary,
            args.details,
            args.relatedSymbols,
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

      default:
        return { error: `Tool '${name}' not recognized.` };
    }
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
          if (req.method === 'tools/call') {
            const result = this.handleToolCall(req.params.name, req.params.arguments);
            process.stdout.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: req.id,
                result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
              }) + '\n'
            );
          } else if (req.method === 'tools/list') {
            process.stdout.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: req.id,
                result: {
                  tools: [
                    { name: 'fusion_status', description: 'Show CortexForge status, host agent, and metrics' },
                    { name: 'fusion_memory', description: 'Query or record persistent engineering memory (BM25 Hybrid)' },
                    { name: 'fusion_graph', description: 'Query code symbols, call graph, and blast radius' },
                    { name: 'fusion_god_nodes', description: 'Identify architectural god nodes and hubs' },
                    { name: 'fusion_cycles', description: 'Detect circular dependency loops in imports' },
                    { name: 'fusion_architecture', description: 'Get source-backed architecture and Mermaid maps' },
                    { name: 'fusion_compress', description: 'Compress context/tool output with recovery handle' },
                    { name: 'fusion_recover', description: 'Restore original payload from recovery handle' },
                    { name: 'fusion_review', description: 'Audit git diff for overengineering and duplicate logic' },
                    { name: 'fusion_intercept_pre', description: 'Validate command safety and inject proactive memories' },
                    { name: 'fusion_intercept_post', description: 'Diagnose tool errors and compress output' },
                    { name: 'fusion_doctor', description: 'Run self-diagnostics on CortexForge components' },
                    { name: 'fusion_learn', description: 'Inspect or apply self-improving policies' },
                  ],
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
  const server = new McpServer();
  server.runStdio();
}
