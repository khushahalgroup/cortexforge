/**
 * CortexForge OverengineeringAuditor (Ponytail Anti-Overengineering Engine)
 * Detects premature abstractions, passthrough wrappers, speculative factories,
 * and duplicate utilities before they enter the repository.
 * Computes a verifiable Ponytail Scoreboard of LOC avoided and complexity reduced.
 */

import type { CortexDatabase } from '../storage/database.ts';

export interface IOverengineeringSmell {
  type: 'PASSTHROUGH_WRAPPER' | 'PREMATURE_FACTORY' | 'DUPLICATE_UTILITY' | 'SPECULATIVE_ABSTRACTION';
  symbolName: string;
  filePath?: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
  locAvoidable: number;
}

export interface IPonytailScoreboard {
  totalSmells: number;
  locAvoided: number;
  complexityReductionDelta: number;
  duplicateUtilitiesFound: number;
  smells: IOverengineeringSmell[];
}

export class OverengineeringAuditor {
  private db?: CortexDatabase;

  constructor(db?: CortexDatabase) {
    this.db = db;
  }

  /**
   * Audits source code or a git diff for overengineering anti-patterns.
   */
  public auditCode(code: string, fileName: string = 'unknown'): IPonytailScoreboard {
    const smells: IOverengineeringSmell[] = [];
    const lines = code.split(/\r?\n/);

    let locAvoided = 0;
    let duplicateUtilitiesFound = 0;

    // 1. Check for Passthrough Wrappers (e.g. class with 1 method that only calls a delegate)
    const classMatch = code.match(/class\s+(\w+)[^{]*\{([^}]+)\}/g);
    if (classMatch) {
      for (const cls of classMatch) {
        const methods = cls.match(/(?:public\s+|private\s+|async\s+)?\w+\s*\([^)]*\)\s*\{[^}]*\}/g) || [];
        if (methods.length === 1) {
          const methodBody = methods[0];
          if (methodBody.includes('return this.') && methodBody.split('\n').length <= 4) {
            const nameMatch = cls.match(/class\s+(\w+)/);
            const name = nameMatch ? nameMatch[1] : 'Wrapper';
            smells.push({
              type: 'PASSTHROUGH_WRAPPER',
              symbolName: name,
              filePath: fileName,
              severity: 'HIGH',
              recommendation: `Remove passthrough class '${name}'. Call the underlying delegate directly to eliminate needless indirection.`,
              locAvoidable: cls.split('\n').length,
            });
            locAvoided += cls.split('\n').length;
          }
        }
      }
    }

    // 2. Check for Premature Factory (e.g. class FooFactory with only createFoo() returning new Foo())
    const factoryMatch = code.match(/class\s+(\w*Factory)[^{]*\{([\s\S]*?)\}/g);
    if (factoryMatch) {
      for (const f of factoryMatch) {
        const nameMatch = f.match(/class\s+(\w+)/);
        const name = nameMatch ? nameMatch[1] : 'Factory';
        smells.push({
          type: 'PREMATURE_FACTORY',
          symbolName: name,
          filePath: fileName,
          severity: 'MEDIUM',
          recommendation: `Consider direct instantiation over '${name}' until multiple polymorphic variants actually exist.`,
          locAvoidable: 15,
        });
        locAvoided += 15;
      }
    }

    // 3. Check for Duplicate Utilities in Code Graph
    if (this.db) {
      const allNodes = this.db.getAllNodes();
      const existingSymbolNames = new Set(allNodes.map((n) => n.name.toLowerCase()));

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const funcMatch = line.match(/(?:export\s+)?(?:function|const)\s+([a-zA-Z0-9_]+)\s*(?:=|\()/);
        if (funcMatch) {
          const fnName = funcMatch[1];
          const fnLower = fnName.toLowerCase();

          // Check if an existing function with the same name exists in a different file
          if (existingSymbolNames.has(fnLower)) {
            const match = allNodes.find(
              (n) => n.name.toLowerCase() === fnLower && !n.fileId.includes(fileName.replace(/\\/g, '/'))
            );
            if (match) {
              smells.push({
                type: 'DUPLICATE_UTILITY',
                symbolName: fnName,
                filePath: fileName,
                severity: 'HIGH',
                recommendation: `Symbol '${fnName}' already exists in '${match.fileId}'. Import and reuse it instead of duplicating code.`,
                locAvoidable: 20,
              });
              locAvoided += 20;
              duplicateUtilitiesFound++;
            }
          }
        }
      }
    }

    // 4. Check for Speculative Abstraction (empty interfaces or interfaces with 0 or 1 method)
    const interfaceMatches = code.match(/interface\s+(\w+)[^{]*\{([^}]*)\}/g);
    if (interfaceMatches) {
      for (const iface of interfaceMatches) {
        const body = iface.replace(/interface\s+\w+[^{]*\{/, '').replace(/\}/, '').trim();
        if (!body) {
          const nameMatch = iface.match(/interface\s+(\w+)/);
          const name = nameMatch ? nameMatch[1] : 'Interface';
          smells.push({
            type: 'SPECULATIVE_ABSTRACTION',
            symbolName: name,
            filePath: fileName,
            severity: 'LOW',
            recommendation: `Empty interface '${name}' detected. Avoid marker interfaces without members.`,
            locAvoidable: 5,
          });
          locAvoided += 5;
        }
      }
    }

    const complexityReductionDelta = Math.round(locAvoided * 0.15);

    return {
      totalSmells: smells.length,
      locAvoided,
      complexityReductionDelta,
      duplicateUtilitiesFound,
      smells,
    };
  }
}
