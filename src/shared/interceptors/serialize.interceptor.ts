import {
  UseInterceptors,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToClass } from 'class-transformer';

interface ClassConstructor {
  new (...args: any[]): {};
}

export function Serialize(dto: ClassConstructor) {
  return UseInterceptors(new SerializeInterceptor(dto));
}

export class SerializeInterceptor implements NestInterceptor {
  constructor(private dto: ClassConstructor) {}

  intercept(
    context: ExecutionContext,
    handler: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    return handler.handle().pipe(
      map((res: any) => {
        // If the controller returned an ApiEnvelope ({ message, data }),
        // serialize only the `data` payload and preserve the envelope.
        if (
          res &&
          typeof res === 'object' &&
          'data' in res &&
          'message' in res
        ) {
          return {
            ...res,
            data: plainToClass(this.dto, res.data, {
              excludeExtraneousValues: true,
            }),
          };
        }

        // Otherwise serialize the raw value directly.
        return plainToClass(this.dto, res, { excludeExtraneousValues: true });
      }),
    );
  }
}
