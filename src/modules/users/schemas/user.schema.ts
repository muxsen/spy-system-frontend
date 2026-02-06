import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  userId: number;

  @Prop()
  username?: string;

  @Prop({ default: false })
  hasAccess: boolean;

  @Prop()
  phone?: string;

  @Prop()
  telegramApiId?: string;

  @Prop()
  telegramApiHash?: string;

  @Prop()
  telegramSession?: string;

  @Prop({ default: '' }) // ДОБАВИТЬ ЭТО ПОЛЕ
  tempStep: string;

  @Prop()
  sourceChannel?: string;

  @Prop()
  targetChannel?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);