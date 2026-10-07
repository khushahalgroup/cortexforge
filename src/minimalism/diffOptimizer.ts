import type { CortexDatabase } from '../storage/database.ts';

export interface IDiffReviewFinding {
  type: 'DUPLICATE_LOGIC' | 'OVERENGINEERING' | 'UNUSED_ABSTRACTION' | 'DEAD_CODE';
  file: string;
  message: string;
  recommendation: string;
  locSavingsEstimate: number;
}

export interface IDiffReviewResult {
  passed: boolean;
  totalLocSavings: number;
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

    for (const line of lines) {
      if (line.startsWith('+++ b/')) {
        currentFile = line.replace('+++ b/', '').trim();
      }

      if (line.startsWith('+') && !line.startsWith('+++')) {
        const addedFuncMatch = line.match(/(?:function|const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
        if (addedFuncMatch) {
          const newName = addedFuncMatch[1];
          const duplicate = existingNodes.find(
            (n) => n.name.toLowerCase() === newName.toLowerCase() && !n.id.includes(currentFile)
          );

          if (duplicate) {
            findings.push({
              type: 'DUPLICATE_LOGIC',
              file: currentFile,
              message: `Added function '${newName}' appears to duplicate existing symbol '${duplicate.id}'.`,
              recommendation: `Reuse '${duplicate.name}' from '${duplicate.fileId}' instead of creating a new duplicate helper.`,
              locSavingsEstimate: 15,
            });
          }
        }

        if (line.includes('class') && (line.includes('Manager') || line.includes('AbstractFactory') || line.includes('ProviderHelper'))) {
          findings.push({
            type: 'OVERENGINEERING',
            file: currentFile,
            message: `Added complex class abstraction detected in '${line.trim()}'.`,
            recommendation: 'Evaluate if a simple pure function can achieve the same goal without extra class boilerplate.',
            locSavingsEstimate: 30,
          });
        }
      }
    }

    const totalLocSavings = findings.reduce((acc, f) => acc + f.locSavingsEstimate, 0);
    const passed = findings.length === 0;

    let summaryMessage = 'CF REVIEW: Diff passed minimalism audit. Zero unnecessary abstractions detected.';
    if (!passed) {
      const topFinding = findings[0];
      summaryMessage = `CF REVIEW: ${topFinding.message}\nReuse: ${topFinding.recommendation}\nExpected diff reduction: ~${totalLocSavings} LOC.`;
    }

    return {
      passed,
      totalLocSavings,
      findings,
      summaryMessage,
    };
  }
}
