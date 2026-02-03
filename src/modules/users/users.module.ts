import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DbService } from '../../shared/db/db.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, DbService],
})
export class UsersModule {}
