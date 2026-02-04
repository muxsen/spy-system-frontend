import { Update, Start, Hears, Action, Ctx } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { ConfigService } from '@nestjs/config';

// Временная база данных (в реальном проекте будет в БД)
interface User {
  id: number;
  name: string;
  hasAccess: boolean;
}

@Update()
export class BotUpdate {
  private adminId: number;
  private webAppUrl: string;
  private users: User[] = [];

  constructor(private config: ConfigService) {
    this.adminId = Number(this.config.get<string>('ADMIN_ID'));
    this.webAppUrl = this.config.get<string>('WEBAPP_URL') || 'https://your-default-webapp-url.com';
  }

  // 1. КОМАНДА /START (И для Админа, и для Юзера)
  @Start()
  async onStart(@Ctx() ctx: Context) {
    const userId = ctx.from!.id;
    const firstName = ctx.from!.first_name;
    const isAdmin = userId === this.adminId;

    // Регистрация юзера
    if (!this.users.find((u) => u.id === userId)) {
      this.users.push({ id: userId, name: firstName, hasAccess: false });
      if (!isAdmin) {
        await ctx.telegram.sendMessage(this.adminId, `🔔 Новый юзер: ${firstName} (ID: ${userId})`);
      }
    }

    if (isAdmin) {
      return ctx.reply(`👋 Привет, Админ!`, 
        Markup.keyboard([
          ['👥 Пользователи', '📊 Статистика'],
          ['🚀 Открыть Mini App', '🏠 Меню']
        ]).resize()
      );
    } else {
      return ctx.reply(`👋 Привет, ${firstName}!\n🤖 Spy System готова. Выбери тариф:`, 
        Markup.inlineKeyboard([[Markup.button.callback('💎 Посмотреть тарифы', 'show_tariffs')]])
      );
    }
  }

  // --- ЛОГИКА ПОЛЬЗОВАТЕЛЯ ---

  @Action('show_tariffs')
  async showTariffs(@Ctx() ctx: Context) {
    const text = `💎 **Наши тарифы:**\n\n1️⃣ 1 месяц — 60 000 сум\n2️⃣ 3 месяца — 150 000 сум\n3️⃣ Навсегда — 1 000 000 сум`;
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💳 Выбрать и оплатить', 'confirm_payment')],
        [Markup.button.callback('⬅️ Назад', 'back_to_start')]
      ])
    });
  }

  @Action('confirm_payment')
  async confirmPayment(@Ctx() ctx: Context) {
    await ctx.reply('Вы уверены? После оплаты доступ откроется автоматически.', 
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Оплатить', 'success_pay')],
        [Markup.button.callback('❌ Отмена', 'show_tariffs')]
      ])
    );
  }

  @Action('success_pay')
  async successPay(@Ctx() ctx: Context) {
    await ctx.reply('🎉 Оплата прошла! Пользуйтесь на здоровье.', 
      Markup.inlineKeyboard([[Markup.button.webApp('🚀 Открыть Mini App', this.webAppUrl)]])
    );
  }

  // --- ЛОГИКА АДМИНА ---

  @Hears('👥 Пользователи')
  async listUsers(@Ctx() ctx: Context) {
  
    if (this.users.length === 0) return ctx.reply('Пусто.');

    const buttons = this.users.map((u) => [
      Markup.button.callback(`${u.name} [${u.hasAccess ? '✅' : '❌'}]`, `manage_${u.id}`)
    ]);
    await ctx.reply('Управление пользователями:', Markup.inlineKeyboard(buttons));
  }

  @Action(/^manage_(.+)$/)
  async manageUser(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const userId = Number(ctx.match[1]);
    const user = this.users.find((u) => u.id === userId);
    if (!user) return;

    const text = `👤 Юзер: ${user.name}\n🆔 ID: ${user.id}\n🔑 Доступ: ${user.hasAccess ? '✅' : '❌'}`;
    await ctx.editMessageText(text, Markup.inlineKeyboard([
      [Markup.button.callback(user.hasAccess ? '🚫 Забрать доступ' : '✅ Дать доступ', `toggle_${user.id}`)],
      [Markup.button.callback('⬅️ Назад к списку', 'list_users_back')]
    ]));
  }

  @Action(/^toggle_(.+)$/)
  async toggleAccess(@Ctx() ctx: Context & { match: RegExpExecArray }) {
    const userId = Number(ctx.match[1]);
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.hasAccess = !user.hasAccess;
      await ctx.answerCbQuery('Статус изменен!');
      return this.listUsersBack(ctx); // Возвращаемся к списку
    }
  }

  @Action('list_users_back')
  async listUsersBack(@Ctx() ctx: Context) {
    const buttons = this.users.map((u) => [
      Markup.button.callback(`${u.name} [${u.hasAccess ? '✅' : '❌'}]`, `manage_${u.id}`)
    ]);
    await ctx.editMessageText('Список пользователей:', Markup.inlineKeyboard(buttons));
  }

  @Hears('🚀 Открыть Mini App')
  async openApp(@Ctx() ctx: Context) {
    await ctx.reply('Ваша ссылка:', Markup.inlineKeyboard([
      [Markup.button.webApp('Открыть настройки', this.webAppUrl)]
    ]));
  }
}