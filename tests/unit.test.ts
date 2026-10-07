import { AgentDetector } from '../src/detector/agentDetector.ts';
import { TaskClassifier } from '../src/context/taskClassifier.ts';
import { ContextPlanner } from '../src/context/contextPlanner.ts';
import { CortexDatabase } from '../src/storage/database.ts';
import { ContextCompressor } from '../src/compression/compressor.ts';
import { MemoryEngine } from '../src/memory/memoryEngine.ts';
import { BM25Engine } from '../src/memory/bm25.ts';
import { CodeGraph } from '../src/graph/codeGraph.ts';
import { AstParser } from '../src/graph/astParser.ts';
import { ArchitectureModel } from '../src/architecture/archModel.ts';
import { ArchitectureVisualizer } from '../src/architecture/visualizer.ts';
import { DiffOptimizer } from '../src/minimalism/diffOptimizer.ts';
import { SecretRedactor } from '../src/security/secretRedactor.ts';
import { AgentInterceptor } from '../src/interceptor/agentInterceptor.ts';
import { renderDashboardHtml } from '../src/server/dashboardHtml.ts';
import { BenchmarkSuite } from '../src/benchmark/benchmarkSuite.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n--- Running CortexForge Enhanced Unit Test Suite ---\n');

  // Test 1: Agent & Project Detector
  const detection = AgentDetector.detect(process.cwd());
  assert(detection.projectProfile.projectId.startsWith('proj_'), 'Project detection generates valid projectId');
  assert(detection.capabilities.mcp === true, 'Host capability negotiation reports MCP active');

  // Test 2: Task Classifier
  const bugTask = TaskClassifier.classify('Fix crash in PaymentService charge function');
  assert(bugTask.category === 'BUG_FIX', 'Classifier accurately identifies BUG_FIX');
  const archTask = TaskClassifier.classify('What is the architecture of the payment queue?');
  assert(archTask.category === 'ARCHITECTURE', 'Classifier accurately identifies ARCHITECTURE');

  // Test 3: Context Budget Planner
  const planner = new ContextPlanner();
  const plan = planner.plan(bugTask, [
    { id: '1', type: 'symbol', title: 'PaymentService', content: '...', relevanceScore: 0.95, estimatedTokens: 500 },
    { id: '2', type: 'file', title: 'Readme', content: '...', relevanceScore: 0.2, estimatedTokens: 2000 },
  ], 10000);
  assert(plan.mustHave.length === 1, 'Context planner includes high-relevance items in mustHave');
  assert(plan.headroomPercentage >= 25, 'Context planner preserves at least 25% safety headroom');

  // Test 4: Database & Reversible Compression
  const db = new CortexDatabase();
  const compressor = new ContextCompressor(db);
  const rawLog = 'npm test\nPASS test1\nFAIL test2\n' + 'Downloading package...\n'.repeat(20);
  const compResult = compressor.compress(rawLog, 'log');
  assert(compResult.savedPercentage > 0, 'Compressor reduces noisy terminal output');
  assert(compResult.recoveryHandle.startsWith('CF_REC_'), 'Compressor emits valid recovery handle');

  const recovery = compressor.recover(compResult.recoveryHandle);
  assert(recovery.success === true, 'Recovery engine successfully locates handle');
  assert(recovery.payload === rawLog, 'Recovery engine reconstructs byte-exact original payload');

  // Test 5: BM25 Lexical & Semantic Engine
  const bm25 = new BM25Engine();
  bm25.addDocument({ id: 'doc1', text: 'Authentication handler using JWT bearer tokens and refresh cookies' });
  bm25.addDocument({ id: 'doc2', text: 'PostgreSQL database connection pool and migration scripts' });
  const bm25Results = bm25.search('JWT authentication tokens');
  assert(bm25Results.length > 0 && bm25Results[0].id === 'doc1', 'BM25 ranks JWT authentication document as top match');

  // Test 6: Memory Quality & Hybrid BM25 Retrieval
  const memory = new MemoryEngine(db);
  const mem1 = memory.recordDecision('DatabaseStrategy', 'Use PostgreSQL for ACID compliance', 'Switched from MySQL');
  assert(mem1.id.startsWith('mem_'), 'Memory engine generates valid memory ID');
  const queried = memory.query('PostgreSQL ACID');
  assert(queried.length > 0, 'Memory query retrieves stored decision via BM25 hybrid ranking');

  // Test 7: Polyglot AST Parsing (Python, Go, Rust, TSX)
  const pyCode = 'class OrderProcessor:\n    def execute(self):\n        pass';
  const pyParsed = AstParser.parseFile('processor.py', pyCode);
  assert(pyParsed.nodes.some((n) => n.name === 'OrderProcessor'), 'Polyglot AST parser extracts Python class');

  const goCode = 'package main\ntype Server struct {}\nfunc StartServer() {}';
  const goParsed = AstParser.parseFile('main.go', goCode);
  assert(goParsed.nodes.some((n) => n.name === 'Server'), 'Polyglot AST parser extracts Go struct');

  // Test 8: Code Knowledge Graph, God Nodes & Cycles
  const graph = new CodeGraph(db);
  graph.indexFile('src/detector/agentDetector.ts');
  graph.indexFile('src/storage/database.ts');
  const symQuery = graph.querySymbol('AgentDetector');
  assert(symQuery.nodes.length > 0, 'Code graph successfully indexes and finds AgentDetector symbol');

  const godNodes = graph.detectGodNodes(1);
  assert(Array.isArray(godNodes), 'God node detector returns architectural hubs');

  // Test 9: Architecture Inference & Mermaid Visualizer
  const archModel = new ArchitectureModel(db);
  const inferred = archModel.inferArchitecture();
  assert(inferred.boundaries.length > 0, 'Architecture model infers system boundaries');
  const mermaidDiagram = ArchitectureVisualizer.generateMermaid(inferred);
  assert(mermaidDiagram.startsWith('graph TD'), 'Visualizer generates valid Mermaid diagram');

  // Test 10: Minimalism Diff Optimizer with Complexity
  const diffOpt = new DiffOptimizer(db);
  const complexDiff = `
    +++ b/src/utils/calc.ts
    + const AgentDetector = () => true;
    + if (a) { if (b) { while (c) { for (let i = 0; i < 10; i++) { try { x(); } catch (e) {} } } } }
  `;
  const diffReview = diffOpt.reviewDiff(complexDiff);
  assert(diffReview.passed === false, 'Diff optimizer flags duplicate symbol declaration');
  assert(diffReview.cyclomaticComplexityDelta > 0, 'Diff optimizer accurately measures cyclomatic complexity delta');

  // Test 11: Secret Redactor & Safety Gate
  const secretText = 'Use API key: sk-abcdef1234567890abcdef1234567890 and push to prod';
  const redacted = SecretRedactor.redact(secretText);
  assert(redacted.cleanText.includes('<redacted:OPENAI_API_KEY>'), 'Secret redactor masks OpenAI API keys');
  
  const dangerousCmd = SecretRedactor.checkCommandSafety('rm -rf /');
  assert(dangerousCmd.safe === false, 'Safety gate catches recursive root deletion');

  // Test 12: Autonomous Agent Interceptor (Pre & Post Tool)
  const interceptor = new AgentInterceptor(db);
  const preCheck = interceptor.onPreToolExecution('run_command', { CommandLine: 'rm -rf /' });
  assert(preCheck.allowed === false, 'Interceptor pre-tool safety gate blocks destructive command');

  const noisyBuildLog = 'npm run build\nError: build failed in auth.ts\n' + 'Downloading dependencies...\n'.repeat(25) + 'Build failed with 1 error.';
  const postCheck = interceptor.onPostToolExecution('run_command', noisyBuildLog);
  assert(postCheck.diagnostics !== undefined, 'Interceptor post-tool diagnoses failure and attaches root cause');
  assert(postCheck.tokensSaved > 0, 'Interceptor post-tool compresses noisy logs and saves tokens');

  // Test 13: Dashboard HTML Generation
  const dashboardHtml = renderDashboardHtml({
    projectName: 'CortexForge',
    hostAgent: 'Test Harness',
    uptime: 120,
    memoriesCount: 5,
    graphNodesCount: 25,
    godNodes: [{ name: 'AgentDetector', totalConnections: 8, type: 'class' }],
    recentMemories: [{ topic: 'Auth', summary: 'Use JWT', evidence: 'FACT', importance: 0.9 }],
    mermaidGraph: 'graph TD\n  A --> B',
  });
  assert(dashboardHtml.includes('CortexForge Intelligence Dashboard'), 'Dashboard HTML generator renders valid template');

  // Test 14: Benchmark Suite
  const benchResults = await BenchmarkSuite.runSuite();
  assert(benchResults.length === 5, 'Benchmark suite evaluates all 5 configurations');

  console.log(`\nResults: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
