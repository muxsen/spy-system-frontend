import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop()
  originalText: string;

  @Prop()
  rewrittenText: string;

  @Prop()
  sourceChannelId: string;
}

export const PostSchema = SchemaFactory.createForClass(Post);