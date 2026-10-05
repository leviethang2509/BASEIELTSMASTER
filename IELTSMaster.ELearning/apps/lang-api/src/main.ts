import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { validationExceptionFactory } from './common/validation';
import type { EnvironmentVariables } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  // Mặc định body JSON chỉ 100KB — đề thi nhiều câu dễ vượt. Upload file đi multer, không bị ảnh hưởng.
  app.useBodyParser('json', { limit: '2mb' });
  // Refresh token nằm trong cookie httpOnly.
  app.use(cookieParser());
  // Request tới qua rewrite của Next.js trên cùng máy: lấy IP client từ
  // X-Forwarded-For khi proxy là loopback (lưu vào refresh_tokens.ip).
  app.set('trust proxy', 'loopback');
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });
  // Không bật CORS: lang-app gọi API cùng origin qua rewrite /api của Next.js.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`lang-api chạy tại http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
