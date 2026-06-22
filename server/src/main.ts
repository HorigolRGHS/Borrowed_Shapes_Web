import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Borrowed Shapes API')
    .setDescription('API documentation for Borrowed Shapes backend')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    )
    .addSecurityRequirements('access-token')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customJsStr: `
      window.addEventListener('load', function () {
        const origFetch = window.fetch.bind(window);
        window.fetch = async function (...args) {
          const response = await origFetch(...args);
          try {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url ?? '';
            if (
              (url.includes('/auth/login') || url.includes('/auth/refresh')) &&
              response.status === 200
            ) {
              const cloned = response.clone();
              cloned.json().then(function (body) {
                const token = body && body.data && body.data.accessToken;
                if (token) {
                  // persistAuthorization uses this localStorage key format
                  const key = 'authorized';
                  const existing = JSON.parse(localStorage.getItem(key) || '{}');
                  existing['access-token'] = { name: 'access-token', schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization', in: 'header' }, value: token };
                  localStorage.setItem(key, JSON.stringify(existing));

                  // Also apply immediately via Swagger UI store
                  const checkUI = setInterval(function () {
                    if (window.ui) {
                      clearInterval(checkUI);
                      window.ui.authActions.authorize({
                        'access-token': {
                          name: 'access-token',
                          schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization', in: 'header' },
                          value: token
                        }
                      });
                    }
                  }, 100);
                }
              }).catch(function () {});
            }
          } catch (_) {}
          return response;
        };
      });
    `,
  });

  const i18n = app.get(I18nService);
  app.useGlobalInterceptors(new StandardApiResponseInterceptor(i18n));
  app.useGlobalFilters(new GlobalExceptionFilter(i18n));
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
