import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiEnvelopeResponse,
  ApiErrorResponses,
} from './common/swagger/api-envelope.decorator';
import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({
    summary: 'Sapaan dasar',
    description:
      'Route publik sederhana untuk memastikan server hidup. Mengembalikan teks pada `data`.',
  })
  @ApiEnvelopeResponse(String, { description: 'Teks sapaan.' })
  @ApiErrorResponses(429)
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
