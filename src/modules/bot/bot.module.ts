import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { BotController } from './bot.controller';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    // Вот этот кусок сообщает модулю, как работать с коллекцией пользователей
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema }
    ]),
  ],
  providers: [BotService, BotUpdate],
  controllers: [BotController],
})
export class BotModule {}