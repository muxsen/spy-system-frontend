import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { DbService } from '../../shared/db/db.service';

@Module({
  controllers: [PostsController],
  providers: [PostsService, DbService],
})
export class PostsModule {}
