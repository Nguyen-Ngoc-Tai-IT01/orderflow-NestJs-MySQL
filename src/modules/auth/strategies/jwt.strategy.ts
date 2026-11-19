import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from '../../../common/enums/role.enum';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'orderflow_secret_key_2026',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findByUsername(payload.username);
    if (!user || user.id !== payload.sub || !user.isActive) {
      throw new UnauthorizedException('Phiên đăng nhập không còn hiệu lực');
    }

    return {
      userId: user.id,
      username: user.username,
      role: user.role,
    };
  }
}
