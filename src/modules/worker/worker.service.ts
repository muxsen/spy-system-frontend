import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service'; // Было AIService

@Injectable()
export class WorkerService {
  constructor(private readonly aiService: AiService) {}
  // ... остальной код
}