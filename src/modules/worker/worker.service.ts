import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

@Injectable()
export class WorkerService {
  constructor(private ai: AiService) {}

  async processPost(text: string) {
    const clean = await this.ai.cleanText(text);
    console.log('NEW POST:', clean);
    // тут отправка в канал
  }
}
