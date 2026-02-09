import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { ConfigService } from '@nestjs/config';
import * as input from 'input';
/**
 * Represents a book.
 * @constructor
 * fjfgjlkdfjglk;dsf
 */
@Injectable()
export class UserBotService implements OnModuleInit {
  private readonly logger = new Logger(UserBotService.name);
  private client: TelegramClient;
  private readonly apiId: number;
  private readonly apiHash: string;
  private session: StringSession;

  constructor(private configService: ConfigService) {
    // Данные из твоего .env
    this.apiId = Number(this.configService.get<string>('TELEGRAM_API_ID'));
    this.apiHash = this.configService.get<string>('TELEGRAM_API_HASH') || '';
    // Сессия (после первого входа сохрани её сюда)
    this.session = new StringSession(this.configService.get<string>('TELEGRAM_SESSION') || '');
  }

  async onModuleInit() {
    await this.startUserBot();
  }

  async startUserBot() {
    this.client = new TelegramClient(this.session, this.apiId, this.apiHash, {
      connectionRetries: 5,
    });

    // --- ПРОЦЕСС ВХОДА ---
    await this.client.start({
      phoneNumber: async () => await input.text('Введите номер (с +7...): '),
      password: async () => await input.text('2FA Пароль (если есть): '),
      phoneCode: async () => await input.text('Код подтверждения: '),
      onError: (err) => this.logger.error('Ошибка:', err),
    });

    this.logger.log('✅ Юзербот успешно запущен!');

    // Выводим сессию. Скопируй её в .env, чтобы не вводить код каждый раз
    const sessionString = this.client.session.save() as unknown as string;
    if (!this.configService.get('TELEGRAM_SESSION')) {
      this.logger.warn('⚠️ СКОПИРУЙ ЭТО В .env (TELEGRAM_SESSION):');
      console.log(sessionString);
    }

    // --- НАСТРОЙКА КАНАЛОВ ---
    const SOURCE_ID = 'source_channel'; // Юзернейм или ID источника
    const TARGET_ID = 'target_channel'; // Юзернейм или ID твоего канала

    // --- МОНИТОРИНГ 24/7 ---
    this.client.addEventHandler(async (event: NewMessageEvent) => {
      const message = event.message;

      // Проверяем, что пост пришел из канала
      if (message.peerId instanceof Api.PeerChannel) {
        try {
          const entity = await this.client.getEntity(message.peerId);

          // Проверяем, тот ли это канал
          if ('username' in entity && entity.username === SOURCE_ID) {
            const text = message.message;
            if (!text) return;

            this.logger.log('📩 Поймал новый пост!');

            // Твой будущий ИИ-рерайт
            const rewrittenText = `✨ <b>АВТО-ПОСТ:</b>\n\n${text}\n\n🤖 <i>By PostBot AI</i>`;

            await this.client.sendMessage(TARGET_ID, {
              message: rewrittenText,
              parseMode: 'html',
            });

            this.logger.log('🚀 Опубликовано!');
          }
        } catch (e) {
          this.logger.error('Ошибка:', e.message);
        }
      }
    }, new NewMessage({}));
  }
}