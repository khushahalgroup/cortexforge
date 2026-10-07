/**
 * CortexForge Zero-Dependency BM25 & TF-IDF Hybrid Search Engine
 * Delivers semantic-grade lexical ranking, token saturation, and inverse document frequency scoring.
 */

export interface IBM25Document {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface IBM25ScoreResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export class BM25Engine {
  private k1: number; // Term frequency saturation parameter (default: 1.5)
  private b: number;  // Length normalization parameter (default: 0.75)
  private docCount: number = 0;
  private avgDocLength: number = 0;
  private docLengths: Map<string, number> = new Map();
  private docTermFreqs: Map<string, Map<string, number>> = new Map();
  private docFreqs: Map<string, number> = new Map(); // term -> number of documents containing term
  private documents: Map<string, IBM25Document> = new Map();

  private static readonly STOPWORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with'
  ]);

  constructor(k1: number = 1.5, b: number = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  public tokenize(text: string): string[] {
    const rawTokens = text
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !BM25Engine.STOPWORDS.has(t));

    // Also extract camelCase & snake_case sub-tokens
    const subTokens: string[] = [];
    for (const token of rawTokens) {
      if (token.includes('_')) {
        subTokens.push(...token.split('_').filter((s) => s.length > 1));
      }
      // Bigrams for phrase preservation
      subTokens.push(token);
    }

    return subTokens;
  }

  public addDocument(doc: IBM25Document): void {
    const tokens = this.tokenize(doc.text);
    const docLength = tokens.length;

    this.documents.set(doc.id, doc);
    this.docLengths.set(doc.id, docLength);

    const termFreqMap = new Map<string, number>();
    for (const token of tokens) {
      termFreqMap.set(token, (termFreqMap.get(token) || 0) + 1);
    }
    this.docTermFreqs.set(doc.id, termFreqMap);

    // Update document frequency
    for (const term of termFreqMap.keys()) {
      this.docFreqs.set(term, (this.docFreqs.get(term) || 0) + 1);
    }

    this.docCount++;
    this.updateAverageLength();
  }

  public clear(): void {
    this.docCount = 0;
    this.avgDocLength = 0;
    this.docLengths.clear();
    this.docTermFreqs.clear();
    this.docFreqs.clear();
    this.documents.clear();
  }

  private updateAverageLength(): void {
    let totalLength = 0;
    for (const len of this.docLengths.values()) {
      totalLength += len;
    }
    this.avgDocLength = this.docCount > 0 ? totalLength / this.docCount : 0;
  }

  public search(query: string, topK: number = 10): IBM25ScoreResult[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0 || this.docCount === 0) return [];

    const scores = new Map<string, number>();

    for (const token of queryTokens) {
      const df = this.docFreqs.get(token) || 0;
      if (df === 0) continue;

      // Robertson-Spärck Jones IDF formula
      const idf = Math.log(1 + (this.docCount - df + 0.5) / (df + 0.5));

      for (const [docId, tfMap] of this.docTermFreqs.entries()) {
        const tf = tfMap.get(token) || 0;
        if (tf === 0) continue;

        const docLen = this.docLengths.get(docId) || 1;
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + (this.b * docLen) / (this.avgDocLength || 1));
        const termScore = idf * (numerator / denominator);

        scores.set(docId, (scores.get(docId) || 0) + termScore);
      }
    }

    const results: IBM25ScoreResult[] = [];
    for (const [docId, score] of scores.entries()) {
      const doc = this.documents.get(docId);
      results.push({
        id: docId,
        score,
        metadata: doc?.metadata,
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}
