import { Controller, Get } from '@nestjs/common';
import { version } from 'os';

@Controller('health')
export class HealthController {
  @Get()
  ok() {
    return { ok: true, ts: new Date().toISOString(),version: 'v1.15' };
  }
}