import { RecoveryStore } from './recoveryStore.ts';
import { SmartCrusher } from '../context/smartCrusher.ts';
import { CodeFolder } from './codeFolder.ts';
import { CortexDatabase } from '../storage/database.ts';

export type CompressionIntensity = 'SAFE' | 'BALANCED' | 'AGGRESSIVE' | 'ULTRA' | 'AUTO';

export interface ICompressionResult {
  compressed: string;
  originalBytes: number;
  compressedBytes: number;
  savedPercentage: number;
  recoveryHandle: string;
  strategy: string;
}

export interface ICaveScorecard {
  totalCompressions: number;
  totalTokensSaved: number;
  totalBytesSaved: number;
  averageCompressionRatio: number;
  estimatedCostSavingsUsd: number;
  caveScore: number;
}

export class ContextCompressor {
  private recoveryStore: RecoveryStore;
  private totalCompressions = 0;
  private totalBytesSaved = 0;

  constructor(db?: CortexDatabase) {
    const activeDb = db || new CortexDatabase();
    this.recoveryStore = new RecoveryStore(activeDb);
  }

  public compress(
    rawText: string,
    typeHint?: 'json' | 'log' | 'test' | 'diff' | 'code' | 'auto',
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
        case 'code':
          compressed = CodeFolder.smartOutline(rawText).outlinedCode;
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

      this.totalCompressions++;
      this.totalBytesSaved += savedBytes;

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

  public getCaveScorecard(): ICaveScorecard {
    const tokensSaved = Math.round(this.totalBytesSaved / 4);
    const costSaved = parseFloat(((tokensSaved / 1_000_000) * 3.0).toFixed(4));
    const avgRatio =
      this.totalCompressions > 0
        ? Math.min(95, Math.round((this.totalBytesSaved / (this.totalBytesSaved + 1000)) * 100))
        : 0;
    const caveScore = Math.min(100, Math.round(avgRatio * 0.7 + Math.min(30, this.totalCompressions * 2)));

    return {
      totalCompressions: this.totalCompressions,
      totalTokensSaved: tokensSaved,
      totalBytesSaved: this.totalBytesSaved,
      averageCompressionRatio: avgRatio,
      estimatedCostSavingsUsd: costSaved,
      caveScore,
    };
  }

  private detectType(text: string): 'json' | 'test' | 'diff' | 'code' | 'log' {
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
    if (
      trimmed.startsWith('import ') ||
      trimmed.startsWith('export ') ||
      (trimmed.includes('function ') && trimmed.includes('{')) ||
      (trimmed.includes('class ') && trimmed.includes('{'))
    ) {
      return 'code';
    }
    return 'log';
  }

  private compressJson(rawJson: string, _intensity: CompressionIntensity): string {
    const crushed = SmartCrusher.crush(rawJson);
    return crushed.crushedString;
  }

  private compressTerminalLog(log: string, intensity: CompressionIntensity): string {
    const lines = log.split(/\r?\n/);

    if (intensity === 'ULTRA') {
      const ultraLines = lines.filter((l) => {
        const lower = l.toLowerCase();
        return (
          lower.includes('error') ||
          lower.includes('fail') ||
          lower.includes('exit code') ||
          lower.includes('fatal') ||
          l.trim().startsWith('at ') ||
          lower.includes('warning') ||
          Boolean(l.match(/[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+:\d+/))
        );
      });
      return ultraLines.length > 0 ? ultraLines.join('\n') : lines.slice(0, 5).join('\n');
    }

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
