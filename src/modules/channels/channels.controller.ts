import { Controller, Get } from '@nestjs/common';
import { ChannelsService } from './channels.service';

@Controller('channels')
export class ChannelsController {
  constructor(private service: ChannelsService) {}
  @Get() 
  status() { return { module: 'channels', status: 'online' }; }
}
