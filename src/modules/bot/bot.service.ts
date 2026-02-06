import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserSchema } from '../users/schemas/user.schema'; 
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';

@Injectable()
export class BotService implements OnModuleInit {
  private client: TelegramClient;
  private readonly myApiId: number;
  private readonly myApiHash: string;
  private readonly mySession: string;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
    @InjectBot() private bot: Telegraf,
  ) {
    // Добавляем оператор '!' или '||' для уверенности TypeScript
    this.myApiId = Number(this.configService.get<number>('TELEGRAM_API_ID'));
    this.myApiHash = this.configService.get<string>('TELEGRAM_API_HASH') || '';
    this.mySession = this.configService.get<string>('TELEGRAM_SESSION') || ''; 
  }

  async onModuleInit() {
    // Инициализируем только если есть сессия, чтобы не было ошибок при старте
    if (this.mySession) {
      await this.initSpy();
    } else {
      console.log('⚠️ ВНИМАНИЕ: TELEGRAM_SESSION не найден в .env. Шпион не запущен.');
    }
  }

  async initSpy() {
    const session = new StringSession(this.mySession);
    this.client = new TelegramClient(session, this.myApiId, this.myApiHash, {
      connectionRetries: 5,
    });

    await this.client.connect();
    console.log("🕵️ Шпион успешно подключен!");

    this.client.addEventHandler(async (event: any) => {
      const message = event.message;
      if (!message || !message.peerId) return;

      const channelId = message.peerId.channelId?.toString();
      if (!channelId) return;

      // Ищем подписчиков
      const subscribers = await this.userModel.find({ sourceChannel: channelId });

      for (const user of subscribers) {
        // Проверяем, что у пользователя есть канал-приемник
        if (!user.targetChannel) continue;

        try {
          const originalText = message.message;
          if (!originalText) continue;

          const rewrittenText = await this.rewriteContent(originalText);

          // Используем 'user.targetChannel!' чтобы TS не ругался
          await this.bot.telegram.sendMessage(user.targetChannel!, rewrittenText, { 
            parse_mode: 'HTML' 
          });
          
          console.log(`[OK] Пост переслан в ${user.targetChannel}`);
        } catch (e) {
          console.error(`[ERR] Ошибка пересылки: ${e.message}`);
        }
      }
    });
  }

  async rewriteContent(text: string): Promise<string> {
    return `✨ <b>РЕРАЙТ:</b>\n\n${text}\n\n<i>Отредактировано ИИ</i>`;
  }

  async getUser(userId: number) {
    return this.userModel.findOne({ userId });
  }

  async updateUser(userId: number, data: Partial<User>) {
    return this.userModel.findOneAndUpdate({ userId }, data, { upsert: true, new: true });
  }

  async getAllUsers() {
    return this.userModel.find();
  }
}