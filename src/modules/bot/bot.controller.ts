import { Controller, Post, Body } from '@nestjs/common';
import { BotService } from './bot.service';

@Controller('api')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('setup-spy')
  async setupSpy(@Body() data: { userId: number; donorId: string; targetId: string }) {
    console.log(`📡 Настройка шпиона для ${data.userId}: ${data.donorId} -> ${data.targetId}`);
    
    // В будущем здесь мы будем сохранять это в базу MongoDB
    return { success: true, message: 'Настройки шпиона сохранены!' };
  }
}