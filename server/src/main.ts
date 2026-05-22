import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join, isAbsolute } from 'node:path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { StandardApiResponseInterceptor } from './common/interceptors/standard-api-response.interceptor';
import { I18nService } from './common/i18n/i18n.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = app.get(ConfigService);
  const uploadDirRaw = config.get<string>('WIKI_UPLOAD_DIR') ?? 'uploads';
  const uploadDir = isAbsolute(uploadDirRaw)
    ? uploadDirRaw
    : join(process.cwd(), uploadDirRaw);
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Borrowed Shapes API')
    .setDescription('API documentation for Borrowed Shapes backend')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDocument);

  const i18n = app.get(I18nService);
  app.useGlobalInterceptors(new StandardApiResponseInterceptor(i18n));
  app.useGlobalFilters(new GlobalExceptionFilter(i18n));
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
