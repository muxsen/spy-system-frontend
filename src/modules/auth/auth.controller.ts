import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}
  @Get() 
  status() { return { module: 'auth', status: 'online' }; }
}
