import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(apiPrefix);

  // Cookie parsing
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  });

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Reserva de Salas API')
    .setDescription(
      'API de reserva de salas com autenticação JWT (Bearer + cookies), Prisma e PostgreSQL',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('health', 'Endpoints de health check')
    .addTag('auth', 'Endpoints de autenticação')
    .addTag('user', 'Gerenciamento de usuários')
    .addTag('rooms', 'Gerenciamento de salas')
    .addTag('reservations', 'Reservas de salas')
    .addTag('favorites', 'Salas favoritas')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const swaggerPath = process.env.SWAGGER_PATH || 'api/docs';
  SwaggerModule.setup(swaggerPath, app, document, {
    customSiteTitle: 'SeedaBit API Docs',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(
    `\n🚀 Application is running on: http://localhost:${port}/${apiPrefix}`,
  );
  console.log(
    `📚 Swagger documentation: http://localhost:${port}/${swaggerPath}\n`,
  );
}

void bootstrap();
