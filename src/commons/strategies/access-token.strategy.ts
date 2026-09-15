import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.ACCESS_TOKEN_KEY!,
      ignoreExpiration: false,
    });
  }

  /**
   * Re-reads the user on every request rather than trusting the token alone.
   *
   * A signed token stays valid until it expires, so without this a blocked or
   * deleted user keeps full access for the rest of the token's lifetime, and a
   * demoted user keeps their old role. One primary-key lookup buys immediate
   * revocation.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, phone: true, role: true, tenantId: true, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    return {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      tenantId: user.tenantId ?? 0,
      isActive: user.isActive,
    };
  }
}
