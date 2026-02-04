import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Интерфейс для данных пользователя
export interface User {
  id: number;
  name: string;
  hasAccess: boolean;
  username?: string;
}

@Injectable()
export class BotService {
  // Временная база данных в памяти сервиса
  private users: User[] = [];

  constructor(private config: ConfigService) {}

  // Метод для регистрации/обновления пользователя
  registerUser(id: number, name: string, username?: string): User {
    let user = this.users.find((u) => u.id === id);
    if (!user) {
      user = { id, name, username, hasAccess: false };
      this.users.push(user);
    }
    return user;
  }

  // Получить всех пользователей (для админа)
  getAllUsers(): User[] {
    return this.users;
  }

  // Найти одного пользователя
  getUserById(id: number): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  // Переключить доступ
  toggleAccess(id: number): boolean {
    const user = this.getUserById(id);
    if (user) {
      user.hasAccess = !user.hasAccess;
      return user.hasAccess;
    }
    return false;
  }

  // Получить статистику
  getStats() {
    return {
      total: this.users.length,
      active: this.users.filter((u) => u.hasAccess).length,
    };
  }
}