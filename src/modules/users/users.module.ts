import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // Đăng ký Entity với TypeORM[cite: 34]
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Xuất Service để các module khác (như AuthModule) có thể sử dụng[cite: 6]
})
export class UsersModule {}
