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

    // Панель администратора
    if (userId === this.adminId) {
      return await ctx.reply('🚀 ПАНЕЛЬ УПРАВЛЕНИЯ', 
        Markup.keyboard([['👥 Пользователи']]).resize()
      );
    }

    // Проверка доступа и состояния настройки
    if (user?.hasAccess) {
      if (!user.targetChannel) return this.sendStep1(ctx);
      if (!user.sourceChannel) return this.sendStep2(ctx);

      return await ctx.reply('🕵️ <b>ВАША СЛЕЖКА АКТИВНА</b>\n\nБот мониторит источник и готовит рерайты.', {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⚙️ Сбросить настройки', 'reset_my_channels')]
        ])
      });
    }

    return await ctx.reply('👋 Добро пожаловать!', 
      Markup.inlineKeyboard([[Markup.button.callback('🚀 Начать настройку', 'show_instruction')]])
    );
  }

  // --- 2. ОБРАБОТКА КНОПОК ---
  @Action('show_instruction')
  async onInstruction(@Ctx() ctx: any) {
    console.log(`[ACTION] Нажата инструкция пользователем ${ctx.from.id}`);
    await ctx.answerCbQuery();
    // Временно активируем доступ для теста
    await this.botService.updateUser(ctx.from.id, { hasAccess: true });
    return this.sendStep1(ctx);
  }

  @Action('check_step1')
  async onCheckStep1(@Ctx() ctx: any) {
    console.log(`[ACTION] Нажата кнопка ввода ID пользователем ${ctx.from.id}`);
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

  // --- 3. ОБРАБОТКА СООБЩЕНИЙ ---
  @On('message')
  async onMessage(@Ctx() ctx: any) {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    console.log(`[MSG] От ${userId}: ${text}`);

    if (userId === this.adminId && text === '👥 Пользователи') {
      return this.onAdminUsers(ctx);
    }

    const user = await this.botService.getUser(userId);
    if (!user || (text && text.startsWith('/'))) return;

    // ШАГ 1: ПРОВЕРКА И ПРИВЯЗКА ПРИЕМНИКА
    if (user.tempStep === 'WAIT_TARGET_ID') {
      console.log(`[LOG] Проверка прав бота в ${text}`);
      try {
        const member = await ctx.telegram.getChatMember(text, ctx.botInfo.id);
        if (['administrator', 'creator'].includes(member.status)) {
          await this.botService.updateUser(userId, { targetChannel: text, tempStep: 'WAIT_SOURCE_ID' });
          await ctx.reply('✅ Бот подтвержден как администратор!');
          return this.sendStep2(ctx);
        } else {
          return ctx.reply('❌ Бот не является администратором в этом канале. Дайте ему права и пришлите ID снова.');
        }
      } catch (e) {
        console.error(`[ERROR] Ошибка проверки канала: ${e.message}`);
        return ctx.reply('❌ Ошибка! Бот не видит этот канал. Сначала добавьте его в канал как администратора, а потом пришлите ID.');
      }
    }

    // ШАГ 2: ПРИВЯЗКА ИСТОЧНИКА
    if (user.tempStep === 'WAIT_SOURCE_ID') {
      console.log(`[LOG] Привязка источника ${text} для ${userId}`);
      await this.botService.updateUser(userId, { sourceChannel: text.replace('-100', ''), tempStep: '' });
      await ctx.reply('📡 <b>Связка создана!</b>\n\nСистема шпионажа запущена. Ожидайте новых постов.', { parse_mode: 'HTML' });
      return ctx.telegram.sendMessage(this.adminId, `🔔 Новая цель от @${ctx.from.username}: <code>${text}</code>`, { parse_mode: 'HTML' });
    }
  }

  // --- 4. ВСПОМОГАТЕЛЬНЫЕ ШАГИ ---
  private async sendStep1(ctx: any) {
    const botUsername = ctx.botInfo.username;
    return await ctx.reply(
      '🎯 <b>ШАГ 1: ПРИЕМНИК (ВАШ КАНАЛ)</b>\n\n' +
      '1. Добавьте бота в ВАШ канал администратором.\n' +
      '2. После этого нажмите кнопку ниже и пришлите ID канала.', 
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.url('➕ Добавить бота', `https://t.me/${botUsername}?startchannel=true&admin=post_messages`)],
          [Markup.button.callback('✅ Я добавил, ввести ID', 'check_step1')]
        ])
      }
    );
  }

  private async sendStep2(ctx: any) {
    return ctx.reply('📡 <b>ШАГ 2: ИСТОЧНИК (ЧУЖОЙ КАНАЛ)</b>\n\nПришлите ID канала, откуда мы будем брать посты для рерайта:');
  }

  // --- 5. АДМИНКА ---
  async onAdminUsers(ctx: any) {
    const users = await this.botService.getAllUsers();
    if (users.length === 0) return ctx.reply('Список пользователей пуст.');

    const buttons = users.map(u => [
      Markup.button.callback(`${u.hasAccess ? '🟢' : '🔴'} ${u.username || u.userId}`, `adm_v_${u.userId}`)
    ]);
    return await ctx.reply('📊 СПИСОК ПОЛЬЗОВАТЕЛЕЙ:', Markup.inlineKeyboard(buttons));
  }

  @Action(/^adm_v_(-?\d+)$/)
  async onAdminInfo(@Ctx() ctx: any) {
    const userId = Number(ctx.match[0].split('_')[2]);
    const user = await this.botService.getUser(userId);
    if (!user) return;
    await ctx.editMessageText(
      `👤 @${user.username}\nID: <code>${user.userId}</code>\nДоступ: ${user.hasAccess ? '✅' : '❌'}\nПриемник: <code>${user.targetChannel || 'нет'}</code>\nИсточник: <code>${user.sourceChannel || 'нет'}</code>`, 
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(user.hasAccess ? '🚫 Снять доступ' : '🎁 Дать доступ', `adm_gift_${user.userId}`)],
          [Markup.button.callback('⬅️ Назад', 'adm_back')]
        ])
      }
    );
  }

  @Action(/^adm_gift_(-?\d+)$/)
  async onGift(@Ctx() ctx: any) {
    const userId = Number(ctx.match[0].split('_')[2]);
    const user = await this.botService.getUser(userId);
    if (!user) return;
    await this.botService.updateUser(userId, { hasAccess: !user.hasAccess });
    return this.onAdminInfo(ctx);
  }

  @Action('adm_back')
  async onBack(@Ctx() ctx: any) {
    await ctx.deleteMessage();
    return this.onAdminUsers(ctx);
  }
}