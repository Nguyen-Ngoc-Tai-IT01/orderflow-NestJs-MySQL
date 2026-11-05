import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';

type AuthenticatedRequest = Request & { user: User };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() request: AuthenticatedRequest) {
    return this.authService.login(request.user);
  }
}
