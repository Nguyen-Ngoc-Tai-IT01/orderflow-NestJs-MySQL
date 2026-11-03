import { Module } from '@nestjs/common';
<<<<<<< HEAD
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu } from './entities/menu.entity';
=======
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';

@Module({
<<<<<<< HEAD
  imports: [TypeOrmModule.forFeature([Menu])],
=======
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
