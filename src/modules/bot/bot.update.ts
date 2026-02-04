import { Update, Start, Hears, Action, Ctx } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { BotService } from './bot.service';

@Update()
export class BotUpdate {
  private adminId: number;
  private webAppUrl: string;

  constructor(
    private config: ConfigService,
    private readonly botService: BotService
  ) {
    this.adminId = Number(this.config.get<string>('ADMIN_ID'));
    this.webAppUrl = this.config.get<string>('MINI_APP_URL')!;
  }

  @Start()
  async onStart(@Ctx() ctx: Context) {
    if (!ctx.from) return;

    this.botService.registerUser(ctx.from.id, ctx.from.first_name, ctx.from.username);
    const isAdmin = ctx.from.id === this.adminId;

    if (isAdmin) {
      await ctx.replyWithMarkdownV2('👋 *Приветствую, Господин Администратор\\!*', 
        Markup.keyboard([
          ['👥 Пользователи', '📊 Статистика'],
          ['🚀 Открыть Mini App', '🏠 Главное меню']
        ]).resize()
      );
    } else {
      const welcomeMsg = 
        `✨ *Добро пожаловать в Spy System\\!*\n\n` +
        `🤖 Это профессиональный ИИ\\-инструмент для вашего канала\\.\n\n` +
        `💡 *Что я умею:* \n` +
        `├ ⚡ Копирование постов в реальном времени\n` +
        `├ 🧠 Умная перефразировка текста\n` +
        `└ 🚫 Удаление ссылок и рекламы\n\n` +
        `👇 *Для начала работы выберите тариф:*`;

      await ctx.replyWithMarkdownV2(welcomeMsg, 
        Markup.inlineKeyboard([
          [Markup.button.callback('💎 Посмотреть тарифы', 'show_tariffs')]
        ])
      );
    }
  }

  // --- ШАГ 1: ВЫБОР ТАРИФА ---
  @Action('show_tariffs')
  async showTariffs(@Ctx() ctx: Context) {
    const tariffMsg = 
      `💳 *Выберите тарифный план:*\n\n` +
      `📦 *Lite:* 1 Месяц — \`60 000 сум\`\n` +
      `🔥 *Pro:* 3 Месяца — \`150 000 сум\`\n` +
      `💎 *Elite:* Пожизненно — \`1 000 000 сум\`\n\n` +
      `_Нажмите на нужный тариф для подтверждения_`;

    await ctx.editMessageText(tariffMsg, {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📦 Lite', 'pay_60000'), Markup.button.callback('🔥 Pro', 'pay_150000')],
        [Markup.button.callback('💎 Elite', 'pay_1000000')],
        [Markup.button.callback('⬅️ Назад', 'back_to_start')]
      ])
    });
  }

  // --- ШАГ 2: ПОДТВЕРЖДЕНИЕ ВЫБОРА (Цифры только!) ---
  @Action(/^pay_(\d+)$/)
  async handlePayment(@Ctx() ctx: any) {
    const amount = ctx.match[1];
    const confirmMsg = 
      `📝 *Подтверждение заказа:*\n\n` +
      `🔹 Сумма к оплате: \`${amount} сум\`\n` +
      `🔹 Товар: *Подписка Spy System*\n\n` +
      `👇 Нажмите кнопку ниже, чтобы получить реквизиты:`;

    await ctx.editMessageText(confirmMsg, {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💳 Оплатить', `checkout_${amount}`)],
        [Markup.button.callback('❌ Отмена', 'show_tariffs')]
      ])
    });
  }

  // --- ШАГ 3: ПАНЕЛЬ РЕКВИЗИТОВ ---
  @Action(/^checkout_(\d+)$/)
  async checkout(@Ctx() ctx: any) {
    const amount = ctx.match[1];
    const paymentPanel = 
      `💳 *Панель оплаты:*\n\n` +
      `💵 К оплате: \`${amount} сум\`\n` +
      `📍 *Реквизиты для перевода:* \n` +
      `└ Карта: \`4444 0000 1111 2222\`\n\n` +
      `⚠️ _После перевода средств нажмите на кнопку ниже для проверки транзакции_`;

    await ctx.editMessageText(paymentPanel, {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✨ Проверить платеж', 'pay_success')],
        [Markup.button.callback('⬅️ Назад', 'show_tariffs')]
      ])
    });
  }

  // --- ШАГ 4: ФИНАЛ (Кнопка Mini App) ---
  @Action('pay_success')
  async paySuccess(@Ctx() ctx: Context) {
    await ctx.answerCbQuery('💎 Платеж подтвержден!');
    await ctx.replyWithMarkdownV2(
      `✅ *Оплата подтверждена\\!*\n\n` +
      `🎉 Доступ активирован\\. Теперь настройте каналы в приложении\\.\n\n` +
      `👇 Нажмите кнопку ниже:`, 
      Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Войти в Mini App', this.webAppUrl)]
      ])
    );
  }

  // --- АДМИН-ЛОГИКА ---
  @Hears('📊 Статистика')
  async onStats(@Ctx() ctx: Context) {
    if (!ctx.from || ctx.from.id !== this.adminId) return;
    const stats = this.botService.getStats();
    await ctx.replyWithMarkdownV2(`📊 *Статистика:*\n\n👥 Всего: \`${stats.total}\`\n✅ Активно: \`${stats.active}\``);
  }

  @Hears('👥 Пользователи')
  async onUsers(@Ctx() ctx: Context) {
    if (!ctx.from || ctx.from.id !== this.adminId) return;
    const users = this.botService.getAllUsers();
    if (users.length === 0) return ctx.reply('📭 Список пуст');

    const buttons = users.map(u => [
      Markup.button.callback(`${u.hasAccess ? '🟢' : '🔴'} ${u.name}`, `manage_${u.id}`)
    ]);
    await ctx.reply('📂 *Управление доступом:*', { parse_mode: 'MarkdownV2', ...Markup.inlineKeyboard(buttons) });
  }

  @Action(/^manage_(.+)$/)
  async onManage(@Ctx() ctx: any) {
    const userId = Number(ctx.match[1]);
    const user = this.botService.getAllUsers().find(u => u.id === userId);
    if (!user) return;
    await ctx.editMessageText(`👤 Юзер: ${user.name}\nДоступ: ${user.hasAccess ? 'Активен' : 'Закрыт'}`, 
      Markup.inlineKeyboard([
        [Markup.button.callback(user.hasAccess ? '🚫 Забрать' : '✅ Дать', `toggle_${user.id}`)],
        [Markup.button.callback('⬅️ Назад', 'back_to_list')]
      ])
    );
  }

  @Action(/^toggle_(.+)$/)
  async onToggle(@Ctx() ctx: any) {
    const userId = Number(ctx.match[1]);
    this.botService.toggleAccess(userId);
    await ctx.answerCbQuery('Статус обновлен');
    return this.onUsers(ctx);
  }

  @Action('back_to_list')
  async backToList(@Ctx() ctx: Context) {
    return this.onUsers(ctx);
  }

  @Action('back_to_start')
  async backToStart(@Ctx() ctx: Context) {
    return this.onStart(ctx);
  }

  @Hears('🚀 Открыть Mini App')
  async openApp(@Ctx() ctx: Context) {
    await ctx.reply('Ваша ссылка на приложение:', Markup.inlineKeyboard([
      [Markup.button.webApp('Настройки шпиона', this.webAppUrl)]
    ]));
  }
}