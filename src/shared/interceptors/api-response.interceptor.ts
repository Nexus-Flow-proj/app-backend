import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type ApiEnvelope = {
  message?: string;
  data?: unknown;
  meta?: unknown;
};

type ApiWrappedResponse = {
  success: boolean;
  message: string;
  statusCode: number;
  data: unknown;
  meta?: unknown;
  error?: string;
};

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (!response || response.headersSent || response.writableEnded) {
          return data;
        }

        if (this.isWrappedResponse(data)) {
          return data;
        }

        const statusCode = response.statusCode || 200;

        if (this.isApiEnvelope(data)) {
          return this.wrapResponse(
            data.message ?? 'Request completed successfully.',
            data.data,
            statusCode,
            data.meta,
          );
        }

        return this.wrapResponse(
          'Request completed successfully.',
          data,
          statusCode,
        );
      }),
    );
  }

  private wrapResponse(
    message: string,
    data: unknown,
    statusCode: number,
    meta?: unknown,
  ): ApiWrappedResponse {
    return {
      success: true,
      message,
      statusCode,
      data,
      ...(meta !== undefined ? { meta } : {}),
    };
  }

  private isApiEnvelope(data: unknown): data is ApiEnvelope {
    return Boolean(
      data && typeof data === 'object' && 'message' in data && 'data' in data,
    );
  }

  private isWrappedResponse(data: unknown): data is ApiWrappedResponse {
    return Boolean(
      data &&
      typeof data === 'object' &&
      'success' in data &&
      'statusCode' in data,
    );
  }
}
