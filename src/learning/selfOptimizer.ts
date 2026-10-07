import { CortexDatabase } from '../storage/database.ts';

export interface ILearningPattern {
  id: string;
  type: 'TOOL_WASTE' | 'FAILED_COMMAND' | 'WRONG_SELECTION' | 'OVERENGINEERING';
  frequency: number;
  description: string;
  recommendedAdjustment: string;
  confidence: number;
  applied: boolean;
}

export class SelfOptimizer {
  private db: CortexDatabase;
  private customPatterns: Array<{ trigger: string; fix: string; success: boolean }> = [];

  constructor(db?: CortexDatabase) {
    this.db = db || new CortexDatabase();
  }

  public recordPattern(pattern: { trigger: string; fix: string; success: boolean }): void {
    this.customPatterns.push(pattern);
  }

  public getPatterns(): Array<{ trigger: string; fix: string; success: boolean }> {
    return [...this.customPatterns];
  }

  public analyzeRecentPatterns(): ILearningPattern[] {
    const events = this.db.getRecentEvents(100);
    const patterns: ILearningPattern[] = [];

    const failedEvents = events.filter((e) => e.status === 'error');
    if (failedEvents.length > 5) {
      patterns.push({
        id: 'pat_high_error_rate',
        type: 'FAILED_COMMAND',
        frequency: failedEvents.length,
        description: `Observed ${failedEvents.length} failed command executions in recent session.`,
        recommendedAdjustment: 'Escalate task classification to Level 4 and enable mandatory pre-command safety checks.',
        confidence: 0.85,
        applied: false,
      });
    }

    const totalTokensSaved = events.reduce((sum, e) => sum + (e.tokensSaved || 0), 0);
    if (totalTokensSaved > 10000) {
      patterns.push({
        id: 'pat_effective_compression',
        type: 'TOOL_WASTE',
        frequency: 1,
        description: `Compression has successfully eliminated ~${totalTokensSaved} tokens of tool waste.`,
        recommendedAdjustment: 'Retain current BALANCED compression intensity policy.',
        confidence: 0.95,
        applied: true,
      });
    }

    return patterns;
  }

  public applyLearning(patternId: string): { success: boolean; message: string } {
    const patterns = this.analyzeRecentPatterns();
    const target = patterns.find((p) => p.id === patternId);

    if (!target) {
      return { success: false, message: `Pattern '${patternId}' not found.` };
    }

    target.applied = true;
    return {
      success: true,
      message: `Applied policy adjustment: ${target.recommendedAdjustment}`,
    };
  }
}
