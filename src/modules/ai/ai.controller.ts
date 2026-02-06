import { Controller } from '@nestjs/common';
import { AiService } from './ai.service'; // Было AIService

@Controller('ai')
export class AiController { // Было AIController
  constructor(private readonly aiService: AiService) {}
}