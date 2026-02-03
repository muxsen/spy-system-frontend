import { Update, Start, Ctx, Action, On, Hears } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';

@Update()
export class BotUpdate {
  constructor(@InjectModel('User') private userModel: Model<User>) {}

  // --- ЛОГИКА ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ---

  @Start()
  async onStart(@Ctx() ctx: Context) {
    if (!ctx.from) return;

    const user = ctx.from;
    const adminId = Number(process.env.ADMIN_ID || 0);

    // Сохраняем или обновляем пользователя
    let dbUser = await this.userModel.findOne({ tgId: user.id });
    if (!dbUser) {
      dbUser = await this.userModel.create({
        tgId: user.id,
        username: user.username || 'no_name',
        firstName: user.first_name,
        isPaid: false
      });
      
      // Уведомление админу о новом юзере
      await ctx.telegram.sendMessage(adminId, 
        `🔔 <b>Новый пользователь!</b>\nИмя: ${user.first_name}\nUsername: @${user.username || 'скрыт'}`,
        { parse_mode: 'HTML' }
      );
    }

    // Если зашел админ — даем кнопки управления
    if (user.id === adminId) {
      return ctx.reply('💻 Панель администратора активирована.', 
        Markup.keyboard([['👥 Список пользователей']]).resize()
      );
    }

    // Обычное приветствие
    await ctx.replyWithHTML(
      `🤖 <b>Привет, ${user.first_name}!</b>\n\nЯ — AI Aggregator. Я перехватываю новости из каналов, очищаю их от рекламы и ссылок через ИИ и пощу в твой канал.\n\n👇 Нажми кнопку, чтобы выбрать тариф:`,
      Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Подключить программу', 'tariffs')]
      ])
    );
  }

  @Action('tariffs')
  async showTariffs(@Ctx() ctx: Context) {
    const tariffsKB = Markup.inlineKeyboard([
      [Markup.button.callback('📅 1 Месяц — 60 000 сум', 'confirm_60000')],
      [Markup.button.callback('📅 3 Месяца — 150 000 сум', 'confirm_150000')],
      [Markup.button.callback('📅 6 Месяцев — 280 000 сум', 'confirm_280000')],
      [Markup.button.callback('📅 1 Год — 500 000 сум', 'confirm_500000')],
      [Markup.button.callback('♾ Навсегда — 1 000 000 сум', 'confirm_1000000')],
      [Markup.button.callback('🔙 Назад', 'back_to_start')]
    ]);

    await ctx.editMessageText('📋 <b>Выберите подходящий тариф:</b>', {
      parse_mode: 'HTML',
      ...tariffsKB
    });
  }

  @Action(/^confirm_(\d+)$/)
  async confirmTariff(@Ctx() ctx: any) {
    const amount = ctx.match[1];
    await ctx.editMessageText(`💰 Вы выбрали тариф на <b>${amount} сум</b>.\nВы уверены, что хотите перейти к оплате?`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Оплатить', `pay_${amount}`)],
        [Markup.button.callback('🔙 Выбрать другой', 'tariffs')]
      ])
    });
  }

  @Action(/^pay_(\d+)$/)
  async handlePayment(@Ctx() ctx: any) {
    const amount = parseInt(ctx.match[1]);
    const providerToken = process.env.PAYMENT_TOKEN!;

    await ctx.replyWithInvoice({
      title: 'Доступ к AI Aggregator',
      description: `Активация подписки на сумму ${amount} сум`,
      payload: `sub_${ctx.from.id}`,
      provider_token: providerToken,
      currency: 'UZS',
      prices: [{ label: 'Подписка', amount: amount * 100 }], // Умножаем на 100 для валют без копеек
      start_parameter: 'get_access'
    });
  }

  @On('successful_payment')
  async onPaymentSuccess(@Ctx() ctx: any) {
    await this.userModel.updateOne({ tgId: ctx.from.id }, { isPaid: true });
    
    const webAppUrl = process.env.WEBAPP_URL!;
    await ctx.replyWithHTML(
      '🎉 <b>Оплата прошла успешно!</b>\nТеперь вам доступен Mini App для настройки каналов.',
      Markup.inlineKeyboard([
        [Markup.button.webApp('📱 Открыть Mini App', webAppUrl)]
      ])
    );
  }

  // --- АДМИН-ПАНЕЛЬ (УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ) ---

  @Hears('👥 Список пользователей')
  async adminUserList(@Ctx() ctx: Context) {
    const adminId = Number(process.env.ADMIN_ID || 0);
    if (ctx.from?.id !== adminId) return;

    const users = await this.userModel.find().limit(20); // Берем последних 20
    if (!users.length) return ctx.reply('Пока нет пользователей.');

    const buttons = users.map(u => [
      Markup.button.callback(`${u.isPaid ? '🟢' : '🔴'} ${u.firstName}`, `manage_${u.tgId}`)
    ]);

    await ctx.reply('Выберите пользователя для управления:', Markup.inlineKeyboard(buttons));
  }

  @Action(/^manage_(\d+)$/)
  async manageUser(@Ctx() ctx: any) {
    const userId = ctx.match[1];
    const user = await this.userModel.findOne({ tgId: userId });
    if (!user) return ctx.answerCbQuery('Пользователь не найден.');

    const status = user.isPaid ? '✅ Активен' : '❌ Нет доступа';
    const text = `👤 <b>Пользователь:</b> ${user.firstName}\n🆔: <code>${user.tgId}</code>\nДоступ: ${status}`;

    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🎁 Выдать доступ (Free)', `grant_${userId}`)],
        [Markup.button.callback('🚫 Забрать доступ', `revoke_${userId}`)],
        [Markup.button.callback('🔙 К списку', 'back_to_list')]
      ])
    });
  }

  @Action(/^grant_(\d+)$/)
  async grantAccess(@Ctx() ctx: any) {
    const userId = ctx.match[1];
    await this.userModel.updateOne({ tgId: userId }, { isPaid: true });
    await ctx.answerCbQuery('Доступ выдан!');
    
    // Уведомляем пользователя
    await ctx.telegram.sendMessage(userId, '🎁 Вам выдан доступ к программе администратором!');
    await this.manageUser(ctx);
  }

  @Action(/^revoke_(\d+)$/)
  async revokeAccess(@Ctx() ctx: any) {
    const userId = ctx.match[1];
    await this.userModel.updateOne({ tgId: userId }, { isPaid: false });
    await ctx.answerCbQuery('Доступ отозван.');
    await this.manageUser(ctx);
  }

  @Action('back_to_list')
  async backToList(ctx: Context) {
    await this.adminUserList(ctx);
  }

  @Action('back_to_start')
  async backToStart(ctx: Context) {
    await ctx.editMessageText('Вы вернулись в начало. Нажмите "Подключить программу" для выбора тарифа.');
  }
}