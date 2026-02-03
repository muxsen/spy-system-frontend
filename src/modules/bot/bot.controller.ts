import { Controller, Post, Body } from '@nestjs/common';

@Controller('api')
export class BotController {
  @Post('setup')
  async setupSpy(@Body() data: any) {
    console.log('Данные получены напрямую из Mini App:', data);
    
    // Здесь ты запускаешь своего Юзербота с полученными данными
    // ... логика запуска ...

    return { status: 'ok' };
  }
}