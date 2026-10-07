import { CortexDatabase } from '../src/storage/database.ts';
import { MemoryEngine } from '../src/memory/memoryEngine.ts';
import { SelfOptimizer } from '../src/learning/selfOptimizer.ts';

const db = new CortexDatabase(process.cwd());
const mem = new MemoryEngine(db, process.cwd());
const opt = new SelfOptimizer(db);

const learnings = [
  {
    topic: 'Architecture Drift Audit Layers',
    summary: 'Explicitly initialize TEST layer in ArchitectureDrift layerDistribution map to prevent NaN values.',
    details: 'When auditProject analyzed test files, missing TEST key caused layerDistribution[TEST] to calculate NaN instead of a valid fraction.',
    symbols: ['ArchitectureDrift', 'src/architecture/archDrift.ts'],
    importance: 0.95
  },
  {
    topic: 'Polyglot AST Relative Path Normalization',
    summary: 'Normalize all relative module imports against source file directories in AstParser.',
    details: 'Relative imports like ./commands or ../storage must resolve against path.posix.dirname(filePath) to ensure dependency graph connectivity.',
    symbols: ['AstParser', 'src/graph/astParser.ts'],
    importance: 0.95
  },
  {
    topic: 'SmartCrusher Array Type Disambiguation',
    summary: 'Differentiate empty arrays and primitive arrays from uniform object records in SmartCrusher.',
    details: 'typeof [] is object, which previously coerced empty arrays [] into empty objects {}. Array.isArray checks must execute first.',
    symbols: ['SmartCrusher', 'src/context/smartCrusher.ts'],
    importance: 0.90
  },
  {
    topic: 'Cache Aligner Null Safety Defensiveness',
    summary: 'Safeguard CacheAligner against null or undefined projectProfile and symbol inputs.',
    details: 'Object.values / Object.entries threw TypeError on null. Added fallback empty records to guarantee 100% crash resilience.',
    symbols: ['CacheAligner', 'src/context/cacheAligner.ts'],
    importance: 0.85
  },
  {
    topic: 'Observation Memory Log Sanitization',
    summary: 'Strip ANSI terminal color escape codes before storing test command observations into memory.',
    details: 'ANSI color codes like \\u001b[32m polluted memory summaries and inflated token usage in context injections.',
    symbols: ['ObservationExtractor', 'src/memory/observationExtractor.ts'],
    importance: 0.85
  },
  {
    topic: 'BM25 Term Frequency Idempotency',
    summary: 'Ensure idempotent document updates in BM25 search engine by removing stale term counts.',
    details: 'Re-indexing updated memories inflated docFreqs and artificially skewed BM25 term weighting.',
    symbols: ['BM25Engine', 'src/memory/bm25.ts'],
    importance: 0.90
  },
  {
    topic: 'Hybrid Search Relevance Gating',
    summary: 'BM25 relevance score must gate keyword search candidates in MemoryEngine.',
    details: 'When a query has specific technical keywords, non-matching high-utility general memories must be filtered out rather than drowning out relevant results.',
    symbols: ['MemoryEngine', 'src/memory/memoryEngine.ts'],
    importance: 0.95
  },
  {
    topic: 'AST-Free Code Folding Parameter Parsing',
    summary: 'Support multiline function parameter lists and access modifiers in regex-based CodeFolder.',
    details: 'Signatures split across lines with closing parens and return types must not mistake return types as method names.',
    symbols: ['CodeFolder', 'src/compression/codeFolder.ts'],
    importance: 0.90
  },
  {
    topic: 'Minimalism Auditor Factory Thresholding',
    summary: 'Only flag trivial passthrough single-line factories as overengineering in OverengineeringAuditor.',
    details: 'Complex factory classes with multi-branch polymorphic logic must not be falsely flagged as overengineering.',
    symbols: ['OverengineeringAuditor', 'src/minimalism/overengineeringAuditor.ts'],
    importance: 0.85
  },
  {
    topic: 'Caveman Log Filter Exact Line Prefixing',
    summary: 'Strictly check line prefixes for stack traces in Caveman compression.',
    details: 'Checking l.includes("at ") matched ordinary English words like "heartbeat ping at timestamp". Replaced with l.trim().startsWith("at ").',
    symbols: ['Compressor', 'src/compression/compressor.ts'],
    importance: 0.90
  },
  {
    topic: 'Secret Masking Modern API Key Formats',
    summary: 'Support modern OpenAI project keys containing hyphens and underscores (sk-proj-...) in SecretRedactor.',
    details: 'Legacy regex only matched alphanumeric characters, leaking new sk-proj-* format keys.',
    symbols: ['SecretRedactor', 'src/security/secretRedactor.ts'],
    importance: 0.95
  }
];

for (const l of learnings) {
  mem.recordDecision(l.topic, l.summary, l.details, l.symbols, 'FACT', l.importance);
  opt.recordPattern({
    patternId: 'pat_' + l.topic.toLowerCase().replace(/\s+/g, '_'),
    category: 'ANTI_PATTERN_FIX',
    description: l.summary,
    frequency: 1,
    successRate: 1.0,
    tags: l.symbols
  });
}

console.log(`Successfully recorded ${learnings.length} lessons and self-optimization patterns into CortexForge memory.`);
