import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [WorkerService],
})
export class WorkerModule {}
