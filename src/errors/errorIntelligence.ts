import type { CortexDatabase } from '../storage/database.ts';
import type { IMemoryRecord } from '../storage/schemas.ts';

export interface IDiagnosticReport {
  category: 'COMPILATION' | 'RUNTIME' | 'ASSERTION' | 'PERMISSION' | 'NETWORK' | 'UNKNOWN';
  normalizedError: string;
  likelyRootCause: string;
  historicalFix?: IMemoryRecord;
  suggestedAction: string;
}

export class ErrorIntelligence {
  private db: CortexDatabase;

  constructor(db: CortexDatabase) {
    this.db = db;
  }

  public diagnose(rawError: string): IDiagnosticReport {
    let category: IDiagnosticReport['category'] = 'UNKNOWN';
    let normalizedError = rawError.split(/\r?\n/)[0] || 'Unknown error';
    let likelyRootCause = 'Unspecified exception.';
    let suggestedAction = 'Inspect surrounding code and verify arguments.';

    if (rawError.includes('TS2304') || rawError.includes('Cannot find name') || rawError.includes('ReferenceError')) {
      category = 'COMPILATION';
      likelyRootCause = 'Missing import or undeclared variable reference.';
      suggestedAction = 'Check imports at top of file or verify symbol spelling.';
    } else if (rawError.includes('TypeError: Cannot read properties of undefined') || rawError.includes('null is not an object')) {
      category = 'RUNTIME';
      likelyRootCause = 'Accessing property on an uninitialized or asynchronous variable.';
      suggestedAction = 'Add optional chaining (?.) or verify nullability check before access.';
    } else if (rawError.includes('AssertionError') || rawError.includes('expect(') || rawError.includes('FAIL')) {
      category = 'ASSERTION';
      likelyRootCause = 'Test assertion condition failed.';
      suggestedAction = 'Inspect test expectation against actual return payload.';
    } else if (rawError.includes('EACCES') || rawError.includes('Permission denied')) {
      category = 'PERMISSION';
      likelyRootCause = 'Insufficient file system or OS permissions.';
      suggestedAction = 'Verify file ownership or execute in elevated terminal context.';
    } else if (rawError.includes('ECONNREFUSED') || rawError.includes('ETIMEDOUT') || rawError.includes('fetch failed')) {
      category = 'NETWORK';
      likelyRootCause = 'Target service or port is unreachable.';
      suggestedAction = 'Verify local daemon/service is running and port is open.';
    }

    const memories = this.db.getAllMemories();
    const historicalFix = memories.find((m) => {
      const text = `${m.topic} ${m.summary} ${m.details ?? ''}`.toLowerCase();
      return text.includes(category.toLowerCase()) || text.includes('fix');
    });

    return {
      category,
      normalizedError,
      likelyRootCause,
      historicalFix,
      suggestedAction,
    };
  }
}
