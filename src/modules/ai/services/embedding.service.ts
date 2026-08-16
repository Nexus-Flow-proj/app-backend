import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingService {
  public static readonly DEFAULT_MODEL = 'nvidia/nemotron-3-embed-1b:free';
  public static readonly VECTOR_DIMENSIONS = 2048;

  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openrouterApiKey: string | null = null;
  private readonly embeddingModel: string;
  private mockMode = false;

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

  /**
   * Generates a 2048-dimensional embedding for a single text input.
   */
  async createEmbedding(
    text: string,
    inputType: 'search_document' | 'search_query' = 'search_document',
  ): Promise<number[]> {
    const embeddings = await this.createEmbeddings([text], inputType);
    return embeddings[0];
  }

  /**
   * Generates embeddings for multiple text inputs.
   */
  async createEmbeddings(
    texts: string[],
    inputType: 'search_document' | 'search_query' = 'search_document',
  ): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    if (this.mockMode || !this.openrouterApiKey) {
      return texts.map((t) => this.generateMockEmbedding(t));
    }

    try {
      const response = await fetch(
        'https://openrouter.ai/api/v1/embeddings',
        {
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
        },
      );

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

      // Sort by index if present to maintain order
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

  /**
   * Calculates cosine similarity between two vector arrays of arbitrary length.
   * Returns a score between -1 and 1 (1 = identical direction).
   */
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

  /**
   * Deterministic mock vector generation (2048 dims) for local dev/testing without API keys.
   */
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
