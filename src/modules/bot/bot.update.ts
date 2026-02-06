import { Update, Start, Action, Ctx, On, Hears } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { BotService } from './bot.service';
import { ConfigService } from '@nestjs/config';

@Update()
export class BotUpdate {
  private readonly adminId: number;

  constructor(
    private readonly botService: BotService,
    private readonly configService: ConfigService,
  ) {
    this.adminId = Number(this.configService.get<string>('ADMIN_ID'));
  }

  // --- ГЛАВНОЕ МЕНЮ ---
  private async getMainMenu(userId: number) {
    if (userId === this.adminId) {
      return Markup.keyboard([['👥 Пользователи']]).resize();
    } else {
      return Markup.keyboard([['📖 Инструкция']]).resize();
    }
  }

  // 1. СТАРТ
  @Start()
  async onStart(@Ctx() ctx: Context) {
    const userId = ctx.from!.id;
    await this.botService.updateUser(userId, { userId, username: ctx.from?.username });
    
    if (userId === this.adminId) {
      return await ctx.reply('👑 <b>Салам, Мухсэн!</b>\nАдмин-панель активна.', {
        parse_mode: 'HTML',
        ...Markup.keyboard([['👥 Пользователи']]).resize()
      });
    }

    const menu = await this.getMainMenu(userId);
    await ctx.reply('👋 Привет! Я готов к работе.', menu);
  }

  // 2. ИНСТРУКЦИЯ
  @Hears('📖 Инструкция')
  async onHearsInstruction(@Ctx() ctx: any) {
    await this.sendInstruction(ctx);
  }

  @Action('show_inst')
  async onInstAction(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    await this.sendInstruction(ctx);
  }

