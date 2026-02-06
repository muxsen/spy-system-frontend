import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import { ConfigService } from '@nestjs/config';
import { BotService } from './bot.service';

@Injectable()
export class UserBotService implements OnModuleInit {
  private readonly logger = new Logger('UserBot');
  private client: TelegramClient;

  constructor(
    private configService: ConfigService,
    private botService: BotService,
  ) {}

  async onModuleInit() {
    // Задержка запуска, чтобы база успела инициализироваться
    setTimeout(() => this.startUserBot(), 2000);
  }

  async startUserBot() {
    const apiId = Number(this.configService.get<string>('TELEGRAM_API_ID'));
    const apiHash = this.configService.get<string>('TELEGRAM_API_HASH') || '';
    const sessionString = this.configService.get<string>('TELEGRAM_SESSION') || '';

    this.client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
      connectionRetries: 5,
    });

    try {
      await this.client.start({
        phoneNumber: async () => '',
        phoneCode: async () => '',
        onError: (err) => this.logger.error('Ошибка GramJS: ' + err.message),
      });

      this.logger.log('🚀 ЮЗЕРБОТ ЗАПУЩЕН И МОНИТОРИТ КАНАЛЫ');

      this.client.addEventHandler(async (event: NewMessageEvent) => {
        const message = event.message;
        
        // 1. Извлекаем ID отправителя (канала или чата)
        const peerId = message.peerId as any;
        const incomingRawId = (peerId?.channelId || peerId?.userId || peerId?.chatId)?.toString();

        if (!incomingRawId) return;

        // Лог для проверки в консоли
        this.logger.debug(`👀 Активность в ID: ${incomingRawId}`);

        try {
          const users = await this.botService.getAllUsers();
          
          // 2. Ищем подписчика, сравнивая только цифровые значения
          const subscriber = users.find((u) => {
            if (!u.hasAccess || !u.sourceChannel || !u.targetChannel) return false;
            
            // Очищаем ID от -100, минусов и прочего (оставляем только цифры)
            const cleanSavedSource = u.sourceChannel.toString().replace(/\D/g, '');
            const cleanIncoming = incomingRawId.replace(/\D/g, '');
            
            return cleanSavedSource === cleanIncoming;
          });

          if (subscriber) {
            this.logger.log(`🎯 СОВПАДЕНИЕ! Делаю рерайт для @${subscriber.username}`);

            const originalText = message.message || "";
            if (!originalText) return;

            // 3. Формируем текст рерайта
            const rewrittenText = `📣 <b>ОПЕРАТИВНЫЕ НОВОСТИ</b>\n\n${originalText}\n\n📍 <i>PostBot AI для Мухсэна</i>`;

            // 4. Отправляем в целевой канал пользователя
            await this.client.sendMessage(subscriber.targetChannel, {
              message: rewrittenText,
              parseMode: 'html',
            });
            
            this.logger.log('✅ Успешно опубликовано в канал пользователя!');
          }
        } catch (err) {
          this.logger.error('Ошибка в обработчике событий: ' + err.message);
        }
      }, new NewMessage({}));

    } catch (e) {
      this.logger.error('Критическая ошибка запуска Юзербота: ' + e.message);
    }
  }
}