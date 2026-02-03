import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const contextType = host.getType() as string;

    // Если ошибка пришла из Телеграма (telegraf)
    if (contextType === 'telegraf') {
      this.logger.error(`Telegram Error: ${exception.message}`);
      return; // Просто логируем, не ломая процесс
    }

    // Если ошибка из обычного HTTP (для контроллеров)
    if (contextType === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const status = exception instanceof HttpException ? exception.getStatus() : 500;

      response.status(status).json({
        statusCode: status,
        message: exception.message,
      });
    }
  }
}