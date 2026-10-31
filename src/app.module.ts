import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '', // Điền mật khẩu MySQL của bạn vào đây
      database: 'orderflow_db', // Tên database bạn đã tạo trong MySQL
      autoLoadEntities: true,
      synchronize: true, // Chỉ bật true khi đang dev, production phải tắt
    }),
    UsersModule,
    AuthModule,
    MenuModule,
    OrdersModule,
    InventoryModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
