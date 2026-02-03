import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('BOT_TOKEN');
    if (!token) {
      throw new Error('BOT_TOKEN is not defined');
    }
    this.bot = new Telegraf(token);
  }

  async onModuleInit() {
    const webAppUrl = this.configService.get<string>('WEBAPP_URL');
    if (!webAppUrl) {
      // Это именно то место, где у тебя вылетала ошибка
      throw new Error('WEBAPP_URL is not defined in your .env file');
    }
    console.log('✅ Bot Service: Настроен на URL:', webAppUrl);
    console.log('🚀 Система готова к работе!');
  }

  // Метод для пересылки сообщений из UserBot
  async sendMessage(chatId: string, text: string) {
    try {
      await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'HTML' });
    } catch (e) {
      console.error('Ошибка отправки сообщения:', e.message);
    }
  }
}