import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
<<<<<<< HEAD
=======
import { AuthModule } from './modules/auth/auth.module';
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';
<<<<<<< HEAD
import { AuthModule } from './modules/auth/auth.module';
=======
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd

@Module({
  imports: [
    TypeOrmModule.forRoot({
<<<<<<< HEAD
      type: 'postgres',
      url: process.env.DATABASE_URL,
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'orderflow',
      autoLoadEntities: true,
      synchronize:
        process.env.NODE_ENV !== 'production' &&
        process.env.DB_SYNCHRONIZE !== 'false',
    }),
    OrdersModule,
    UsersModule,
    MenuModule,
    InventoryModule,
    ReportsModule,
    AuthModule,
=======
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
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
