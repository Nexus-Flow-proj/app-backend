import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;

    const payload =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : (exceptionResponse as
            | { message?: string | string[]; error?: string }
            | undefined);

    const message =
      payload?.message ??
      (exception instanceof Error ? exception.message : 'Internal server error');

    const error = payload?.error ?? (isHttpException ? exception.name : 'Error');

    response.status(statusCode).json({
      success: false,
      message,
      error,
      statusCode,
    });
  }
}
