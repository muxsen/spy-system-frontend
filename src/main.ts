import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors(); // Разрешаем запросы с фронтенда

  // 🔥 Исправление для Bypass-Tunnel-Reminder
  app.use((req, res, next) => {
    res.setHeader('Bypass-Tunnel-Reminder', 'true');
    next();
  });

  await app.listen(3000);
}
bootstrap();