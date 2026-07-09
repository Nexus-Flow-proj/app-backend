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
    const rawCookie = socket.handshake.headers.cookie;

    if (!rawCookie) {
      throw new UnauthorizedException('Missing cookies');
    }

    const cookies = parseCookie(rawCookie);
    const token = cookies.access_token;

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
