import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { session } from 'telegraf';
import { BotModule } from './modules/bot/bot.module';

@Module({
  imports: [
    // Глобальный конфиг
    ConfigModule.forRoot({ isGlobal: true }),

    // Подключение к MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    // Подключение к Telegram
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const token = configService.get<string>('BOT_TOKEN');
        if (!token) throw new Error('BOT_TOKEN is missing!');
        return {
          token: token,
          middlewares: [session()],
        };
      },
      inject: [ConfigService],
    }),

    // Подключаем наш исправленный модуль бота
    BotModule,
  ],
})
export class AppModule {}