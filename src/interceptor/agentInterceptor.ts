import { CortexDatabase } from '../storage/database.ts';
import { MemoryEngine } from '../memory/memoryEngine.ts';
import { ContextCompressor } from '../compression/compressor.ts';
import { SecretRedactor } from '../security/secretRedactor.ts';
import { ErrorIntelligence } from '../errors/errorIntelligence.ts';
import { ObservationExtractor } from '../memory/observationExtractor.ts';

export interface IPreToolResult {
  allowed: boolean;
  sanitizedArgs: Record<string, unknown>;
  rejectionReason?: string;
  injectedContextPrompt?: string;
}

export interface IPostToolResult {
  optimizedOutput: string;
  tokensSaved: number;
  recoveryHandle?: string;
  diagnostics?: string;
}

export class AgentInterceptor {
  private db: CortexDatabase;
  private memory: MemoryEngine;
  private compressor: ContextCompressor;
  private errorIntel: ErrorIntelligence;

  constructor(db?: CortexDatabase) {
    this.db = db || new CortexDatabase();
    this.memory = new MemoryEngine(this.db);
    this.compressor = new ContextCompressor(this.db);
    this.errorIntel = new ErrorIntelligence(this.db);
  }

  public onPreToolExecution(toolName: string, args: Record<string, unknown>): IPreToolResult {
    // 1. Safety Gate Check for shell/command tools
    if (typeof args.CommandLine === 'string') {
      const safety = SecretRedactor.checkCommandSafety(args.CommandLine);
      if (!safety.safe) {
        return {
          allowed: false,
          sanitizedArgs: args,
          rejectionReason: `[CortexForge Safety Gate] Blocked destructive command: ${safety.reason}`,
        };
      }
    }

    // 2. Secret Redaction on inputs
    const sanitizedArgs: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
      if (typeof v === 'string') {
        sanitizedArgs[k] = SecretRedactor.redact(v).cleanText;
      } else {
        sanitizedArgs[k] = v;
      }
    }

    // 3. Proactive Memory Injection
    let injectedContextPrompt: string | undefined;
    const queryTerm = typeof args.CommandLine === 'string' ? args.CommandLine : toolName;
    const relatedMemories = this.memory.query(queryTerm, 0.4, 2);

    if (relatedMemories.length > 0) {
      injectedContextPrompt = `[CortexForge Proactive Memory]:\n` +
        relatedMemories.map((m) => `• [${m.evidence}] ${m.topic}: ${m.summary}`).join('\n');
    }

    return {
      allowed: true,
      sanitizedArgs,
      injectedContextPrompt,
    };
  }

  public onPostToolExecution(toolName: string, rawOutput: string): IPostToolResult {
    // 1. Error Detection & Diagnostic Generation
    let diagnostics: string | undefined;
    if (
      rawOutput.includes('Error') ||
      rawOutput.includes('FAIL') ||
      rawOutput.includes('exception') ||
      rawOutput.includes('failed')
    ) {
      const diag = this.errorIntel.diagnose(rawOutput);
      diagnostics = `[CortexForge Error Diagnostic]:\nCategory: ${diag.category}\nRoot Cause: ${diag.likelyRootCause}\nAction: ${diag.suggestedAction}`;
      if (diag.historicalFix) {
        diagnostics += `\nHistorical Fix: ${diag.historicalFix.summary}`;
      }
    }

    // 2. Reversible Context Compression
    const compResult = this.compressor.compress(rawOutput, 'auto', 'BALANCED');
    const tokensSaved = compResult.savedPercentage > 0
      ? Math.max(1, Math.ceil((compResult.originalBytes * (compResult.savedPercentage / 100)) / 4))
      : 0;

    // Record internal telemetry event
    this.db.recordEvent({
      id: `evt_${Date.now()}`,
      type: 'TOOL_COMPRESSION',
      timestamp: Date.now(),
      projectId: this.db.getProject()?.projectId || 'proj_default',
      sessionId: `sess_${Date.now()}`,
      source: toolName,
      payload: { toolName, savedPercentage: compResult.savedPercentage },
      durationMs: 2,
      tokensSaved,
      status: 'success',
    });

    // 3. Automatic Observation Extraction (Claude-Mem)
    try {
      const obs = ObservationExtractor.extract(toolName, {}, rawOutput);
      if (obs) {
        this.memory.recordDecision(
          obs.topic,
          obs.summary,
          obs.details,
          obs.relatedSymbols,
          obs.evidence,
          obs.importance
        );
      }
    } catch {}

    const finalOutput = diagnostics
      ? `${diagnostics}\n\n${compResult.compressed}`
      : compResult.compressed;

    return {
      optimizedOutput: finalOutput,
      tokensSaved,
      recoveryHandle: compResult.recoveryHandle,
      diagnostics,
    };
  }
}
