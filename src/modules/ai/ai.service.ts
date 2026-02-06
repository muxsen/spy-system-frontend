import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('AI_API_KEY') || '';
    this.model = this.configService.get<string>('AI_MODEL') || 'openai/gpt-4o-mini';
  }

  async rewrite(text: string): Promise<string> {
    if (!text) return '';
    if (!this.apiKey) return this.sanitize(text);

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.model,
          messages: [
            { 
              role: 'system', 
              content: `Ты — профессиональный журналист. Перепиши новость своим стилем.
              ЗАПРЕЩЕНО:
              1. Использовать фразы "Рерайт", "ИИ", "Отредактировано", "Обновление".
              2. Оставлять ссылки (http/https) и юзернеймы (@username).
              3. Делать вступления или пояснения. Сразу суть.` 
            },
            { role: 'user', content: text }
          ],
          temperature: 0.5
        },
        { 
          headers: { 
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://github.com/nestjs',
            'X-Title': 'Telegram Spy Bot'
          } 
        }
      );

      const aiContent = response.data.choices[0]?.message?.content || text;
      return this.sanitize(aiContent);
    } catch (e) {
      console.error('AI Error:', e.message);
      return this.sanitize(text);
    }
  }

  private sanitize(text: string): string {
    return text
      .replace(/^[✨\s]*рерайт[:\s]*/gi, '')
      .replace(/отредактировано ии/gi, '')
      .replace(/✨/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/@[\w_]+/g, '')
      .replace(/(подписаться|подписывайся|читайте далее|источник).*/gi, '')
      .trim();
  }
}