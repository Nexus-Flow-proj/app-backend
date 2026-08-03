import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Socket } from 'socket.io';
import { parseCookie } from '@shared/utils/cookie.util';

import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class SocketAuthService {
  constructor(
    private readonly jwtService: JwtService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async authenticate(socket: Socket) {
    let token: string | undefined;

    // 1. Try extracting token from cookies
    const rawCookie = socket.handshake.headers.cookie;
    if (rawCookie) {
      const cookies = parseCookie(rawCookie);
      token = cookies.access_token;
    }

    // 2. Fallback: Try extracting token from handshake auth object (e.g. io(url, { auth: { token } }))
    if (!token && socket.handshake.auth) {
      const authObj = socket.handshake.auth as Record<string, unknown>;
      token =
        (authObj.token as string | undefined) ||
        (authObj.access_token as string | undefined) ||
        (authObj.authorization as string | undefined);
    }

    // 3. Fallback: Try extracting token from Authorization header (Bearer token)
    if (!token && socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      email: string;
    }>(token);

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
