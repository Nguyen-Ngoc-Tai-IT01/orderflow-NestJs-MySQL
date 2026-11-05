import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RestaurantTable } from './entities/restaurant-table.entity';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([RestaurantTable])],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
