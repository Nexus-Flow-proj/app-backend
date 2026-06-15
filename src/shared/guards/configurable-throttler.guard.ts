import { ExecutionContext, Injectable } from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerStorage,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { THROTTLE_KEY } from '@shared/decorators/throttle-key.decorator';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

type ThrottlerRouteConfig = {
  ttl: number;
  limit: number;
};

type ThrottlerConfig = Record<string, ThrottlerRouteConfig>;

@Injectable()
export class ConfigurableThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  protected getTracker(req: Record<string, any>): Promise<string> {
    const request = req as Request;
    const ip =
      request.ip ||
      (request.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ||
      request.socket?.remoteAddress ||
      'unknown';
    return Promise.resolve(ip);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const routeKey = this.reflector.get<string>(
      THROTTLE_KEY,
      context.getHandler(),
    );

    const name = routeKey ?? 'global';

    const throttlerConfig =
      this.configService.get<ThrottlerConfig>('throttler');

    if (!throttlerConfig) {
      throw new Error('[ThrottlerGuard] Missing "throttler" config namespace.');
    }

    const routeConfig = throttlerConfig[name] ?? throttlerConfig['global'];

    if (!routeConfig?.ttl || !routeConfig?.limit) {
      throw new Error(
        `[ThrottlerGuard] Missing config for throttler key "${name}".`,
      );
    }

    const { ttl, limit } = routeConfig;

    const { req, res } = this.getRequestResponse(context);
    const response = res as Response;
    const tracker = await this.getTracker(req);
    const key = this.generateKey(context, tracker, name);

    const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } =
      await this.storageService.increment(key, ttl, limit, ttl, name);

    response.setHeader(`X-RateLimit-Limit-${name}`, limit);
    response.setHeader(
      `X-RateLimit-Remaining-${name}`,
      Math.max(0, limit - totalHits),
    );
    response.setHeader(`X-RateLimit-Reset-${name}`, timeToExpire);

    if (isBlocked || totalHits > limit) {
      response.setHeader(
        `Retry-After-${name}`,
        timeToBlockExpire ?? timeToExpire,
      );
      await this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
        tracker,
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      });
    }

    return true;
  }
}
