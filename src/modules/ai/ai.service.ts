import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
// Добавили слово export, чтобы другие модули видели этот класс
export class AiService {
  private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  async cleanText(text: string): Promise<string> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'openai/gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Ты редактор. Удали ссылки и рекламу.' },
            { role: 'user', content: text }
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data.choices[0].message.content;
    } catch (e) {
      return text;
    }
  }
}