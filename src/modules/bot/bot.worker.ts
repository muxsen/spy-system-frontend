import { Injectable, OnModuleInit } from '@nestjs/common';
import { BotService } from './bot.service';
import { AiService } from '../ai/ai.service';
import { TelegramClient } from 'telegram'; // Например, из библиотеки gramjs

@Injectable()
export class BotWorker implements OnModuleInit {
  constructor(
    private readonly botService: BotService,
    private readonly aiService: AiService,
  ) {}

  async onModuleInit() {
    console.log('🚀 Воркер запущен и ищет новые посты...');
    this.startSpying();
  }

  async startSpying() {
   // ... внутри метода, где ошибка
const allUsers = await this.botService.getAllUsers(); // Добавили await
const activeSpies = allUsers.filter(user => user.hasAccess);
    for (const spy of activeSpies) {
      // 2. Логика подписки на события канала через UserBot
      // Когда в spy.sourceChannel выходит пост:
      // const newText = await this.aiService.rewrite(post.text);
      // await bot.sendMessage(spy.targetChannel, newText);
    }
  }
}