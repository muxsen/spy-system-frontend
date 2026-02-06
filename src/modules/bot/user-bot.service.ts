import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserSchema } from '../users/schemas/user.schema'; 
import { ConfigService } from '@nestjs/config';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import * as input from 'input'; 

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger('BotService');
  private client: TelegramClient;
  
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initGramJS();
  }

  private async initGramJS() {
    const apiId = Number(this.configService.get<string>('API_ID'));
    const apiHash = this.configService.get<string>('API_HASH') || '';
    const sessionStr = this.configService.get<string>('SESSION') || '';
    const session = new StringSession(sessionStr);

    this.client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });

    await this.client.start({
      phoneNumber: async () => this.configService.get<string>('PHONE') || '',
      password: async () => this.configService.get<string>('PASSWORD') || '',
      phoneCode: async () => {
         this.logger.warn('⚠️ Введите код из Telegram в терминале!');
         return await input.text('Код: ');
      },
      onError: (err) => this.logger.error(`GramJS Error: ${err.message}`),
    });

    this.logger.log('🚀 GramJS Юзербот запущен!');
    
    if (!sessionStr) {
      this.logger.debug(`SESSION=${this.client.session.save()}`);
    }

    this.client.addEventHandler(this.handleNewMessage.bind(this), new NewMessage({}));
  }

  // ЭТОТ МЕТОД МЫ ДОБАВИЛИ, ЧТОБЫ УБРАТЬ ОШИБКУ
  async sendPostToChannel(chatId: string, text: string): Promise<boolean> {
    try {
      await this.client.sendMessage(chatId, {
        message: text,
        parseMode: 'html',
      });
      this.logger.log(`✅ Сообщение успешно отправлено в ${chatId}`);
      return true;
    } catch (e) {
      this.logger.error(`❌ Ошибка отправки в канал: ${e.message}`);
      return false;
    }
  }

  private async handleNewMessage(event: NewMessageEvent) {
    const message = event.message;
    if (!message || !message.peerId) return;

    const incomingId = message.peerId.toString().replace('-100', '');
    const user = await this.userModel.findOne({ 
        sourceChannel: incomingId,
        hasAccess: true 
    });

    if (user && user.targetChannel) {
      this.logger.log(`📩 Перехват из ${incomingId} для юзера ${user.userId}`);
      
      const originalText = message.message || '';
      const finalPost = `📢 <b>Обновление:</b>\n\n${originalText}`;
      
      // Используем наш новый метод
      await this.sendPostToChannel(user.targetChannel, finalPost);
    }
  }

  // --- МЕТОДЫ БД ---
  async updateUser(userId: number, data: Partial<User>) {
    return this.userModel.findOneAndUpdate({ userId }, data, { upsert: true, new: true });
  }

  async getUser(userId: number) {
    return this.userModel.findOne({ userId });
  }

  async getAllUsers() {
    return this.userModel.find();
  }
}