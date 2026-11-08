
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Cấu hình kiểm tra dữ liệu đầu vào
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Cho phép NestJS phục vụ giao diện trong thư mục public
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Khởi chạy server
  await app.listen(process.env.PORT ?? 3000);

  console.log(`Server đang chạy tại: http://localhost:3000`);
  console.log(`Dashboard: http://localhost:3000`);
}

void bootstrap();
