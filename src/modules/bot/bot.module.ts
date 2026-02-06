// src/modules/bot/bot.module.ts
import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update'; // Должен быть тут!
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema'; 
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    // Проверь настройки TelegrafModule тут
  ],
  providers: [BotService, BotUpdate], // ОБЯЗАТЕЛЬНО BotUpdate должен быть в providers
  exports: [BotService],
})
export class BotModule {}