import { Update, Start, Action, Ctx, On } from 'nestjs-telegraf';
import { Context as Telegram, Markup } from 'telegraf';
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

  // --- 1. СТАРТ ---
  @Start()
  async onStart(@Ctx() ctx: Telegram) {
    const userId = ctx.from!.id;
    console.log(`[START] Пользователь ${userId} запустил бота`);

    let user = await this.botService.getUser(userId);
    if (!user) {
      await this.botService.updateUser(userId, { userId, username: ctx.from?.username });
      user = await this.botService.getUser(userId);
    }

    if (userId === this.adminId) {
      return await ctx.reply('🚀 ПАНЕЛЬ УПРАВЛЕНИЯ', {
        reply_markup: Markup.keyboard([['👥 Пользователи']]).resize().reply_markup,
      });
    }

    // Проверка доступа (оплаты)
    if (user?.hasAccess) {
      if (!user.targetChannel) return this.sendStep1(ctx);
      if (!user.sourceChannel) return this.sendStep2(ctx);

      return await ctx.reply('🕵️ ВАША СЛЕЖКА АКТИВНА\n\nБот мониторит источник и готовит рерайты.', {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('⚙️ Сбросить настройки', 'reset_my_channels')],
        ]).reply_markup,
      });
    }

    // Если доступа нет — предлагаем оплатить
    return await ctx.reply('👋 Добро пожаловать! Для использования бота необходимо выбрать тарифный план:', {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('💎 Выбрать тариф', 'show_tariffs')],
      ]).reply_markup,
    });
  }

  // --- 2. СИСТЕМА ОПЛАТЫ (STARS) ---

  @Action('show_tariffs')
  async showTariffs(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    return await ctx.reply('Выберите подходящий период подписки:', {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('⭐️ 1 month — 100 Stars', 'pay_1_month')],
        [Markup.button.callback('⭐️ 3 months — 2050 Stars', 'pay_3_month')],
        [Markup.button.callback('⭐️ Forever — 5400 Stars', 'pay_forever')],
      ]).reply_markup,
    });
  }

  @Action(/pay_(1_month|3_month|forever)/)
  async onPay(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    const plan = ctx.match[1];
    
    let amount = 100;
    let label = 'Подписка на 1 месяц';
    
    if (plan === '3_month') { amount = 2050; label = 'Подписка на 3 месяца'; }
    if (plan === 'forever') { amount = 5400; label = 'Бессрочный доступ'; }

    return await ctx.sendInvoice({
      title: 'Подписка на бота',
      description: label,
      payload: `sub_${plan}_${ctx.from.id}`,
      provider_token: '', 
      currency: 'XTR',
      prices: [{ label: 'Звезды', amount: amount }],
    });
  }

  @On('pre_checkout_query')
  async onPreCheckout(@Ctx() ctx: any) {
    await ctx.answerPreCheckoutQuery(true);
  }

  @On('successful_payment')
  async onSuccessPay(@Ctx() ctx: any) {
    const userId = ctx.from.id;
    await this.botService.updateUser(userId, { hasAccess: true });
    await ctx.reply('✅ Оплата прошла успешно! Теперь вы можете приступить к настройке.');
    return this.sendStep1(ctx);
  }

  // --- 3. ОБРАБОТКА КНОПОК ---
  @Action('show_instruction')
  async onInstruction(@Ctx() ctx: any) {
    const user = await this.botService.getUser(ctx.from.id);
    if (!user?.hasAccess) return ctx.reply('Сначала необходимо оплатить подписку.');
    await ctx.answerCbQuery();
    return this.sendStep1(ctx);
  }

  @Action('check_step1')
  async onCheckStep1(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    await this.botService.updateUser(ctx.from.id, { tempStep: 'WAIT_TARGET_ID' });
    return ctx.reply('Пришлите ID вашего канала (приемника), например: <code>-100...</code>', { parse_mode: 'HTML' });
  }

  @Action('reset_my_channels')
  async onReset(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
    await this.botService.updateUser(ctx.from.id, { sourceChannel: '', targetChannel: '', tempStep: '' });
    return this.sendStep1(ctx);
  }

  // --- 4. ОБРАБОТКА СООБЩЕНИЙ ---
  @On('message')
  async onMessage(@Ctx() ctx: any) {
    const userId = ctx.from.id;
    const text = ctx.message?.text;
    if (!text) return;

    if (userId === this.adminId && text === '👥 Пользователи') {
      return this.onAdminUsers(ctx);
    }

    const user = await this.botService.getUser(userId);
    if (!user || text.startsWith('/')) return;

    if (!user.hasAccess && userId !== this.adminId) {
        return ctx.reply('Для работы с ботом оплатите подписку.', {
            reply_markup: Markup.inlineKeyboard([[Markup.button.callback('💎 Оплатить', 'show_tariffs')]]).reply_markup
        });
    }

    if (user.tempStep === 'WAIT_TARGET_ID') {
      try {
        const member = await ctx.telegram.getChatMember(text, ctx.botInfo.id);
        if (['administrator', 'creator'].includes(member.status)) {
          await this.botService.updateUser(userId, { targetChannel: text, tempStep: 'WAIT_SOURCE_ID' });
          await ctx.reply('✅ Бот подтвержден как администратор!');
          return this.sendStep2(ctx);
        } else {
          return ctx.reply('❌ Бот не администратор в этом канале.');
        }
      } catch (e) {
        return ctx.reply('❌ Ошибка! Бот не видит этот канал.');
      }
    }

    if (user.tempStep === 'WAIT_SOURCE_ID') {
      await this.botService.updateUser(userId, { sourceChannel: text.replace('-100', ''), tempStep: '' });
      await ctx.reply('📡 Связка создана!\n\nСистема шпионажа запущена.', { parse_mode: 'HTML' });
      return ctx.telegram.sendMessage(this.adminId, `🔔 Новая цель от @${ctx.from.username}: <code>${text}</code>`, { parse_mode: 'HTML' });
    }
  }

  // --- 5. ВСПОМОГАТЕЛЬНЫЕ ШАГИ ---
  private async sendStep1(ctx: any) {
    const botUsername = ctx.botInfo.username;
    return await ctx.reply(
      '🎯 ШАГ 1: ПРИЕМНИК\n\nДобавьте бота в канал и пришлите его ID.',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url('➕ Добавить бота', `https://t.me/${botUsername}?startchannel=true&admin=post_messages`)],
          [Markup.button.callback('✅ Я добавил, ввести ID', 'check_step1')]
        ]).reply_markup
      }
    );
  }

  private async sendStep2(ctx: any) {
    return ctx.reply('📡 ШАГ 2: ИСТОЧНИК\n\nПришлите ID канала-источника:');
  }

  // --- 6. АДМИНКА ---
  async onAdminUsers(ctx: any) {
    const users = await this.botService.getAllUsers();
    if (users.length === 0) return ctx.reply('Список пользователей пуст.');
    const buttons = users.map(u => [
      Markup.button.callback(`${u.hasAccess ? '🟢' : '🔴'} ${u.username || u.userId}`, `adm_v_${u.userId}`)
    ]);
    return await ctx.reply('📊 СПИСОК ПОЛЬЗОВАТЕЛЕЙ:', { 
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup 
    });
  }

  @Action(/^adm_v_(-?\d+)$/)
  async onAdminInfo(@Ctx() ctx: any) {
    const userId = Number(ctx.match[0].split('_')[2]);
    const user = await this.botService.getUser(userId);
    if (!user) return;
    
    await ctx.editMessageText(
      `👤 @${user.username}\nID: <code>${user.userId}</code>\nДоступ: ${user.hasAccess ? '✅' : '❌'}`, 
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback(user.hasAccess ? '🚫 Снять доступ' : '🎁 Дать доступ', `adm_gift_${user.userId}`)],
          [Markup.button.callback('⬅️ Назад', 'adm_back')]
        ]).reply_markup
      }
    );
  }

  @Action(/^adm_gift_(-?\d+)$/)
  async onGift(@Ctx() ctx: any) {
    const userId = Number(ctx.match[0].split('_')[2]);
    const user = await this.botService.getUser(userId);
    if (!user) return;

    const newAccessStatus = !user.hasAccess;
    await this.botService.updateUser(userId, { hasAccess: newAccessStatus });

    // --- НОВАЯ ЛОГИКА УВЕДОМЛЕНИЯ ---
    if (newAccessStatus === false) {
      try {
        await ctx.telegram.sendMessage(userId, '🛑 <b>У вас сняли доступ.</b>\n\nДля дальнейшего использования бота, пожалуйста, оплатите подписку.', {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('💎 Оплатить', 'show_tariffs')]
          ]).reply_markup
        });
      } catch (e) {
        console.error(`Не удалось отправить сообщение пользователю ${userId}: ${e.message}`);
      }
    }
    // --------------------------------

    return this.onAdminInfo(ctx);
  }

  @Action('adm_back')
  async onBack(@Ctx() ctx: any) {
    await ctx.deleteMessage();
    return this.onAdminUsers(ctx);
  }
}