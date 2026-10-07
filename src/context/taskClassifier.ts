export type TaskCategory =
  | 'BUG_FIX'
  | 'FEATURE'
  | 'REFACTOR'
  | 'ARCHITECTURE'
  | 'PERFORMANCE'
  | 'SECURITY'
  | 'TEST_FAILURE'
  | 'DEPENDENCY'
  | 'MIGRATION'
  | 'GENERAL';

export interface ITaskClassification {
  category: TaskCategory;
  confidence: number;
  retrievalPriority: {
    stackTraces: boolean;
    callGraph: boolean;
    tests: boolean;
    historicalDecisions: boolean;
    architectureBoundaries: boolean;
    blastRadius: boolean;
    securityBoundaries: boolean;
  };
  recommendedEscalationLevel: number; // 0 to 5
}

export class TaskClassifier {
  public static classify(prompt: string): ITaskClassification {
    const lower = prompt.toLowerCase();

    // 1. Bug Fix / Test Failure
    if (
      lower.includes('error') ||
      lower.includes('fail') ||
      lower.includes('bug') ||
      lower.includes('crash') ||
      lower.includes('exception') ||
      lower.includes('stack trace') ||
      lower.includes('fix')
    ) {
      const isTest = lower.includes('test') || lower.includes('spec') || lower.includes('jest') || lower.includes('vitest');
      return {
        category: isTest ? 'TEST_FAILURE' : 'BUG_FIX',
        confidence: 0.9,
        retrievalPriority: {
          stackTraces: true,
          callGraph: true,
          tests: true,
          historicalDecisions: true,
          architectureBoundaries: false,
          blastRadius: false,
          securityBoundaries: false,
        },
        recommendedEscalationLevel: 2,
      };
    }

    // 2. Architecture / Design Question
    if (
      lower.includes('architecture') ||
      lower.includes('why do we') ||
      lower.includes('system design') ||
      lower.includes('dataflow') ||
      lower.includes('diagram') ||
      lower.includes('boundary') ||
      lower.includes('adr')
    ) {
      return {
        category: 'ARCHITECTURE',
        confidence: 0.88,
        retrievalPriority: {
          stackTraces: false,
          callGraph: false,
          tests: false,
          historicalDecisions: true,
          architectureBoundaries: true,
          blastRadius: false,
          securityBoundaries: false,
        },
        recommendedEscalationLevel: 4,
      };
    }

    // 3. Refactor
    if (
      lower.includes('refactor') ||
      lower.includes('rename') ||
      lower.includes('restructure') ||
      lower.includes('clean up') ||
      lower.includes('extract class')
    ) {
      return {
        category: 'REFACTOR',
        confidence: 0.85,
        retrievalPriority: {
          stackTraces: false,
          callGraph: true,
          tests: true,
          historicalDecisions: false,
          architectureBoundaries: false,
          blastRadius: true,
          securityBoundaries: false,
        },
        recommendedEscalationLevel: 3,
      };
    }

    // 4. Security
    if (
      lower.includes('auth') ||
      lower.includes('jwt') ||
      lower.includes('secret') ||
      lower.includes('permission') ||
      lower.includes('cve') ||
      lower.includes('sanitiz') ||
      lower.includes('vulnerability')
    ) {
      return {
        category: 'SECURITY',
        confidence: 0.92,
        retrievalPriority: {
          stackTraces: false,
          callGraph: true,
          tests: true,
          historicalDecisions: true,
          architectureBoundaries: true,
          blastRadius: true,
          securityBoundaries: true,
        },
        recommendedEscalationLevel: 5,
      };
    }

    // 5. Performance
    if (
      lower.includes('perf') ||
      lower.includes('slow') ||
      lower.includes('optimize') ||
      lower.includes('fps') ||
      lower.includes('latency') ||
      lower.includes('memory leak')
    ) {
      return {
        category: 'PERFORMANCE',
        confidence: 0.86,
        retrievalPriority: {
          stackTraces: true,
          callGraph: true,
          tests: true,
          historicalDecisions: true,
          architectureBoundaries: false,
          blastRadius: false,
          securityBoundaries: false,
        },
        recommendedEscalationLevel: 3,
      };
    }

    // 6. Feature Implementation (Default active coding task)
    if (
      lower.includes('implement') ||
      lower.includes('add') ||
      lower.includes('create') ||
      lower.includes('build') ||
      lower.includes('support')
    ) {
      return {
        category: 'FEATURE',
        confidence: 0.8,
        retrievalPriority: {
          stackTraces: false,
          callGraph: true,
          tests: true,
          historicalDecisions: true,
          architectureBoundaries: true,
          blastRadius: true,
          securityBoundaries: false,
        },
        recommendedEscalationLevel: 2,
      };
    }

    // 7. General / Direct Question
    return {
      category: 'GENERAL',
      confidence: 0.5,
      retrievalPriority: {
        stackTraces: false,
        callGraph: false,
        tests: false,
        historicalDecisions: false,
        architectureBoundaries: false,
        blastRadius: false,
        securityBoundaries: false,
      },
      recommendedEscalationLevel: 1,
    };
  }
}