  private async sendInstruction(ctx: any) {
    const text = `📖 <b>ИНСТРУКЦИЯ:</b>\n\n` +
                 `1️⃣ Нажмите "Подключить" и поделитесь контактом.\n` +
                 `2️⃣ Дождитесь одобрения админа.\n` +
                 `3️⃣ Добавьте бота в свой канал.\n` +
                 `4️⃣ Перешлите пост из канала-источника.`;
    
    const inlineBtn = Markup.inlineKeyboard([[Markup.button.callback('🚀 Подключить', 'ask_contact')]]);
    
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', ...inlineBtn });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', ...inlineBtn });
    }
  }

  // 3. РЕГИСТРАЦИЯ
  @Action('ask_contact')
  async onAskContact(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    await ctx.reply('📱 Нажмите кнопку ниже, чтобы поделиться номером:', 
      Markup.keyboard([[Markup.button.contactRequest('📲 Поделиться номером')]]).oneTime().resize()
    );
  }

  @On('contact')
  async onContact(@Ctx() ctx: any) {
    const userId = ctx.from.id;
    await this.botService.updateUser(userId, { phone: ctx.message.contact.phone_number });
    await ctx.reply('✅ Контакт сохранен! Ожидайте активации доступа.', {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🌟 100 Stars', 'pay_100')],
        [Markup.button.callback('🌟 250 Stars', 'pay_250')]
      ])
    });
  }

  // 4. ОПЛАТА
  @Action(/^pay_(.+)$/)
  async onPay(@Ctx() ctx: any) {
    const amount = Number(ctx.match[1]);
    await ctx.replyWithInvoice({
      title: 'Подписка PostBot',
      description: `Активация доступа`,
      payload: `sub_${amount}`,
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: 'Stars', amount }],
    });
  }

  @On('successful_payment')
  async onPaySuccess(@Ctx() ctx: any) {
    await this.activateClient(ctx, ctx.from.id);
  }

  // --- 5. АКТИВАЦИЯ (С ДВУМЯ КНОПКАМИ) ---
  private async activateClient(ctx: any, userId: number) {
    await this.botService.updateUser(userId, { hasAccess: true });
    
    const text = `🎉 <b>ДОСТУП АКТИВИРОВАН!</b>\n\n` +
                 `Теперь сделайте следующее:\n\n` +
                 `1️⃣ Добавьте бота в свой канал как <b>Администратора</b>.\n` +
                 `2️⃣ Нажмите кнопку <b>"Я подключил 👌"</b>.\n` +
                 `3️⃣ Перешлите сюда пост из канала-источника.`;

    const addBotUrl = `https://t.me/${ctx.botInfo.username}?startchannel=true`;

    try {
      await ctx.telegram.sendMessage(userId, text, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.url('➕ Добавить в канал', addBotUrl)],
          [Markup.button.callback('Я подключил 👌', 'check_connection')]
        ])
      });
    } catch (e) {
      console.error('Ошибка уведомления:', e.message);
    }
  }

  @Action('check_connection')
  async onCheckConnection(@Ctx() ctx: any) {
    await ctx.answerCbQuery('Принято!');
    await ctx.reply('📡 <b>Последний шаг:</b>\n\nОтправьте в свой канал любое тестовое сообщение, а затем <b>перешлите</b> его мне сюда.', { parse_mode: 'HTML' });
  }

  // 6. ОБРАБОТКА ПЕРЕСЫЛКИ И СЛУЖЕБНЫХ СООБЩЕНИЙ
  @On('message')
  async onMessage(@Ctx() ctx: any) {
    const userId = ctx.from.id;
    const text = ctx.message.text || ctx.message.caption;

    // Проверка админ-команд
    if (userId === this.adminId && text === '👥 Пользователи') {
      return await this.onAdminUsers(ctx);
    }

    // ЛОГИКА ОПРЕДЕЛЕНИЯ КАНАЛОВ
    if (ctx.message.forward_from_chat) {
      const chat = ctx.message.forward_from_chat;
      const rawId = chat.id.toString().replace(/-100/g, ''); // Чистый ID

      // Проверяем: если бот админ в этом канале, значит это TARGET
      try {
        const member = await ctx.telegram.getChatMember(chat.id, ctx.botInfo.id);
        if (member.status === 'administrator') {
          await this.botService.updateUser(userId, { targetChannel: chat.id.toString() });
          return await ctx.reply(`🎯 <b>Ваш канал привязан!</b>\nСюда я буду постить рерайты.`, { parse_mode: 'HTML' });
        }
      } catch (e) {
        // Если не админ, значит это канал ИСТОЧНИК
        await this.botService.updateUser(userId, { sourceChannel: rawId });
        return await ctx.reply(`✅ <b>Источник привязан!</b>\nЯ буду следить за ID: <code>${rawId}</code>`, { parse_mode: 'HTML' });
      }
    }
  }

  // --- 7. АДМИН-ПАНЕЛЬ ---
  @Hears('👥 Пользователи')
  async onAdminUsers(@Ctx() ctx: any) {
    if (ctx.from.id !== this.adminId) return;
    const users = await this.botService.getAllUsers();
    if (!users.length) return ctx.reply('Пользователей пока нет.');
    
    const buttons = users.map(u => [
      Markup.button.callback(`${u.hasAccess ? '🟢' : '🔴'} ${u.username || u.userId}`, `adm_v_${u.userId}`)
    ]);
    await ctx.reply('📊 Управление пользователями:', Markup.inlineKeyboard(buttons));
  }

  @Action(/^adm_v_(.+)$/)
  async onAdminInfo(@Ctx() ctx: any) {
    const user = await this.botService.getUser(Number(ctx.match[1]));
    if (!user) return;
    
    const info = `👤 <b>Юзер:</b> @${user.username || 'n/a'}\n` +
                 `🆔 <b>ID:</b> <code>${user.userId}</code>\n` +
                 `🔓 <b>Доступ:</b> ${user.hasAccess ? '✅' : '❌'}\n` +
                 `📥 <b>Источник:</b> ${user.sourceChannel || 'не задан'}\n` +
                 `📤 <b>Куда постим:</b> ${user.targetChannel || 'не задан'}`;

    await ctx.editMessageText(info, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(user.hasAccess ? '🚫 Снять доступ' : '🎁 Дать доступ', `adm_gift_${user.userId}`)],
        [Markup.button.callback('⬅️ Назад', 'adm_back')]
      ])
    });
  }

  @Action(/^adm_gift_(.+)$/)
  async onGift(@Ctx() ctx: any) {
    const userId = Number(ctx.match[1]);
    const user = await this.botService.getUser(userId);
    const newStatus = !user.hasAccess;

    await this.botService.updateUser(userId, { hasAccess: newStatus });

    if (newStatus) {
      await this.activateClient(ctx, userId);
      await ctx.answerCbQuery('🎁 Доступ выдан!');
    } else {
      await ctx.answerCbQuery('🚫 Доступ закрыт');
    }
    await this.onAdminInfo(ctx);
  }

  @Action('adm_back')
  async onBack(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    await this.onAdminUsers(ctx);
  }

  @On('pre_checkout_query')
  async onPre(@Ctx() ctx: any) { await ctx.answerPreCheckoutQuery(true); }
}