import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true, unique: true })
  userId: number;

  @Prop()
  username: string;

  @Prop()
  phone: string;

  @Prop({ default: false })
  hasAccess: boolean;

  @Prop()
  sourceChannelId: string;

  @Prop()
  targetChannelId: string;
}

// ВОТ ЭТА СТРОКА ОБЯЗАТЕЛЬНА:
export const UserSchema = SchemaFactory.createForClass(User);