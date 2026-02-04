import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotModule } from './modules/bot/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        // Добавляем !, так как мы уверены, что URI есть в .env
        uri: configService.get<string>('MONGODB_URI')!, 
      }),
      inject: [ConfigService],
    }),

    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        // Добавляем !, чтобы TS не ругался на возможный undefined
        token: configService.get<string>('BOT_TOKEN')!,
      }),
      inject: [ConfigService],
    }),

    BotModule,
  ],
})
export class AppModule {}