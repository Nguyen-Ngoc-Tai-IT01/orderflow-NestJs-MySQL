import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
<<<<<<< HEAD
import { AuthModule } from './modules/auth/auth.module';
import { InventoryModule } from './modules/inventory/inventory.module';
=======
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
>>>>>>> 53dcff77b7db803d484f5c9ea613d3194be196d6
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ReportsModule } from './modules/reports/reports.module';
<<<<<<< HEAD
import { TablesModule } from './modules/tables/tables.module';
import { UsersModule } from './modules/users/users.module';
=======
>>>>>>> 53dcff77b7db803d484f5c9ea613d3194be196d6

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
<<<<<<< HEAD
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'orderflow_db',
      autoLoadEntities: true,
      synchronize:
        process.env.NODE_ENV !== 'production' &&
        process.env.DB_SYNCHRONIZE !== 'false',
=======
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '', // Điền mật khẩu MySQL của bạn vào đây
      database: 'orderflow_db', // Tên database bạn đã tạo trong MySQL
      autoLoadEntities: true,
      synchronize: true, // Chỉ bật true khi đang dev, production phải tắt
>>>>>>> 53dcff77b7db803d484f5c9ea613d3194be196d6
    }),
    UsersModule,
    AuthModule,
    MenuModule,
    TablesModule,
    OrdersModule,
    InventoryModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}