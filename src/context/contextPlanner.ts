import type { ITaskClassification } from './taskClassifier.ts';
import type { IMemoryRecord, IGraphNode } from '../storage/schemas.ts';

export interface IContextCandidate {
  id: string;
  type: 'file' | 'symbol' | 'memory' | 'architecture';
  title: string;
  content: string;
  relevanceScore: number; // 0.0 - 1.0
  estimatedTokens: number;
}

export interface IContextBudgetPlan {
  totalEstimatedTokens: number;
  maxBudgetTokens: number;
  mustHave: IContextCandidate[];
  probablyRelevant: IContextCandidate[];
  optional: IContextCandidate[];
  omitted: IContextCandidate[];
  headroomPercentage: number;
}

export class ContextPlanner {
  private readonly defaultMaxTokens: number = 32000; // Safe default for tool contexts
  private readonly minHeadroomFraction: number = 0.25; // 25% safety headroom

  public plan(
    classification: ITaskClassification,
    candidates: IContextCandidate[],
    maxTokens: number = this.defaultMaxTokens
  ): IContextBudgetPlan {
    const usableBudget = Math.floor(maxTokens * (1 - this.minHeadroomFraction));

    // Sort candidates by relevance score descending
    const sorted = [...candidates].sort((a, b) => b.relevanceScore - a.relevanceScore);

    const mustHave: IContextCandidate[] = [];
    const probablyRelevant: IContextCandidate[] = [];
    const optional: IContextCandidate[] = [];
    const omitted: IContextCandidate[] = [];

    let currentTokens = 0;

    for (const item of sorted) {
      if (item.relevanceScore >= 0.85) {
        if (currentTokens + item.estimatedTokens <= usableBudget) {
          mustHave.push(item);
          currentTokens += item.estimatedTokens;
        } else {
          // Exceeds budget even for high relevance; place into optional
          optional.push(item);
        }
      } else if (item.relevanceScore >= 0.6) {
        if (currentTokens + item.estimatedTokens <= usableBudget) {
          probablyRelevant.push(item);
          currentTokens += item.estimatedTokens;
        } else {
          omitted.push(item);
        }
      } else if (item.relevanceScore >= 0.4) {
        if (currentTokens + item.estimatedTokens <= usableBudget * 0.9) {
          optional.push(item);
          currentTokens += item.estimatedTokens;
        } else {
          omitted.push(item);
        }
      } else {
        omitted.push(item);
      }
    }

    const headroomPercentage = Math.round(((maxTokens - currentTokens) / maxTokens) * 100);

    return {
      totalEstimatedTokens: currentTokens,
      maxBudgetTokens: maxTokens,
      mustHave,
      probablyRelevant,
      optional,
      omitted,
      headroomPercentage,
    };
  }

  public static estimateTokens(text: string): number {
    // Standard rule of thumb: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  public calculateHeadroom(consumedTokens: number, windowLimit: number = 128000): {
    consumedTokens: number;
    windowLimit: number;
    headroomTokens: number;
    headroomPercentage: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    recommendation: string;
  } {
    const headroomTokens = Math.max(0, windowLimit - consumedTokens);
    const headroomPercentage = Math.round((headroomTokens / windowLimit) * 100);

    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    let recommendation = 'Headroom sufficient. Continue standard agent execution.';

    if (headroomPercentage < 15) {
      status = 'CRITICAL';
      recommendation = 'CRITICAL HEADROOM: Context window near saturation (>85%). Apply ULTRA compression and summarize session immediately.';
    } else if (headroomPercentage < 30) {
      status = 'WARNING';
      recommendation = 'HEADROOM WARNING: Context window >70% full. Fold code bodies with Smart Outline and crush JSON outputs.';
    }

    return {
      consumedTokens,
      windowLimit,
      headroomTokens,
      headroomPercentage,
      status,
      recommendation,
    };
  }
}
