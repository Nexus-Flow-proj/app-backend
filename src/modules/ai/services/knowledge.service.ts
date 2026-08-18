import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  KnowledgeChunk,
  KnowledgeSourceType,
} from '../entities/knowledge-chunk.entity';
import {
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  KnowledgeSearchResult,
} from '../dtos/knowledge.dto';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectRepository(KnowledgeChunk)
    private readonly chunkRepo: Repository<KnowledgeChunk>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async createKnowledge(
    projectId: string,
    dto: CreateKnowledgeDto,
    userId?: string,
  ): Promise<KnowledgeChunk> {
    const embedding = await this.embeddingService.createEmbedding(
      `${dto.title}\n${dto.content}`,
      'search_document',
    );

    const chunk = this.chunkRepo.create({
      projectId,
      title: dto.title.trim(),
      content: dto.content.trim(),
      sourceType: dto.sourceType || KnowledgeSourceType.POLICY,
      embedding,
      createdBy: userId || null,
    });

    const saved = await this.chunkRepo.save(chunk);
    this.logger.log(
      `Saved knowledge chunk "${saved.title}" (ID: ${saved.id}) for project ${projectId}`,
    );

    const { embedding: _, ...result } = saved;
    return result as KnowledgeChunk;
  }

  async listKnowledge(
    projectId: string,
    sourceType?: string,
  ): Promise<KnowledgeChunk[]> {
    const query = this.chunkRepo
      .createQueryBuilder('chunk')
      .leftJoinAndSelect('chunk.creator', 'creator')
      .where('chunk.projectId = :projectId', { projectId })
      .orderBy('chunk.createdAt', 'DESC');

    if (sourceType) {
      query.andWhere('chunk.sourceType = :sourceType', { sourceType });
    }

    return query.getMany();
  }

  async getKnowledgeById(
    projectId: string,
    chunkId: string,
  ): Promise<KnowledgeChunk> {
    const chunk = await this.chunkRepo.findOne({
      where: { id: chunkId, projectId },
      relations: { creator: true },
    });

    if (!chunk) {
      throw new NotFoundException('Knowledge document not found');
    }

    return chunk;
  }

  async updateKnowledge(
    projectId: string,
    chunkId: string,
    dto: UpdateKnowledgeDto,
  ): Promise<KnowledgeChunk> {
    const chunk = await this.chunkRepo.findOne({
      where: { id: chunkId, projectId },
    });

    if (!chunk) {
      throw new NotFoundException('Knowledge document not found');
    }

    let isContentModified = false;

    if (dto.title && dto.title.trim() !== chunk.title) {
      chunk.title = dto.title.trim();
      isContentModified = true;
    }

    if (dto.content && dto.content.trim() !== chunk.content) {
      chunk.content = dto.content.trim();
      isContentModified = true;
    }

    if (dto.sourceType) {
      chunk.sourceType = dto.sourceType;
    }

    if (isContentModified) {
      chunk.embedding = await this.embeddingService.createEmbedding(
        `${chunk.title}\n${chunk.content}`,
        'search_document',
      );
    }

    const saved = await this.chunkRepo.save(chunk);
    this.logger.log(
      `Updated knowledge chunk "${saved.title}" (ID: ${saved.id}) in project ${projectId}`,
    );

    const { embedding: _, ...result } = saved;
    return result as KnowledgeChunk;
  }

  async deleteKnowledge(projectId: string, chunkId: string): Promise<void> {
    const chunk = await this.chunkRepo.findOne({
      where: { id: chunkId, projectId },
    });

    if (!chunk) {
      throw new NotFoundException('Knowledge document not found');
    }

    await this.chunkRepo.delete({ id: chunkId });
    this.logger.log(
      `Deleted knowledge chunk ID ${chunkId} from project ${projectId}`,
    );
  }

  async searchRelevantKnowledge(
    projectId: string,
    queryText: string,
    limit = 5,
    minSimilarity = 0.25,
  ): Promise<KnowledgeSearchResult[]> {
    if (!queryText || !queryText.trim()) {
      return [];
    }

    try {
      const queryEmbedding = await this.embeddingService.createEmbedding(
        queryText.trim(),
        'search_query',
      );

      if (!queryEmbedding || queryEmbedding.length === 0) {
        return [];
      }

      const vectorLiteral = `[${queryEmbedding.join(',')}]`;
      const minDistance = 1 - minSimilarity;

      const rows: Array<{
        id: string;
        project_id: string;
        title: string;
        content: string;
        source_type: string;
        similarity: number;
      }> = await this.chunkRepo.query(
        `
        SELECT
          id,
          project_id,
          title,
          content,
          source_type,
          ROUND(CAST(1 - (embedding <=> $1::vector) AS numeric), 3) AS similarity
        FROM knowledge_chunks
        WHERE project_id = $2
          AND (embedding <=> $1::vector) <= $3
        ORDER BY embedding <=> $1::vector
        LIMIT $4
        `,
        [vectorLiteral, projectId, minDistance, limit],
      );

      return rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        content: row.content,
        sourceType: row.source_type,
        similarity: Number(row.similarity),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to retrieve relevant knowledge for project ${projectId}: ${message}`,
      );
      return [];
    }
  }
}
