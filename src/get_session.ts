import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import * as input from "input"; // Если нет, установи: npm install input

const apiId = 37066768; 
const apiHash = "31c775f2a0fd27fba91da2b6146233d2";

(async () => {
  const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });
  await client.start({
    phoneNumber: async () => await input.text("Введите ваш номер телефона (+7...): "),
    password: async () => await input.text("Пароль (если есть): "),
    phoneCode: async () => await input.text("Код из Telegram: "),
    onError: (err) => console.log(err),
  });
  console.log("\n--- СКОПИРУЙ ЭТУ СТРОКУ (БЕЗ ПРОБЕЛОВ) ---");
  console.log(client.session.save()); 
  console.log("------------------------------------------\n");
  await client.disconnect();
  process.exit(0);
})();