import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { DbService } from '../../shared/db/db.service';

@Module({
  controllers: [ChannelsController],
  providers: [ChannelsService, DbService],
})
export class ChannelsModule {}
