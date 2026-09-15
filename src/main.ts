import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './commons/errors/error.handling';
import { corsOrigins } from './commons/config/env.validation';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const port = Number(process.env.PORT ?? 3001);
  const isProduction = process.env.NODE_ENV === 'production';

  // Behind nginx on the VPS every request arrives from 127.0.0.1. Without
  // this, the rate limiter would count all users as one client.
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      // Strip anything the DTO does not declare. Several services spread the
      // DTO straight into Prisma, so this is what stops mass assignment.
      // Unknown fields are dropped rather than rejected: the web app sends
      // extra query params on many screens, and a 400 there would break them.
      // Turn forbidNonWhitelisted on once the frontend is aligned.
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Swagger is a map of the whole API surface; don't publish it in production.
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('EduFlow API')
      .setDescription(
        'Multi-tenant LMS and CRM for education centres. ' +
          'Authenticate with POST /api/auth/login, then send the access token as a Bearer header.',
      )
      .setVersion('1.0')
      // Unnamed on purpose: controllers already use a bare @ApiBearerAuth().
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build();

    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config), {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);

  logger.log(`API      http://localhost:${port}/api`);
  if (!isProduction) logger.log(`Docs     http://localhost:${port}/api/docs`);
}

// No try/catch here on purpose: a failed boot must exit non-zero so that
// systemd, PM2 or Docker actually restarts the process instead of treating
// the crash as a clean shutdown.
bootstrap().catch((error) => {
  new Logger('Bootstrap').error('Application failed to start', error);
  process.exit(1);
});
