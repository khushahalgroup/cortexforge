/**
 * CortexForge ObservationExtractor (Automatic Memory Extraction)
 * Analyzes developer commands, tool executions, and file modifications
 * to automatically synthesize engineering memories, architectural decisions,
 * and bug resolutions without requiring manual user prompting.
 */

export interface IObservation {
  topic: string;
  summary: string;
  details: string;
  category: 'BUG_FIX' | 'DECISION' | 'CONSTRAINT' | 'DISCOVERY';
  evidence: 'FACT' | 'HISTORICAL';
  importance: number;
  relatedSymbols: string[];
}

export class ObservationExtractor {
  /**
   * Scans a tool action and its output to automatically distill lasting observations.
   */
  public static extract(toolName: string, input: any, output: string): IObservation | null {
    if (!output || typeof output !== 'string' || output.length < 20) {
      return null;
    }

    const cleanOutput = output.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
    const outputLower = cleanOutput.toLowerCase();

    // 1. Detect Bug Fix / Resolution
    if (
      (outputLower.includes('fixed') || outputLower.includes('resolved') || outputLower.includes('pass')) &&
      (outputLower.includes('error') || outputLower.includes('bug') || outputLower.includes('fail') || outputLower.includes('crash') || outputLower.includes('issue') || outputLower.includes('fix'))
    ) {
      const match = cleanOutput.match(/(?:fixed|resolved|passing)\s+([^.\n]+)/i);
      const summary = match ? match[1].trim() : 'Resolved test failure or runtime bug';
      return {
        topic: 'Bug Resolution',
        summary: `Fixed issue: ${summary}`,
        details: cleanOutput.slice(0, 300),
        category: 'BUG_FIX',
        evidence: 'FACT',
        importance: 0.9,
        relatedSymbols: this.extractSymbols(cleanOutput),
      };
    }

    // 2. Detect Architectural Decision or Configuration
    if (
      outputLower.includes('configured') ||
      outputLower.includes('migrated to') ||
      outputLower.includes('switched to') ||
      outputLower.includes('decided to') ||
      outputLower.includes('using') && outputLower.includes('instead of')
    ) {
      return {
        topic: 'Architectural Decision',
        summary: output.slice(0, 120).trim(),
        details: output.slice(0, 400),
        category: 'DECISION',
        evidence: 'FACT',
        importance: 0.85,
        relatedSymbols: this.extractSymbols(output),
      };
    }

    // 3. Detect Environmental or Security Constraint
    if (
      outputLower.includes('forbidden') ||
      outputLower.includes('blocked') ||
      outputLower.includes('must not') ||
      outputLower.includes('required env') ||
      outputLower.includes('permission denied')
    ) {
      return {
        topic: 'Operational Constraint',
        summary: output.slice(0, 120).trim(),
        details: output.slice(0, 350),
        category: 'CONSTRAINT',
        evidence: 'FACT',
        importance: 0.95,
        relatedSymbols: [],
      };
    }

    // 4. Detect Port / Endpoint / Service Discovery
    if (outputLower.includes('listening on') || outputLower.includes('active at http') || outputLower.includes('port')) {
      const urlMatch = output.match(/http:\/\/[^\s]+/i);
      const url = urlMatch ? urlMatch[0] : 'service endpoint';
      return {
        topic: 'Service Endpoint Discovery',
        summary: `Discovered active service at ${url}`,
        details: output.slice(0, 250),
        category: 'DISCOVERY',
        evidence: 'FACT',
        importance: 0.8,
        relatedSymbols: [],
      };
    }

    return null;
  }

  private static extractSymbols(text: string): string[] {
    const symbolMatches = text.match(/[A-Z][a-zA-Z0-9]{3,}(?:\.[a-zA-Z0-9]+)?/g) || [];
    const unique = Array.from(new Set(symbolMatches));
    return unique.slice(0, 5);
  }
}
