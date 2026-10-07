import type { CortexDatabase } from '../storage/database.ts';

export interface IDiffReviewFinding {
  type: 'DUPLICATE_LOGIC' | 'OVERENGINEERING' | 'UNUSED_ABSTRACTION' | 'DEAD_CODE' | 'COMPLEXITY_SPIKE';
  file: string;
  message: string;
  recommendation: string;
  locSavingsEstimate: number;
  surgicalReplacement?: string;
}

export interface IDiffReviewResult {
  passed: boolean;
  totalLocSavings: number;
  cyclomaticComplexityDelta: number;
  findings: IDiffReviewFinding[];
  summaryMessage: string;
}

export class DiffOptimizer {
  private db: CortexDatabase;

  constructor(db: CortexDatabase) {
    this.db = db;
  }

  public reviewDiff(diffText: string): IDiffReviewResult {
    const findings: IDiffReviewFinding[] = [];
    const existingNodes = this.db.getAllNodes();
    const lines = diffText.split(/\r?\n/);

    let currentFile = 'unknown';
    let addedComplexity = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (line.startsWith('+++ b/')) {
        currentFile = line.replace('+++ b/', '').trim();
      }

      if (line.startsWith('+') && !line.startsWith('+++')) {
        // Track cyclomatic complexity indicators
        if (/\b(if|for|while|case|catch)\b|\&\&|\|\||\?\.|\?\?/.test(line)) {
          addedComplexity++;
        }

        // 1. Detect duplicate functions / symbols
        const addedFuncMatch = line.match(/(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)?\s*=>|\()/);
        if (addedFuncMatch) {
          const newName = addedFuncMatch[1];
          const duplicate = existingNodes.find(
            (n) => n.name.toLowerCase() === newName.toLowerCase() && !n.id.includes(currentFile)
          );

          if (duplicate) {
            findings.push({
              type: 'DUPLICATE_LOGIC',
              file: currentFile,
              message: `Added function '${newName}' duplicates existing repository symbol '${duplicate.name}'.`,
              recommendation: `Import and reuse '${duplicate.name}' from '${duplicate.fileId}' instead of writing duplicate logic.`,
              locSavingsEstimate: 18,
              surgicalReplacement: `import { ${duplicate.name} } from '${duplicate.fileId.replace('file_', '')}';`,
            });
          }
        }

        // 2. Detect Overengineering: Unnecessary Factory or Manager abstractions
        if (line.includes('class') && (line.includes('Manager') || line.includes('Factory') || line.includes('Coordinator') || line.includes('ProviderHelper'))) {
          findings.push({
            type: 'OVERENGINEERING',
            file: currentFile,
            message: `Overengineering pattern detected in class declaration '${line}'.`,
            recommendation: 'Replace generic Manager/Factory with a lightweight standalone pure function.',
            locSavingsEstimate: 35,
            surgicalReplacement: `// Replace with pure functional export instead of stateful Manager class`,
          });
        }
      }
    }

    if (addedComplexity >= 4) {
      findings.push({
        type: 'COMPLEXITY_SPIKE',
        file: currentFile,
        message: `Diff introduces high cyclomatic complexity (+${addedComplexity} branching points).`,
        recommendation: 'Decompose complex conditional trees into guard clauses or table-driven dispatch.',
        locSavingsEstimate: 12,
      });
    }

    const totalLocSavings = findings.reduce((acc, f) => acc + f.locSavingsEstimate, 0);
    const passed = findings.length === 0;

    let summaryMessage = 'CF REVIEW: Diff passed minimalism audit. Zero redundant code detected.';
    if (!passed) {
      const topFinding = findings[0];
      summaryMessage = `CF REVIEW: ${topFinding.message}\nAction: ${topFinding.recommendation}\nExpected diff reduction: ~${totalLocSavings} LOC.`;
    }

    return {
      passed,
      totalLocSavings,
      cyclomaticComplexityDelta: addedComplexity,
      findings,
      summaryMessage,
    };
  }
}
