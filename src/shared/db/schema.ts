import { pgTable, serial, varchar, timestamp, bigint, integer, text, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const postStatusEnum = pgEnum('post_status', ['pending', 'processing', 'scheduled', 'published', 'rejected']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: bigint('telegram_id', { mode: 'bigint' }).unique().notNull(),
  username: varchar('username', { length: 255 }),
  role: userRoleEnum('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const channels = pgTable('channels', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  tgId: bigint('tg_id', { mode: 'bigint' }).notNull(),
  type: varchar('type', { length: 20 }), // donor / target
  title: varchar('title', { length: 255 }),
  isActive: boolean('is_active').default(true),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  originalText: text('original_text'),
  refinedText: text('refined_text'),
  status: postStatusEnum('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});
