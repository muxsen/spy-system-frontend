import { Update, On, Message,} from 'nestjs-telegraf';

@Update()
export class AppUpdate {
  // Этот метод ловит данные из Mini App
  @On('web_app_data')
  async handleWebAppData(@Message() message: any) {
    // 1. Извлекаем строку JSON из Telegram
    const rawData = message.web_app_data.data;
    
    // 2. Превращаем строку в объект
    const parsedData = JSON.parse(rawData);
    
    // Теперь у тебя есть доступ к твоим полям:
    const target1 = parsedData.primary_target;
    const target2 = parsedData.secondary_target;

    console.log(`🤖 Мухсэн, данные получены!`);
    console.log(`Цель 1: ${target1}`);
    console.log(`Цель 2: ${target2}`);

    // 3. Отправляем ответ пользователю в Telegram
    await message.reply(
      `✅ Система мониторинга запущена!\n\n` +
      `📡 Основная цель: ${target1}\n` +
      `📡 Резервная цель: ${target2}\n\n` +
      `Агент: ${message.from.first_name}`
    );
  }
}