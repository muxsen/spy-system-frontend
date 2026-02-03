import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  tgId: number;

  @Prop()
  username: string;

  @Prop()
  firstName: string;

  @Prop({ default: false })
  isPaid: boolean; // Оплачен ли доступ

  @Prop()
  sourceChannelId: string; // Канал друга (откуда берем)

  @Prop()
  targetChannelId: string; // Твой канал (куда постим)
}

export const UserSchema = SchemaFactory.createForClass(User);