import { Injectable } from '@nestjs/common';
<<<<<<< HEAD

@Injectable()
export class AuthService {}
=======
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
