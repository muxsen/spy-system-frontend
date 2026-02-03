import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('mini-app')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Сохранение связки (откуда -> куда)
  @Post('save-link')
  async saveLink(@Body() data: { telegramId: number, source: string, target: string }) {
    return await this.usersService.addChannelLink(data.telegramId, data.source, data.target);
  }

  // Получение всех связок юзера для отображения в Мини-приложении
  @Get('links/:id')
  async getLinks(@Param('id') id: string) {
    return await this.usersService.findOne(Number(id));
  }
}