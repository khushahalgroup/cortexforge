import * as fs from 'node:fs';
import * as path from 'node:path';
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
import { SmartCrusher } from '../src/context/smartCrusher.ts';
import { CacheAligner } from '../src/context/cacheAligner.ts';
import { CodeFolder } from '../src/compression/codeFolder.ts';
import { ObservationExtractor } from '../src/memory/observationExtractor.ts';
import { OverengineeringAuditor } from '../src/minimalism/overengineeringAuditor.ts';
import { ArchitectureDrift } from '../src/architecture/archDrift.ts';
import { SelfOptimizer } from '../src/learning/selfOptimizer.ts';

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

export async function runComprehensiveTestSuite(): Promise<{ passed: number; failed: number }> {
  console.log('\n======================================================');
  console.log('   CORTEXFORGE COMPREHENSIVE 120+ TEST STRESS SUITE   ');
  console.log('======================================================\n');

  // -------------------------------------------------------------------------
  // SECTION 1: AgentDetector & Capabilities (Tests 1 - 8)
  // -------------------------------------------------------------------------
  const det1 = AgentDetector.detect(process.cwd());
  assert(det1.projectProfile.projectId.startsWith('proj_'), 'Test 1: AgentDetector generates valid project ID');
  assert(det1.capabilities.mcp === true, 'Test 2: Host capability negotiation reports MCP active');
  assert(typeof det1.supportStatus === 'string', 'Test 3: Support status is valid string');
  assert(Array.isArray(det1.suggestedOptimizations), 'Test 4: Optimization suggestions array is initialized');

  const detTmp = AgentDetector.detect(path.join(process.cwd(), 'src'));
  assert(detTmp.projectProfile.projectName.length > 0, 'Test 5: Subdirectory detection correctly identifies project');
  assert(detTmp.hostAgent.length > 0, 'Test 6: Host agent name is populated');
  assert(typeof detTmp.capabilities.hooks === 'boolean', 'Test 7: Capabilities hooks flag is boolean');
  assert(typeof detTmp.capabilities.statusline === 'boolean', 'Test 8: Capabilities statusline flag is boolean');

  // -------------------------------------------------------------------------
  // SECTION 2: TaskClassifier & Minimum Sufficient Context (Tests 9 - 16)
  // -------------------------------------------------------------------------
  const cBug = TaskClassifier.classify('TypeError: Cannot read properties of undefined in PaymentService');
  assert(cBug.category === 'BUG_FIX', 'Test 9: TaskClassifier accurately identifies BUG_FIX');
  assert(cBug.recommendedEscalationLevel >= 2, 'Test 10: Bug fix escalates to minimum Level 2');

  const cArch = TaskClassifier.classify('What is the high-level architecture and boundaries of the service?');
  assert(cArch.category === 'ARCHITECTURE', 'Test 11: TaskClassifier identifies ARCHITECTURE');
  assert(cArch.recommendedEscalationLevel >= 4, 'Test 12: Architecture escalates to Level 4+');

  const cRefactor = TaskClassifier.classify('Refactor user service to eliminate duplicate utility methods');
  assert(cRefactor.category === 'REFACTOR', 'Test 13: TaskClassifier identifies REFACTOR');

  const cFeature = TaskClassifier.classify('Create a new REST endpoint for user profile photo upload');
  assert(cFeature.category === 'FEATURE', 'Test 14: TaskClassifier identifies FEATURE');

  const cEmpty = TaskClassifier.classify('');
  assert(cEmpty.category === 'GENERAL', 'Test 15: TaskClassifier safely defaults to GENERAL on empty prompt');

  const cPunct = TaskClassifier.classify('??? !!! ...');
  assert(cPunct.recommendedEscalationLevel >= 1, 'Test 16: Punctuation prompt assigns valid escalation level');

  // -------------------------------------------------------------------------
  // SECTION 3: ContextPlanner & Dynamic Headroom (Tests 17 - 24)
  // -------------------------------------------------------------------------
  const planner = new ContextPlanner();
  const plan1 = planner.plan(cBug, [
    { id: '1', type: 'symbol', title: 'PaymentService', content: '...', relevanceScore: 0.95, estimatedTokens: 400 },
    { id: '2', type: 'file', title: 'Docs', content: '...', relevanceScore: 0.1, estimatedTokens: 2000 },
  ], 8000);
  assert(plan1.mustHave.length === 1, 'Test 17: ContextPlanner prioritizes high-relevance candidates');
  assert(plan1.headroomPercentage >= 25, 'Test 18: ContextPlanner maintains minimum 25% safety headroom');
  assert(plan1.maxBudgetTokens === 8000, 'Test 19: Total budget matches ceiling parameter');
  assert(plan1.totalEstimatedTokens < plan1.maxBudgetTokens, 'Test 20: Allocated tokens strictly within budget');

  const largeCandidates = Array.from({ length: 50 }, (_, i) => ({
    id: `c_${i}`,
    type: 'symbol' as const,
    title: `Symbol_${i}`,
    content: 'code...',
    relevanceScore: 0.5 + (i % 5) * 0.1,
    estimatedTokens: 300,
  }));
  const planLarge = planner.plan(cFeature, largeCandidates, 5000);
  assert(planLarge.totalEstimatedTokens <= 5000 * 0.75, 'Test 21: ContextPlanner prunes candidates to protect headroom');
  assert(planLarge.mustHave.length > 0, 'Test 22: Must-have list is non-empty under heavy candidate load');

  const hrStatus = ContextPlanner.calculateHeadroom(12000, 16000);
  assert(hrStatus.headroomPercentage === 25, 'Test 23: Real-time headroom percentage correctly computed');
  assert(hrStatus.status === 'WARNING', 'Test 24: Headroom at 25% reports WARNING status');

  // -------------------------------------------------------------------------
  // SECTION 4: SmartCrusher JSON Matrix Compression (Tests 25 - 36)
  // -------------------------------------------------------------------------
  const emptyArrRes = SmartCrusher.crush([]);
  assert(emptyArrRes.crushedString === '[]', 'Test 25: SmartCrusher safely preserves empty array []');
  assert(emptyArrRes.isCrushed === false, 'Test 26: Empty array is not marked as crushed');

  const primArrRes = SmartCrusher.crush([1, 2, 3, 4, 5]);
  assert(primArrRes.crushedString === '[1,2,3,4,5]', 'Test 27: SmartCrusher safely preserves primitive array');

  const uniformData = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    username: `user_${i}`,
    role: i % 2 === 0 ? 'admin' : 'member',
    active: true,
  }));
  const uniformCrushed = SmartCrusher.crush(uniformData);
  assert(uniformCrushed.isCrushed === true, 'Test 28: SmartCrusher successfully crushes uniform object array');
  assert(uniformCrushed.savedPercentage > 20, 'Test 29: SmartCrusher achieves > 20% token reduction');

  const uncrushedUniform = SmartCrusher.uncrush(uniformCrushed.crushedString);
  assert(uncrushedUniform.length === 30, 'Test 30: SmartCrusher uncrushes exact row count');
  assert(uncrushedUniform[0].username === 'user_0', 'Test 31: SmartCrusher uncrush preserves exact values');
  assert(uncrushedUniform[29].role === 'member', 'Test 32: SmartCrusher uncrush preserves last row values');

  const heterogenousData = [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', department: 'Engineering' },
    { id: 3, name: 'Charlie', role: 'viewer', department: 'Sales' },
  ];
  const hetCrushed = SmartCrusher.crush(heterogenousData);
  const uncrushedHet = SmartCrusher.uncrush(hetCrushed.crushedString);
  assert(uncrushedHet.length === 3, 'Test 33: SmartCrusher handles heterogenous object schemas');
  assert(uncrushedHet[1].department === 'Engineering', 'Test 34: Heterogenous uncrush preserves distinct keys');

  const malformedCrushed = SmartCrusher.crush('{ bad json: true ');
  assert(malformedCrushed.isCrushed === false, 'Test 35: Malformed JSON string handled without throwing');

  const nonCrushedUncrush = SmartCrusher.uncrush({ test: 123 } as any);
  assert(nonCrushedUncrush.test === 123, 'Test 36: Uncrush passthrough on uncrushed objects');

  // -------------------------------------------------------------------------
  // SECTION 5: CacheAligner Prompt Cache Maximizer (Tests 37 - 44)
  // -------------------------------------------------------------------------
  const align1 = CacheAligner.align({
    systemInstructions: 'You are CortexForge.',
    projectProfile: { name: 'demo', lang: 'typescript' },
    stableMemories: [
      { id: 'm_2', topic: 'Payment', summary: 'Use Stripe' },
      { id: 'm_1', topic: 'Database', summary: 'Use Postgres' },
    ],
    codeSymbols: [
      { id: 's_b', name: 'Billing', type: 'class' },
      { id: 's_a', name: 'Auth', type: 'class' },
    ],
    currentTask: 'Check system health',
  });
  const align2 = CacheAligner.align({
    systemInstructions: 'You are CortexForge.',
    projectProfile: { lang: 'typescript', name: 'demo' }, // Shuffled key order
    stableMemories: [
      { id: 'm_1', topic: 'Database', summary: 'Use Postgres' },
      { id: 'm_2', topic: 'Payment', summary: 'Use Stripe' }, // Shuffled memories
    ],
    codeSymbols: [
      { id: 's_a', name: 'Auth', type: 'class' },
      { id: 's_b', name: 'Billing', type: 'class' }, // Shuffled symbols
    ],
    currentTask: 'Different task',
  });
  assert(align1.cachedPrefix === align2.cachedPrefix, 'Test 37: CacheAligner guarantees byte-identical static prefix');
  assert(align1.cacheHitEstimate > 0.4, 'Test 38: CacheAligner reports substantial cache hit estimate');
  assert(align1.cachedPrefix.includes('[m_1] Database: Use Postgres'), 'Test 39: Static prefix contains sorted memories');
  assert(align1.cachedPrefix.includes('[s_a] Auth (class)'), 'Test 40: Static prefix contains sorted symbols');

  const alignNullSafe = CacheAligner.align({
    systemInstructions: 'Direct test',
    projectProfile: null as any,
    stableMemories: null as any,
    codeSymbols: null as any,
    currentTask: 'Null safety check',
  });
  assert(typeof alignNullSafe.cachedPrefix === 'string', 'Test 41: CacheAligner handles null collections safely');
  assert(alignNullSafe.dynamicSuffix.includes('Null safety check'), 'Test 42: Dynamic suffix contains current task');
  assert(align1.fullPrompt.includes('CORTEXFORGE STABLE SYSTEM DIRECTIVE'), 'Test 43: Full prompt incorporates header');
  assert(align1.staticTokensEstimated > 0, 'Test 44: Static tokens estimate is strictly positive');

  // -------------------------------------------------------------------------
  // SECTION 6: CodeFolder Structural Folding & Outlines (Tests 45 - 56)
  // -------------------------------------------------------------------------
  const sampleTs = `
import { Config } from './config.ts';

export class OrderManager {
  public calculateTotal(items: any[]): number {
    let sum = 0;
    for (const item of items) {
      sum += item.price * item.quantity;
    }
    return sum;
  }

  public async processOrder(orderId: string): Promise<boolean> {
    console.log('Processing order ' + orderId);
    await new Promise((resolve) => setTimeout(resolve, 50));
    return true;
  }
}
`;
  const foldRes = CodeFolder.smartOutline(sampleTs);
  assert(foldRes.symbolsFound.includes('OrderManager'), 'Test 45: CodeFolder finds OrderManager class');
  assert(foldRes.symbolsFound.includes('calculateTotal'), 'Test 46: CodeFolder finds calculateTotal method');
  assert(foldRes.symbolsFound.includes('processOrder'), 'Test 47: CodeFolder finds processOrder method');
  assert(foldRes.tokensSavedPercentage > 20, 'Test 48: CodeFolder achieves substantial token savings');
  assert(foldRes.outlinedCode.includes('folded in calculateTotal'), 'Test 49: Outlined code contains fold marker for calculateTotal');
  assert(foldRes.outlinedCode.includes('folded in processOrder'), 'Test 50: Outlined code contains fold marker for processOrder');

  const unfoldTarget = CodeFolder.smartUnfold(sampleTs, 'calculateTotal');
  assert(unfoldTarget.includes('sum += item.price * item.quantity'), 'Test 51: smartUnfold preserves target implementation body');
  assert(unfoldTarget.includes('lines folded'), 'Test 52: smartUnfold keeps non-target methods folded');

  const multilineFunc = `
export function computeScore(
  base: number,
  multiplier: number
): number {
  const adjusted = base * multiplier;
  const bonus = adjusted > 100 ? 20 : 0;
  return adjusted + bonus;
}
`;
  const multiFold = CodeFolder.smartOutline(multilineFunc);
  assert(multiFold.outlinedCode.includes('folded in computeScore'), 'Test 53: CodeFolder folds multiline function signatures');

  const unclosedCode = `
function broken() {
  const a = 1;
  const b = 2;
`;
  const unclosedFold = CodeFolder.smartOutline(unclosedCode);
  assert(unclosedFold.outlinedCode.includes('folded in broken'), 'Test 54: CodeFolder handles EOF unclosed blocks cleanly');

  const emptyCodeFold = CodeFolder.smartOutline('');
  assert(emptyCodeFold.totalLines === 1 && emptyCodeFold.foldedLines === 0, 'Test 55: Empty code handled safely');

  const unfoldedMissing = CodeFolder.smartUnfold(sampleTs, 'NonExistentMethod');
  assert(typeof unfoldedMissing === 'string', 'Test 56: smartUnfold handles missing target safely');

  // -------------------------------------------------------------------------
  // SECTION 7: ObservationExtractor Automatic Synthesis (Tests 57 - 64)
  // -------------------------------------------------------------------------
  const obs1 = ObservationExtractor.extract('run_test', {}, 'PASS: All 24 test cases passed successfully. Fixed crash in UserSession.');
  assert(obs1 !== null, 'Test 57: ObservationExtractor distills passing bug fix');
  assert(obs1!.category === 'BUG_FIX', 'Test 58: Observation category is BUG_FIX');

  const ansiLog = '\u001b[32mPASS\u001b[0m: Fixed error in AuthService token refresh logic.';
  const obsAnsi = ObservationExtractor.extract('npm_test', {}, ansiLog);
  assert(obsAnsi !== null && !obsAnsi.summary.includes('\u001b['), 'Test 59: ObservationExtractor strips ANSI color codes');

  const obsDec = ObservationExtractor.extract('command', {}, 'Configured PostgreSQL database pool instead of SQLite for concurrent workers.');
  assert(obsDec !== null && obsDec.category === 'DECISION', 'Test 60: ObservationExtractor detects architectural decision');

  const obsDisc = ObservationExtractor.extract('command', {}, 'Worker listening on http://127.0.0.1:49210 with active routes.');
  assert(obsDisc !== null && obsDisc.category === 'DISCOVERY', 'Test 61: ObservationExtractor detects endpoint discovery');

  const obsConst = ObservationExtractor.extract('command', {}, 'Operation forbidden: Permission denied on /etc/passwd root files.');
  assert(obsConst !== null && obsConst.category === 'CONSTRAINT', 'Test 62: ObservationExtractor detects security constraint');

  const obsShort = ObservationExtractor.extract('cmd', {}, 'ok');
  assert(obsShort === null, 'Test 63: ObservationExtractor ignores short trivial outputs');

  const obsNull = ObservationExtractor.extract('cmd', {}, null as any);
  assert(obsNull === null, 'Test 64: ObservationExtractor handles null output safely');

  // -------------------------------------------------------------------------
  // SECTION 8: BM25Engine & MemoryEngine (Tests 65 - 76)
  // -------------------------------------------------------------------------
  const bm25 = new BM25Engine();
  bm25.addDocument({ id: 'd1', text: 'Stripe webhook payment processing idempotency keys' });
  bm25.addDocument({ id: 'd2', text: 'PostgreSQL connection pool max clients and idle timeout' });
  bm25.addDocument({ id: 'd3', text: 'Redis caching cluster session store' });

  const rPay = bm25.search('Stripe payment idempotency');
  assert(rPay.length > 0 && rPay[0].id === 'd1', 'Test 65: BM25 ranks top payment document first');

  const rDb = bm25.search('PostgreSQL connection pool');
  assert(rDb.length > 0 && rDb[0].id === 'd2', 'Test 66: BM25 ranks top database document first');

  bm25.addDocument({ id: 'd1', text: 'Updated Stripe webhook payment processing with signature verification' });
  assert(bm25.search('Stripe payment').length > 0, 'Test 67: BM25 idempotent document update succeeds');

  bm25.removeDocument('d3');
  assert(bm25.search('Redis cluster').length === 0, 'Test 68: BM25 document removal eliminates stale matches');

  const rStop = bm25.search('the and of in');
  assert(rStop.length === 0, 'Test 69: BM25 safely returns empty on stopword-only queries');

  const testDb = new CortexDatabase();
  const memEngine = new MemoryEngine(testDb);

  const memRec1 = memEngine.recordDecision(
    'GraphQL vs REST',
    'Chose REST with OpenAPI specification for predictable client SDK generation',
    'Avoids GraphQL N+1 problem',
    ['RestClient', 'OpenApiSpec'],
    'FACT',
    0.9
  );
  assert(memRec1.id.startsWith('mem_'), 'Test 70: MemoryEngine generates valid memory ID');

  const qRes = memEngine.query('OpenAPI REST client SDK', 0.1, 5);
  assert(qRes.length > 0, 'Test 71: MemoryEngine retrieves memory via hybrid query');
  assert(qRes[0].topic === 'GraphQL vs REST', 'Test 72: MemoryEngine query matches topic exactly');

  const briefing = memEngine.getSessionBriefing();
  assert(briefing.briefingSummary.includes('GraphQL vs REST'), 'Test 73: Session briefing includes recorded decision');

  const timeline = memEngine.getTimeline(10);
  assert(timeline.length > 0, 'Test 74: Timeline contains chronological decision entries');
  assert(timeline[0].evidence === 'FACT', 'Test 75: Timeline entry retains evidence tag');

  const qEmpty = memEngine.query('', 0.1, 5);
  assert(Array.isArray(qEmpty), 'Test 76: Empty memory query returns array safely');

  // -------------------------------------------------------------------------
  // SECTION 9: Polyglot AstParser (Tests 77 - 86)
  // -------------------------------------------------------------------------
  const tsContent = `
import { Logger } from './logger.ts';
import * as http from 'node:http';

export class PaymentGateway {
  charge(amount: number): boolean {
    return true;
  }
}

export function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2);
}
`;
  const tsParsed = AstParser.parseFile('src/billing/gateway.ts', tsContent);
  assert(tsParsed.nodes.some((n) => n.name === 'PaymentGateway'), 'Test 77: AstParser extracts TypeScript class');
  assert(tsParsed.nodes.some((n) => n.name === 'formatCurrency'), 'Test 78: AstParser extracts TypeScript function');
  assert(
    tsParsed.edges.some((e) => e.targetId === 'file_src/billing/logger.ts'),
    'Test 79: AstParser normalizes relative import path to src/billing/logger.ts'
  );

  const pyContent = `
class MachineLearningModel:
    def __init__(self, weights):
        self.weights = weights

    def predict(self, x):
        return x * 2

def train_model(data):
    return MachineLearningModel(42)
`;
  const pyParsed = AstParser.parseFile('ml/trainer.py', pyContent);
  assert(pyParsed.nodes.some((n) => n.name === 'MachineLearningModel'), 'Test 80: AstParser extracts Python class');
  assert(pyParsed.nodes.some((n) => n.name === 'train_model'), 'Test 81: AstParser extracts Python function');

  const goContent = `
package server

type Router struct {
    routes map[string]string
}

func NewRouter() *Router {
    return &Router{}
}
`;
  const goParsed = AstParser.parseFile('pkg/router.go', goContent);
  assert(goParsed.nodes.some((n) => n.name === 'Router'), 'Test 82: AstParser extracts Go struct');
  assert(goParsed.nodes.some((n) => n.name === 'NewRouter'), 'Test 83: AstParser extracts Go function');

  const rsContent = `
pub struct Account {
    pub id: u64,
}

pub fn create_account(id: u64) -> Account {
    Account { id }
}
`;
  const rsParsed = AstParser.parseFile('src/account.rs', rsContent);
  assert(rsParsed.nodes.some((n) => n.name === 'Account'), 'Test 84: AstParser extracts Rust struct');
  assert(rsParsed.nodes.some((n) => n.name === 'create_account'), 'Test 85: AstParser extracts Rust function');

  const sqlContent = `
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL
);
`;
  const sqlParsed = AstParser.parseFile('schema.sql', sqlContent);
  assert(sqlParsed.nodes.some((n) => n.name === 'users'), 'Test 86: AstParser extracts SQL table');

  // -------------------------------------------------------------------------
  // SECTION 10: CodeGraph, Shortest Path & Communities (Tests 87 - 96)
  // -------------------------------------------------------------------------
  const graph = new CodeGraph(testDb);
  testDb.upsertNode({ id: 'sym_A', fileId: 'file_a.ts', name: 'SymbolA', type: 'class', line: 1 });
  testDb.upsertNode({ id: 'sym_B', fileId: 'file_b.ts', name: 'SymbolB', type: 'class', line: 1 });
  testDb.upsertNode({ id: 'sym_C', fileId: 'file_c.ts', name: 'SymbolC', type: 'class', line: 1 });
  testDb.upsertNode({ id: 'sym_D', fileId: 'file_d.ts', name: 'SymbolD', type: 'class', line: 1 });

  testDb.addEdge({ sourceId: 'sym_A', targetId: 'sym_B', relationship: 'calls', evidenceLine: 5 });
  testDb.addEdge({ sourceId: 'sym_B', targetId: 'sym_C', relationship: 'calls', evidenceLine: 10 });

  const pathAC = graph.findShortestPath('SymbolA', 'SymbolC');
  assert(pathAC.found === true, 'Test 87: Shortest path finds connected multi-hop dependency');
  assert(pathAC.distance === 2, 'Test 88: Shortest path distance equals 2 hops');

  const pathAD = graph.findShortestPath('SymbolA', 'SymbolD');
  assert(pathAD.found === false, 'Test 89: Shortest path reports no path for disconnected symbols');

  const pathSame = graph.findShortestPath('SymbolA', 'SymbolA');
  assert(pathSame.found === true && pathSame.distance === 0, 'Test 90: Shortest path on identical symbol is 0 hops');

  const godNodes = graph.detectGodNodes(1);
  assert(godNodes.length > 0, 'Test 91: God nodes detector identifies high-degree symbols');

  const cycles = graph.detectCircularDependencies();
  assert(Array.isArray(cycles), 'Test 92: Circular dependency check returns array');

  const blastRadius = graph.getBlastRadius('sym_A');
  assert(blastRadius.includes('sym_A'), 'Test 93: Blast radius includes root symbol');

  const communities = graph.detectCommunities();
  assert(communities.length > 0, 'Test 94: Community clustering groups symbols into modules');
  assert(communities[0].densityScore >= 0, 'Test 95: Community density score is valid non-negative number');

  const qSym = graph.querySymbol('SymbolB');
  assert(qSym.nodes.length > 0, 'Test 96: Query symbol locates nodes successfully');

  // -------------------------------------------------------------------------
  // SECTION 11: Architecture Layer Drift (Tests 97 - 104)
  // -------------------------------------------------------------------------
  assert(ArchitectureDrift.classifyLayer('tests/unit.test.ts') === 'TEST', 'Test 97: Classifies test file into TEST layer');
  assert(ArchitectureDrift.classifyLayer('src/cli/commands.ts') === 'PRESENTATION', 'Test 98: Classifies cli file into PRESENTATION layer');
  assert(ArchitectureDrift.classifyLayer('src/context/contextPlanner.ts') === 'APPLICATION', 'Test 99: Classifies context file into APPLICATION layer');
  assert(ArchitectureDrift.classifyLayer('src/memory/memoryEngine.ts') === 'DOMAIN', 'Test 100: Classifies memory file into DOMAIN layer');
  assert(ArchitectureDrift.classifyLayer('src/storage/database.ts') === 'INFRASTRUCTURE', 'Test 101: Classifies database file into INFRASTRUCTURE layer');

  const driftAuditor = new ArchitectureDrift(testDb);
  const driftReport = driftAuditor.auditDrift();
  assert(typeof driftReport.driftScore === 'number', 'Test 102: Drift score is a valid number');
  assert(typeof driftReport.isCompliant === 'boolean', 'Test 103: Drift compliance is a boolean');
  assert(typeof driftReport.layerDistribution.TEST === 'number', 'Test 104: Drift layer distribution tracks TEST layer');

  // -------------------------------------------------------------------------
  // SECTION 12: Ponytail Anti-Overengineering & Minimalism (Tests 105 - 112)
  // -------------------------------------------------------------------------
  const auditor = new OverengineeringAuditor();

  const passthroughCode = `
class PassthroughClient {
  public execute(req: any): any {
    return this.realClient.execute(req);
  }
}
`;
  const auditPass = auditor.auditCode(passthroughCode, 'client.ts');
  assert(auditPass.smells.some((s) => s.type === 'PASSTHROUGH_WRAPPER'), 'Test 105: Flags passthrough wrapper class');

  const factoryCode = `
class OrderFactory {
  public createOrder(): Order {
    return new Order();
  }
}
`;
  const auditFactory = auditor.auditCode(factoryCode, 'factory.ts');
  assert(auditFactory.smells.some((s) => s.type === 'PREMATURE_FACTORY'), 'Test 106: Flags premature single-line factory');

  const emptyIfaceCode = `
interface EmptyMarker {
}
`;
  const auditIface = auditor.auditCode(emptyIfaceCode, 'marker.ts');
  assert(auditIface.smells.some((s) => s.type === 'SPECULATIVE_ABSTRACTION'), 'Test 107: Flags empty marker interface');

  const cleanCode = `
export class User {
  constructor(public id: string, public name: string) {}
}
`;
  const auditClean = auditor.auditCode(cleanCode, 'user.ts');
  assert(auditClean.totalSmells === 0, 'Test 108: Clean code triggers 0 overengineering smells');
  assert(auditClean.locAvoided === 0, 'Test 109: Clean code has 0 avoidable LOC');

  const diffOptimizer = new DiffOptimizer();
  const diffCheck = diffOptimizer.reviewGitDiff('--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n+const x = 1;');
  assert(typeof diffCheck.passed === 'boolean', 'Test 110: DiffOptimizer returns approval boolean');
  assert(typeof diffCheck.totalLocSavings === 'number', 'Test 111: DiffOptimizer tracks totalLocSavings');
  assert(typeof diffCheck.cyclomaticComplexityDelta === 'number', 'Test 112: DiffOptimizer tracks complexity delta');

  // -------------------------------------------------------------------------
  // SECTION 13: Caveman Reversible Compression & Scorecard (Tests 113 - 118)
  // -------------------------------------------------------------------------
  const compressor = new ContextCompressor(testDb);
  const logContent = 'INFO starting service\n' + 'DEBUG heartbeat ping\n'.repeat(40) + 'ERROR disk full';
  const cRes = compressor.compress(logContent, 'log', 'ULTRA');
  assert(cRes.savedPercentage > 40, 'Test 113: ULTRA compression achieves > 40% reduction on repetitive logs');
  assert(cRes.recoveryHandle.startsWith('CF_REC_'), 'Test 114: Emits valid CF_REC_ recovery handle');

  const recRes = compressor.recover(cRes.recoveryHandle);
  assert(recRes.success === true, 'Test 115: Recovery engine successfully recovers payload');
  assert(recRes.payload === logContent, 'Test 116: Reconstructed payload matches original byte-for-byte');

  const recMissing = compressor.recover('CF_REC_UNKNOWN');
  assert(recMissing.success === false, 'Test 117: Missing recovery handle fails gracefully');

  const scorecard = compressor.getCaveScorecard();
  assert(scorecard.totalCompressions >= 1, 'Test 118: Scorecard tracks total compressions count');

  // -------------------------------------------------------------------------
  // SECTION 14: AgentInterceptor, Security & SelfOptimizer (Tests 119 - 124)
  // -------------------------------------------------------------------------
  const redactor = new SecretRedactor();
  const rawSecret = 'api_key = "sk-proj-abc123456789012345678901234567890"';
  const redacted = redactor.redact(rawSecret);
  assert(redacted.cleanText.includes('<redacted:OPENAI_API_KEY>'), 'Test 119: SecretRedactor masks OpenAI API keys');

  const safeCheck = redactor.checkCommandSafety('rm -rf /');
  assert(safeCheck.safe === false, 'Test 120: Interceptor safety gate blocks recursive root deletion');

  const interceptor = new AgentInterceptor();
  const preRes = interceptor.beforeToolExecution('run_command', { command: 'git status' });
  assert(preRes.proceed === true, 'Test 121: Interceptor allows safe read-only commands');

  const postRes = interceptor.afterToolExecution('run_command', {}, 'ReferenceError: foo is not defined\n    at bar (index.ts:1:1)');
  assert(postRes.diagnosticReport !== undefined, 'Test 122: Post-tool hook automatically extracts root cause');

  const selfOpt = new SelfOptimizer();
  selfOpt.recordPattern({
    trigger: 'high_token_drift',
    fix: 'apply_smart_crusher',
    success: true,
  });
  const patterns = selfOpt.getPatterns();
  assert(patterns.length >= 1, 'Test 123: SelfOptimizer records self-improvement pattern');

  const vis = new ArchitectureVisualizer();
  const archModel = new ArchitectureModel(testDb);
  const mDiagram = vis.generateMermaidDiagram(archModel.inferArchitecture());
  assert(mDiagram.startsWith('graph TD'), 'Test 124: Visualizer generates valid Mermaid diagram');

  console.log('\n------------------------------------------------------');
  console.log(`Results: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests.`);
  console.log('------------------------------------------------------\n');

  return { passed, failed };
}

if (process.argv[1]?.endsWith('stress_and_edge_cases.test.ts') || process.argv[1]?.endsWith('stress_and_edge_cases.test.js')) {
  runComprehensiveTestSuite().then(({ failed }) => {
    if (failed > 0) {
      process.exit(1);
    }
  });
}
