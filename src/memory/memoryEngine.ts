import * as crypto from 'node:crypto';
import type { IMemoryRecord } from '../storage/schemas.ts';
import type { CortexDatabase } from '../storage/database.ts';
import { ConflictResolver } from './conflictResolver.ts';
import { BM25Engine } from './bm25.ts';

export class MemoryEngine {
  private db: CortexDatabase;
  private projectRoot: string;
  private bm25: BM25Engine;
  private isIndexBuilt: boolean = false;

  constructor(db: CortexDatabase, projectRoot: string = process.cwd()) {
    this.db = db;
    this.projectRoot = projectRoot;
    this.bm25 = new BM25Engine();
  }

  private buildIndex(): void {
    this.bm25.clear();
    const memories = this.db.getAllMemories().filter((m) => !m.isDeprecated);
    for (const mem of memories) {
      this.bm25.addDocument({
        id: mem.id,
        text: `${mem.topic} ${mem.summary} ${mem.details ?? ''} ${mem.relatedSymbols.join(' ')}`,
        metadata: { memory: mem },
      });
    }
    this.isIndexBuilt = true;
  }

  public recordDecision(
    topic: string,
    summary: string,
    details?: string,
    relatedSymbols: string[] = [],
    evidence: 'FACT' | 'HISTORICAL' | 'INFERENCE' | 'UNCERTAIN' = 'FACT',
    importance: number = 0.8
  ): IMemoryRecord {
    const id = `mem_${crypto.createHash('sha256').update(`${topic}_${summary}`).digest('hex').slice(0, 8)}`;
    const project = this.db.getProject();
    const projectId = project ? project.projectId : 'proj_default';

    const candidate: IMemoryRecord = {
      id,
      projectId,
      topic,
      summary,
      details,
      evidence,
      importance: Math.max(0.1, Math.min(1.0, importance)),
      utilityScore: 1.0,
      recency: Date.now(),
      accessCount: 1,
      relatedSymbols,
    };

    const existing = this.db.getAllMemories();
    const resolution = ConflictResolver.resolve(candidate, existing, this.projectRoot);

    if (resolution.action === 'UPDATE' && resolution.targetId) {
      const old = this.db.getMemory(resolution.targetId);
      if (old) {
        candidate.id = old.id;
        candidate.accessCount = old.accessCount + 1;
        candidate.utilityScore = old.utilityScore + 0.5;
      }
      this.db.upsertMemory(candidate);
    } else if (resolution.action === 'INSERT') {
      this.db.upsertMemory(candidate);
    }

    // Refresh BM25 index on new write
    this.buildIndex();
    return candidate;
  }

  public query(queryText: string, minScore: number = 0.2, limit: number = 10): IMemoryRecord[] {
    if (!this.isIndexBuilt) {
      this.buildIndex();
    }

    // 1. BM25 Semantic-Lexical Ranking
    const bm25Results = this.bm25.search(queryText, limit * 2);
    const bm25ScoreMap = new Map<string, number>();
    for (const r of bm25Results) {
      bm25ScoreMap.set(r.id, r.score);
    }

    // 2. Hybrid Re-ranking with Reciprocal Rank Fusion & Recency
    const memories = this.db.getAllMemories().filter((m) => !m.isDeprecated);
    const scored = memories.map((mem) => {
      const bm25Score = bm25ScoreMap.get(mem.id) || 0;
      
      // Normalized BM25 score (bounded)
      const normalizedBm25 = Math.min(1.0, bm25Score / 5.0);

      const recencyDays = Math.max(0, (Date.now() - mem.recency) / (1000 * 60 * 60 * 24));
      const recencyFactor = Math.max(0.1, 1.0 / (1.0 + recencyDays * 0.05));

      // Composite score: 45% BM25 relevance, 25% importance, 20% utility, 10% recency
      const compositeScore =
        normalizedBm25 * 0.45 +
        mem.importance * 0.25 +
        Math.min(1.0, mem.utilityScore * 0.2) +
        recencyFactor * 0.1;

      return { mem, score: compositeScore, bm25Score };
    });

    const results = scored
      .filter((s) => s.score >= minScore || s.bm25Score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => {
        s.mem.accessCount++;
        this.db.upsertMemory(s.mem);
        return s.mem;
      });

    return results;
  }

  public getAllActive(): IMemoryRecord[] {
    return this.db.getAllMemories().filter((m) => !m.isDeprecated);
  }
}
