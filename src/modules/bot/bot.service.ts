import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface User {
  id: number;
  name: string;
  hasAccess: boolean;
  username?: string;
}

@Injectable()
export class BotService {
  private users: User[] = []; // Временная БД (пока не подключишь MongoDB)

  constructor(private config: ConfigService) {}

  registerUser(id: number, name: string, username?: string): User {
    let user = this.users.find((u) => u.id === id);
    if (!user) {
      user = { id, name, username, hasAccess: false };
      this.users.push(user);
    }
    return user;
  }

  getAllUsers(): User[] {
    return this.users;
  }

  toggleAccess(id: number): boolean {
    const user = this.users.find((u) => u.id === id);
    if (user) {
      user.hasAccess = !user.hasAccess;
      return user.hasAccess;
    }
    return false;
  }

  getStats() {
    return {
      total: this.users.length,
      active: this.users.filter((u) => u.hasAccess).length,
    };
  }
}