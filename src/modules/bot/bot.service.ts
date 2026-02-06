import { Injectable } from '@nestjs/common';

@Injectable()
export class BotService {
  // Хранилище юзеров (в идеале заменить на БД)
  private users = new Map<number, any>();
  
  // Хранилище цен (теперь админ может их менять)
  private prices = {
    start: 100,
    premium: 1200
  };

  // --- РАБОТА С ЮЗЕРАМИ ---
  getUser(userId: number) {
    return this.users.get(userId);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  async updateUser(userId: number, data: any) {
    const current = this.users.get(userId) || { userId, hasAccess: false };
    this.users.set(userId, { ...current, ...data });
  }

  getUserBySourceId(sourceId: string) {
    return this.getAllUsers().find(u => u.sourceChannelId === sourceId);
  }

  // --- РАБОТА С ЦЕНАМИ ---
  getPrices() {
    return this.prices;
  }

  updatePrice(type: 'start' | 'premium', amount: number) {
    this.prices[type] = amount;
  }

  // --- AI РЕРАЙТ (ЗАГЛУШКА) ---
  async rewriteContent(text: string): Promise<string> {
    if (!text) return '';
    return `✨ <b>AI Рерайт:</b>\n\n${text}\n\n🤖 <i>Обработано @ваша_ссылка</i>`;
  }
}