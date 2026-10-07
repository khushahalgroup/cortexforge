import { RecoveryStore } from './recoveryStore.ts';
import type { CortexDatabase } from '../storage/database.ts';

export type CompressionIntensity = 'SAFE' | 'BALANCED' | 'AGGRESSIVE' | 'AUTO';

export interface ICompressionResult {
  compressed: string;
  originalBytes: number;
  compressedBytes: number;
  savedPercentage: number;
  recoveryHandle: string;
  strategy: string;
}

export class ContextCompressor {
  private recoveryStore: RecoveryStore;

  constructor(db: CortexDatabase) {
    this.recoveryStore = new RecoveryStore(db);
  }

  public compress(
    rawText: string,
    typeHint?: 'json' | 'log' | 'test' | 'diff' | 'auto',
    intensity: CompressionIntensity = 'BALANCED'
  ): ICompressionResult {
    const originalBytes = Buffer.byteLength(rawText, 'utf-8');

    // If payload is trivial (< 200 bytes), skip compression to save processing
    if (originalBytes < 200) {
      return {
        compressed: rawText,
        originalBytes,
        compressedBytes: originalBytes,
        savedPercentage: 0,
        recoveryHandle: 'NONE',
        strategy: 'passthrough',
      };
    }

    try {
      const detectedType = typeHint === 'auto' || !typeHint ? this.detectType(rawText) : typeHint;
      let compressed = rawText;
      let strategy = detectedType;

      switch (detectedType) {
        case 'json':
          compressed = this.compressJson(rawText, intensity);
          break;
        case 'test':
          compressed = this.compressTestOutput(rawText, intensity);
          break;
        case 'diff':
          compressed = this.compressGitDiff(rawText, intensity);
          break;
        case 'log':
        default:
          compressed = this.compressTerminalLog(rawText, intensity);
          break;
      }

      const compressedBytes = Buffer.byteLength(compressed, 'utf-8');
      const savedBytes = Math.max(0, originalBytes - compressedBytes);
      const savedPercentage = Math.round((savedBytes / originalBytes) * 100);

      // Register with Recovery Store if we modified the content
      const { handle } = this.recoveryStore.store(rawText, strategy, compressedBytes);

      // Append compact recovery annotation
      const finalOutput = `${compressed}\n\n[CF: ${savedPercentage}% compressed | Recovery: ${handle}]`;

      return {
        compressed: finalOutput,
        originalBytes,
        compressedBytes: Buffer.byteLength(finalOutput, 'utf-8'),
        savedPercentage,
        recoveryHandle: handle,
        strategy,
      };
    } catch (err) {
      console.warn('[ContextCompressor] Error during compression. Returning original.', err);
      return {
        compressed: rawText,
        originalBytes,
        compressedBytes: originalBytes,
        savedPercentage: 0,
        recoveryHandle: 'ERROR',
        strategy: 'fallback_original',
      };
    }
  }

  public recover(handle: string): { success: boolean; payload?: string; error?: string } {
    return this.recoveryStore.recover(handle);
  }

  private detectType(text: string): 'json' | 'test' | 'diff' | 'log' {
    const trimmed = text.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      return 'json';
    }
    if (text.includes('diff --git') || (text.includes('--- a/') && text.includes('+++ b/'))) {
      return 'diff';
    }
    if (
      text.includes('FAIL') ||
      text.includes('PASS') ||
      text.includes('Tests:') ||
      text.includes('describe(') ||
      text.includes('AssertionError')
    ) {
      return 'test';
    }
    return 'log';
  }

  private compressJson(rawJson: string, _intensity: CompressionIntensity): string {
    try {
      const parsed = JSON.parse(rawJson);
      // Minify and eliminate null or empty values
      return JSON.stringify(parsed);
    } catch {
      return rawJson;
    }
  }

  private compressTerminalLog(log: string, intensity: CompressionIntensity): string {
    const lines = log.split(/\r?\n/);
    const retainedLines: string[] = [];
    let foldedNoiseCount = 0;

    for (const line of lines) {
      const isNoise =
        line.includes('npm WARN') ||
        line.includes('⸨') ||
        line.includes('⸩') ||
        line.includes('Downloading') ||
        line.includes('Fetch:') ||
        line.trim() === '';

      if (isNoise && intensity !== 'SAFE') {
        foldedNoiseCount++;
      } else {
        if (foldedNoiseCount > 0) {
          retainedLines.push(`[... ${foldedNoiseCount} noise/progress lines folded ...]`);
          foldedNoiseCount = 0;
        }
        retainedLines.push(line);
      }
    }

    if (foldedNoiseCount > 0) {
      retainedLines.push(`[... ${foldedNoiseCount} noise lines folded ...]`);
    }

    return retainedLines.join('\n');
  }

  private compressTestOutput(testLog: string, _intensity: CompressionIntensity): string {
    const lines = testLog.split(/\r?\n/);
    const filtered: string[] = [];
    let insideFailureBlock = false;

    for (const line of lines) {
      if (line.includes('FAIL') || line.includes('Error:') || line.includes('AssertionError')) {
        insideFailureBlock = true;
      } else if (line.includes('PASS') || line.includes('Test Suites:')) {
        insideFailureBlock = false;
      }

      // Always keep failure blocks and summary lines
      if (
        insideFailureBlock ||
        line.includes('Tests:') ||
        line.includes('Snapshots:') ||
        line.includes('Time:')
      ) {
        filtered.push(line);
      }
    }

    return filtered.length > 0 ? filtered.join('\n') : testLog;
  }

  private compressGitDiff(diff: string, _intensity: CompressionIntensity): string {
    const lines = diff.split(/\r?\n/);
    const compact: string[] = [];

    for (const line of lines) {
      // Keep headers and changes, compress large context buffers
      if (
        line.startsWith('diff --git') ||
        line.startsWith('---') ||
        line.startsWith('+++') ||
        line.startsWith('@@') ||
        line.startsWith('+') ||
        line.startsWith('-')
      ) {
        compact.push(line);
      }
    }

    return compact.join('\n');
  }
}
