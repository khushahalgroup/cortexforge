import { AgentDetector } from '../src/detector/agentDetector.ts';
import { TaskClassifier } from '../src/context/taskClassifier.ts';
import { ContextPlanner } from '../src/context/contextPlanner.ts';
import { CortexDatabase } from '../src/storage/database.ts';
import { ContextCompressor } from '../src/compression/compressor.ts';
import { MemoryEngine } from '../src/memory/memoryEngine.ts';
import { CodeGraph } from '../src/graph/codeGraph.ts';
import { ArchitectureModel } from '../src/architecture/archModel.ts';
import { ArchitectureVisualizer } from '../src/architecture/visualizer.ts';
import { DiffOptimizer } from '../src/minimalism/diffOptimizer.ts';
import { SecretRedactor } from '../src/security/secretRedactor.ts';
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
  console.log('\n--- Running CortexForge Comprehensive Unit Test Suite ---\n');

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
  assert(plan.omitted.length === 1, 'Context planner prunes low-relevance items');
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

  // Test 5: Memory Quality & Conflict Resolution
  const memory = new MemoryEngine(db);
  const mem1 = memory.recordDecision('DatabaseStrategy', 'Use PostgreSQL for ACID compliance', 'Switched from MySQL');
  assert(mem1.id.startsWith('mem_'), 'Memory engine generates valid memory ID');
  const queried = memory.query('PostgreSQL ACID');
  assert(queried.length > 0, 'Memory query retrieves stored decision');

  // Test 6: Code Knowledge Graph
  const graph = new CodeGraph(db);
  graph.indexFile('src/detector/agentDetector.ts');
  const symQuery = graph.querySymbol('AgentDetector');
  assert(symQuery.nodes.length > 0, 'Code graph successfully indexes and finds AgentDetector symbol');

  // Test 7: Architecture Inference & Mermaid Visualizer
  const archModel = new ArchitectureModel(db);
  const inferred = archModel.inferArchitecture();
  assert(inferred.boundaries.length > 0, 'Architecture model infers system boundaries');
  const mermaidDiagram = ArchitectureVisualizer.generateMermaid(inferred);
  assert(mermaidDiagram.startsWith('graph TD'), 'Visualizer generates valid Mermaid diagram');

  // Test 8: Minimalism Diff Optimizer
  const diffOpt = new DiffOptimizer(db);
  const diffTest = '+ const AgentDetector = () => true;';
  const diffReview = diffOpt.reviewDiff(diffTest);
  assert(diffReview.passed === false, 'Diff optimizer flags duplicate symbol declaration');
  assert(diffReview.totalLocSavings > 0, 'Diff optimizer calculates potential LOC savings');

  // Test 9: Secret Redactor & Safety Gate
  const secretText = 'Use API key: sk-abcdef1234567890abcdef1234567890 and push to prod';
  const redacted = SecretRedactor.redact(secretText);
  assert(redacted.cleanText.includes('<redacted:OPENAI_API_KEY>'), 'Secret redactor masks OpenAI API keys');
  
  const dangerousCmd = SecretRedactor.checkCommandSafety('rm -rf /');
  assert(dangerousCmd.safe === false, 'Safety gate catches recursive root deletion');

  // Test 10: Benchmark Suite
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
