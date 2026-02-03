import { Controller, Get, Res } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';

@Controller()
export class AppController {
  @Get()
  root(@Res() res: express.Response) {
    // Принудительно отдаем файл из папки public
    const filePath = join(process.cwd(), 'public', 'index.html');
    return res.sendFile(filePath);
  }

  @Get('status')
  status() {
    return { message: 'Server is running', user: 'Mukhsan' };
  }
}