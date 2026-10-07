import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IMemoryRecord } from '../storage/schemas.ts';

export class ConflictResolver {
  public static resolve(
    candidate: IMemoryRecord,
    existingMemories: IMemoryRecord[],
    projectRoot: string
  ): { action: 'INSERT' | 'UPDATE' | 'DEPRECATE_OLD' | 'DISCARD'; targetId?: string } {
    // 1. Check for exact duplicate or subset topic
    for (const old of existingMemories) {
      if (old.topic.toLowerCase() === candidate.topic.toLowerCase()) {
        // Same topic: Check if candidate updates or supersedes old
        if (candidate.recency > old.recency) {
          return { action: 'UPDATE', targetId: old.id };
        }
        return { action: 'DISCARD' };
      }
    }

    // 2. Check for contradictions with current codebase
    if (candidate.topic.toLowerCase().includes('database') || candidate.topic.toLowerCase().includes('store')) {
      const pkgPath = path.join(projectRoot, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          const deps = JSON.stringify({ ...pkg.dependencies, ...pkg.devDependencies }).toLowerCase();

          // If memory mentions Redis but redis is no longer in package.json
          if (candidate.summary.toLowerCase().includes('redis') && !deps.includes('redis') && !deps.includes('ioredis')) {
            candidate.isDeprecated = true;
            candidate.deprecationReason = 'Superseded: Redis dependency not found in current package.json.';
          }
        } catch {}
      }
    }

    return { action: 'INSERT' };
  }
}
