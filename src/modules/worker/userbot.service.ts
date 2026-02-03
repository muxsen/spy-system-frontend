import { Injectable, OnModuleInit } from '@nestjs/common';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class UserbotService implements OnModuleInit {
  private client: TelegramClient;

  constructor(
    @InjectModel('User') private userModel: Model<User>,
    private aiService: AiService,
  ) {}

  async onModuleInit() {
    // Добавляем !, чтобы TS не ругался на undefined
    const session = new StringSession(process.env.TELEGRAM_SESSION!);
    const apiId = Number(process.env.TELEGRAM_API_ID!);
    const apiHash = process.env.TELEGRAM_API_HASH!;

    this.client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
    
    await this.client.connect();

    this.client.addEventHandler(async (event: any) => {
      const message = event.message;
      if (!message?.text) return;

      const subscribers = await this.userModel.find({ isPaid: true });

      for (const sub of subscribers) {
        if (sub.sourceChannelId && sub.targetChannelId) {
            const cleanText = await this.aiService.cleanText(message.text);
            // Используем прямой вызов клиента для отправки
            await this.client.sendMessage(sub.targetChannelId, { message: cleanText });
        }
      }
    }, new NewMessage({}));
  }
}