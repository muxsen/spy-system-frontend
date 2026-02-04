import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  telegramId: number;

  @Prop()
  username: string;

  @Prop({ default: false })
  hasSubscription: boolean;

  @Prop()
  subscriptionType: string;

  @Prop()
  subscriptionExpiresAt: Date;

  // Эти поля нужны для корректной работы userbot.service.ts
  @Prop()
  sourceChannelId: string;

  @Prop()
  targetChannelId: string;
}

export const UserSchema = SchemaFactory.createForClass(User);