import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { GcalService } from './gcal.service';

@Controller('gcal')
export class GcalController {
  constructor(private readonly svc: GcalService) {}

  /** Get the OAuth consent URL */
  @Get('auth-url')
  authUrl() {
    return { url: this.svc.generateAuthUrl() };
  }

  /** OAuth redirect URI (paste into Google Console) */
  @Get('oauth2callback')
  async callback(@Query('code') code?: string) {
    if (!code) throw new BadRequestException('Missing ?code');
    const tokens = await this.svc.handleOAuthCallback(code);
    return {
      ok: true,
      note: 'Save refresh_token securely (e.g., in .env or DB). Restart server after adding it.',
      tokens,
    };
  }

  /** List events between start & end (inclusive) */
  @Get('events')
  async list(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('calendarId') calendarId?: string,
    @Query('timeZone') timeZone?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (!start || !end) throw new BadRequestException('Query params required: start, end');

    const maxPerPage = pageSize ? Math.max(1, Math.min(2500, Number(pageSize))) : 250;

    const items = await this.svc.listRange({
      start,
      end,
      calendarId,
      timeZone,
      maxPerPage,
    });
    return { count: items.length, items };
  }
}