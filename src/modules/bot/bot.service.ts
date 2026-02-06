import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { AiService } from '../ai/ai.service';

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
    private aiService: AiService, // Внедряем твой ИИ сервис
  ) {
    this.myApiId = Number(this.configService.get<number>('TELEGRAM_API_ID'));
    this.myApiHash = this.configService.get<string>('TELEGRAM_API_HASH') || '';
    this.mySession = this.configService.get<string>('TELEGRAM_SESSION') || '';
  }

  async onModuleInit() {
    if (this.mySession) {
      await this.initSpy();
    } else {
      console.warn('⚠️ Шпион не запущен: нет TELEGRAM_SESSION в .env');
    }
  }

  async initSpy() {
    const session = new StringSession(this.mySession);
    this.client = new TelegramClient(session, this.myApiId, this.myApiHash, {
      connectionRetries: 5,
    });

    await this.client.connect();
    console.log("🕵️ Шпион успешно подключен и слушает каналы!");

    this.client.addEventHandler(async (event: any) => {
      const message = event.message;
      if (!message || !message.peerId) return;

      const channelId = message.peerId.channelId?.toString();
      if (!channelId) return;

      // Ищем в базе всех, кто следит за этим источником
      const subscribers = await this.userModel.find({ sourceChannel: channelId });

      for (const user of subscribers) {
        if (!user.targetChannel || !user.hasAccess) continue;

        try {
          const originalText = message.message;
          if (!originalText) continue;

          console.log(`[SPY] Обработка поста для пользователя ${user.userId}`);
          
          // ВЫЗОВ ТВОЕГО НОВОГО ИИ (GPT)
          const rewrittenText = await this.aiService.rewrite(originalText);

          // Отправка в канал-приемник
          await this.bot.telegram.sendMessage(user.targetChannel, rewrittenText, { 
            parse_mode: 'HTML' 
          });
          
          console.log(`[OK] Пост переслан в ${user.targetChannel}`);
        } catch (e) {
          console.error(`[ERR] Ошибка при пересылке: ${e.message}`);
        }
      }
    });
  }

  // Методы управления пользователями
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