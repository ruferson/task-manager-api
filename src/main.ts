import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // =========================================================================
  // 1. CORS CONFIGURATION (Cross-Origin Resource Sharing)
  // =========================================================================
  // Enables cross-origin resource sharing to allow the frontend client
  // (e.g., Next.js on port 3000) to make HTTP requests to the API.
  app.enableCors({
    origin: ['http://localhost:3000'], // Authorized frontend domain/port
    credentials: true, // Allows passing cookies and authentication headers
  });

  // =========================================================================
  // 2. GLOBAL VALIDATION AND SANITIZATION PIPE (ValidationPipe)
  // =========================================================================
  // Intercepts all incoming requests to validate and clean JSON payloads
  // based on rules defined in DTO classes using class-validator.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Automatically removes JSON fields not declared in the DTO
      forbidNonWhitelisted: true, // Throws a 400 Bad Request if extra properties are sent
      transform: true, // Automatically converts payloads to native TS types (e.g., string to number)
    }),
  );

  // =========================================================================
  // 3. SWAGGER DOCUMENTATION (OpenAPI Specification)
  // =========================================================================
  // Sets up an interactive UI to test endpoints directly from the browser.
  const config = new DocumentBuilder()
    .setTitle('Task Manager API')
    .setDescription(
      'Full REST API with JWT authentication, project management, and task tracking.',
    )
    .setVersion('1.0')
    .addBearerAuth() // Adds Bearer Token authentication option in the interface
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // =========================================================================
  // 4. SERVER STARTUP AND LOGGING
  // =========================================================================
  // Default port 3001 to avoid collisions with Next.js (usually on 3000)
  const port = process.env.PORT || 3001;
  await app.listen(port);

  Logger.log(
    `🚀 Backend server listening on: http://localhost:${port}`,
    'Bootstrap',
  );
  Logger.log(
    `📚 Swagger documentation ready at: http://localhost:${port}/api/docs`,
    'Bootstrap',
  );
}

bootstrap();
