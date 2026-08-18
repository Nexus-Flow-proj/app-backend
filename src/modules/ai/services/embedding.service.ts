import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EmbeddingCacheEntry {
  embedding: number[];
  expiresAt: number;
}

@Injectable()
export class EmbeddingService {
  public static readonly DEFAULT_MODEL = 'nvidia/nemotron-3-embed-1b:free';
  public static readonly VECTOR_DIMENSIONS = 2048;

  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openrouterApiKey: string | null = null;
  private readonly embeddingModel: string;
  private mockMode = false;

  private readonly embeddingCache = new Map<string, EmbeddingCacheEntry>();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000;
  private static readonly CACHE_MAX_SIZE = 200;

  constructor(private readonly configService: ConfigService) {
    this.openrouterApiKey =
      this.configService.get<string>('env.openrouterApiKey') ||
      process.env.OPENROUTER_API_KEY ||
      null;

    this.embeddingModel =
      process.env.EMBEDDING_MODEL || EmbeddingService.DEFAULT_MODEL;

    if (this.openrouterApiKey) {
      const masked = `${this.openrouterApiKey.slice(0, 8)}...${this.openrouterApiKey.slice(-4)}`;
      this.logger.log(
        `Embedding Service initialized with OpenRouter API Key (${masked}), model: ${this.embeddingModel}`,
      );
    } else {
      this.logger.warn(
        'OPENROUTER_API_KEY is not defined. Embedding Service will operate in MOCK MODE.',
      );
      this.mockMode = true;
    }
  }

  isMockMode(): boolean {
    return this.mockMode;
  }

  async createEmbedding(
    text: string,
    inputType: 'search_document' | 'search_query' = 'search_document',
  ): Promise<number[]> {
    const cacheKey = this.buildCacheKey(text, inputType);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const embeddings = await this.createEmbeddings([text], inputType);
    const result = embeddings[0];
    this.setInCache(cacheKey, result);
    return result;
  }

  async createEmbeddings(
    texts: string[],
    inputType: 'search_document' | 'search_query' = 'search_document',
  ): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    const results: (number[] | null)[] = new Array(texts.length).fill(null);
    const uncachedIndices: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      const cacheKey = this.buildCacheKey(texts[i], inputType);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
      }
    }

    if (uncachedIndices.length > 0) {
      const uncachedTexts = uncachedIndices.map((i) => texts[i]);
      const fetched = await this.fetchEmbeddings(uncachedTexts, inputType);

      for (let j = 0; j < uncachedIndices.length; j++) {
        const originalIndex = uncachedIndices[j];
        results[originalIndex] = fetched[j];
        const cacheKey = this.buildCacheKey(texts[originalIndex], inputType);
        this.setInCache(cacheKey, fetched[j]);
      }
    }

    return results as number[][];
  }

  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
      return 0;
    }
    const len = Math.min(vecA.length, vecB.length);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async fetchEmbeddings(
    texts: string[],
    inputType: 'search_document' | 'search_query',
  ): Promise<number[][]> {
    if (this.mockMode || !this.openrouterApiKey) {
      return texts.map((t) => this.generateMockEmbedding(t));
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Nexus Flow App',
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: texts.length === 1 ? texts[0] : texts,
          input_type: inputType,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenRouter Embeddings HTTP ${response.status}: ${errorBody.slice(0, 300)}`,
        );
      }

      const result = (await response.json()) as {
        data?: Array<{ embedding: number[]; index?: number }>;
      };

      if (!result.data || result.data.length === 0) {
        throw new Error('Empty embedding data returned from OpenRouter API');
      }

      const sortedData = [...result.data].sort(
        (a, b) => (a.index ?? 0) - (b.index ?? 0),
      );

      return sortedData.map((d) => d.embedding);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `OpenRouter embedding generation failed (${message}). Falling back to mock embeddings.`,
      );
      return texts.map((t) => this.generateMockEmbedding(t));
    }
  }

  private buildCacheKey(
    text: string,
    inputType: 'search_document' | 'search_query',
  ): string {
    const raw = `${inputType}:${text.trim()}`;
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) + hash) ^ raw.charCodeAt(i);
      hash |= 0;
    }
    return `emb_${(hash >>> 0).toString(36)}`;
  }

  private getFromCache(key: string): number[] | null {
    const entry = this.embeddingCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.embeddingCache.delete(key);
      return null;
    }
    this.embeddingCache.delete(key);
    this.embeddingCache.set(key, entry);
    return entry.embedding;
  }

  private setInCache(key: string, embedding: number[]): void {
    if (this.embeddingCache.size >= EmbeddingService.CACHE_MAX_SIZE) {
      const oldestKey = this.embeddingCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.embeddingCache.delete(oldestKey);
      }
    }
    this.embeddingCache.set(key, {
      embedding,
      expiresAt: Date.now() + EmbeddingService.CACHE_TTL_MS,
    });
  }

  private generateMockEmbedding(text: string): number[] {
    const vector = new Array<number>(EmbeddingService.VECTOR_DIMENSIONS);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    let norm = 0;
    for (let i = 0; i < EmbeddingService.VECTOR_DIMENSIONS; i++) {
      const val = Math.sin(hash + i * 0.1337);
      vector[i] = val;
      norm += val * val;
    }

    const sqrtNorm = Math.sqrt(norm) || 1;
    for (let i = 0; i < EmbeddingService.VECTOR_DIMENSIONS; i++) {
      vector[i] = vector[i] / sqrtNorm;
    }

    return vector;
  }
}
