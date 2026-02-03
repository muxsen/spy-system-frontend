import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().default('3000'),
  TELEGRAM_API_ID: z.string(),
  TELEGRAM_API_HASH: z.string(),
  OPENROUTER_API_KEY: z.string(),
});

export type Env = z.infer<typeof envSchema>;
