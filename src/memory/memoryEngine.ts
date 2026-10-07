import * as crypto from 'node:crypto';
import type { IMemoryRecord } from '../storage/schemas.ts';
import type { CortexDatabase } from '../storage/database.ts';
import { ConflictResolver } from './conflictResolver.ts';

export class MemoryEngine {
  private db: CortexDatabase;
  private projectRoot: string;

  constructor(db: CortexDatabase, projectRoot: string = process.cwd()) {
    this.db = db;
    this.projectRoot = projectRoot;
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

    return candidate;
  }

  public query(queryText: string, minScore: number = 0.2, limit: number = 10): IMemoryRecord[] {
    const memories = this.db.getAllMemories().filter((m) => !m.isDeprecated);
    const queryTokens = queryText.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    const scored = memories.map((mem) => {
      let matchCount = 0;
      const haystack = `${mem.topic} ${mem.summary} ${mem.details ?? ''} ${mem.relatedSymbols.join(' ')}`.toLowerCase();

      for (const token of queryTokens) {
        if (haystack.includes(token)) {
          matchCount++;
        }
      }

      const matchRatio = queryTokens.length > 0 ? matchCount / queryTokens.length : 0;
      
      const recencyDays = Math.max(0, (Date.now() - mem.recency) / (1000 * 60 * 60 * 24));
      const recencyFactor = Math.max(0.1, 1.0 / (1.0 + recencyDays * 0.1));

      const finalScore =
        mem.importance * 0.4 +
        matchRatio * 0.3 +
        Math.min(1.0, mem.utilityScore * 0.2) +
        recencyFactor * 0.1;

      return { mem, score: finalScore };
    });

    const results = scored
      .filter((s) => s.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => {
        s.mem.accessCount++;
        this.db.upsertMemory(s.mem);
        return s.mem;
      });

    return results;
  }
}
