import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { DbService } from '../../shared/db/db.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, DbService],
})
export class SubscriptionsModule {}
