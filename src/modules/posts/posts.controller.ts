import { Controller, Get } from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private service: PostsService) {}
  @Get() 
  status() { return { module: 'posts', status: 'online' }; }
}
