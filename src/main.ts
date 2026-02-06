import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // РАЗРЕШАЕМ ВСЕМУ (включая твой локальный клиент) подключаться
  app.enableCors({
    origin: '*', // Для локальной разработки ставим звездочку
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();