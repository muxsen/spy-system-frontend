import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    // Добавляем '||' и пустую строку, чтобы TS не ругался на undefined
    this.apiKey = this.configService.get<string>('AI_API_KEY') || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ Внимание: AI_API_KEY не найден в .env файле!');
    }
  }

  async rewrite(text: string): Promise<string> {
    if (!text) return '';
    if (!this.apiKey) return text; // Если ключа нет, просто возвращаем текст

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'google/gemini-2.0-flash-exp:free',
          messages: [
            { role: 'system', content: 'Рерайтни текст, убери ссылки и рекламу.' },
            { role: 'user', content: text }
          ]
        },
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );

      return response.data.choices[0].message.content;
    } catch (e) {
      console.error('AI Error:', e.response?.data || e.message);
      return text.replace(/(https?:\/\/[^\s]+|@[\w_]+)/g, '').trim();
    }
  }
}