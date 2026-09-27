import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación automática de DTOs en los controladores (adaptadores de entrada)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS abierto para el cliente React (móvil); ajustar origin en producción.
  app.enableCors({ origin: true });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`tienda-backend escuchando en el puerto ${port}`);
}
bootstrap();
