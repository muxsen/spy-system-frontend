import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Session extends Document {
  @Prop({ required: true, unique: true })
  tgId: string; // Твой ADMIN_ID из env

  @Prop({ required: true })
  apiId: string;

  @Prop({ required: true })
  apiHash: string;

  @Prop({ required: true })
  sessionString: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const SessionSchema = SchemaFactory.createForClass(Session);