import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle_key';

export const ThrottleKey = (key: string) => SetMetadata(THROTTLE_KEY, key);
