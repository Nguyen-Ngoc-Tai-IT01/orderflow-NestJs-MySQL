<<<<<<< HEAD
import { Controller } from '@nestjs/common';

@Controller('auth')
export class AuthController {}
=======
import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
