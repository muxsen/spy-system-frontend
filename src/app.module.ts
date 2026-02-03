import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BotModule } from './modules/bot/bot.module';

@Module({
  imports: [
    // isGlobal: true делает переменные доступными во всем проекте
    ConfigModule.forRoot({ isGlobal: true }), 
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    BotModule,
    // другие модули...
  ],
})
export class AppModule {}