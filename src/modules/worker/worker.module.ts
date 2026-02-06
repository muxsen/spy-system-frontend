import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { AiModule } from '../ai/ai.module'; // Было AIModule
// Убедись, что файл bot.worker.ts существует в папке modules/bot/
import { BotWorker } from '../bot/bot.worker';

@Module({
  imports: [AiModule],
  providers: [WorkerService, BotWorker],
})
export class WorkerModule {}