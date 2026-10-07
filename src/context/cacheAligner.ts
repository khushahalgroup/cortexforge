/**
 * CortexForge CacheAligner (Prompt Cache Maximizer)
 * Enforces strict prefix stability for Anthropic Claude, OpenAI, and Gemini
 * prompt caching engines. Maximizes provider-side prompt cache hit rates (> 90%)
 * by segregating static architectural context from volatile turn data.
 */

export interface IAlignedPrompt {
  cachedPrefix: string;
  dynamicSuffix: string;
  fullPrompt: string;
  cacheHitEstimate: number; // 0.0 - 1.0
  staticTokensEstimated: number;
  dynamicTokensEstimated: number;
}

export class CacheAligner {
  /**
   * Partitions an agent context into a deterministic, byte-stable prefix
   * and an ephemeral turn suffix.
   */
  public static align(params: {
    systemInstructions: string;
    projectProfile: Record<string, any>;
    stableMemories: Array<{ id: string; topic: string; summary: string }>;
    codeSymbols: Array<{ id: string; name: string; type: string }>;
    dynamicLogs?: string;
    currentTask: string;
  }): IAlignedPrompt {
    // 1. Build deterministic static prefix
    // Deterministically sort stable memories and code symbols by canonical ID
    const sortedMemories = [...(params.stableMemories || [])].sort((a, b) => a.id.localeCompare(b.id));
    const sortedSymbols = [...(params.codeSymbols || [])].sort((a, b) => a.id.localeCompare(b.id));
    const profile = params.projectProfile || {};

    const prefixParts: string[] = [
      '=== CORTEXFORGE STABLE SYSTEM DIRECTIVE ===',
      (params.systemInstructions || '').trim(),
      '',
      '=== PROJECT PROFILE (IMMUTABLE) ===',
      JSON.stringify(profile, Object.keys(profile).sort()),
      '',
      '=== CANONICAL ENGINEERING MEMORIES (SORTED) ===',
      ...sortedMemories.map((m) => `[${m.id}] ${m.topic}: ${m.summary}`),
      '',
      '=== VERIFIED CODE SYMBOLS (STABLE AST) ===',
      ...sortedSymbols.map((s) => `[${s.id}] ${s.name} (${s.type})`),
      '============================================',
    ];

    const cachedPrefix = prefixParts.join('\n');

    // 2. Build volatile dynamic suffix
    const suffixParts: string[] = [
      '=== ACTIVE CONTEXT & VOLATILE TELEMETRY ===',
      params.dynamicLogs ? `Recent Tool Logs:\n${params.dynamicLogs.trim()}\n` : '',
      `Current Task / Query:\n${params.currentTask.trim()}`,
      '============================================',
    ];

    const dynamicSuffix = suffixParts.filter(Boolean).join('\n');
    const fullPrompt = `${cachedPrefix}\n\n${dynamicSuffix}`;

    const staticBytes = Buffer.byteLength(cachedPrefix, 'utf-8');
    const dynamicBytes = Buffer.byteLength(dynamicSuffix, 'utf-8');
    const totalBytes = staticBytes + dynamicBytes;

    const staticTokens = Math.round(staticBytes / 4);
    const dynamicTokens = Math.round(dynamicBytes / 4);

    // Cache hit estimate: proportion of prompt that stays immutable
    const cacheHitEstimate = totalBytes > 0 ? parseFloat((staticBytes / totalBytes).toFixed(2)) : 0;

    return {
      cachedPrefix,
      dynamicSuffix,
      fullPrompt,
      cacheHitEstimate,
      staticTokensEstimated: staticTokens,
      dynamicTokensEstimated: dynamicTokens,
    };
  }
}
