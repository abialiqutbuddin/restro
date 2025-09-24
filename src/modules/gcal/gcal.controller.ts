import { Controller, Get, Query, BadRequestException, Post, Body } from '@nestjs/common';
import { GcalService } from './gcal.service';
import { CreateGcalEventDto } from './dto/create-google-cal.dto';

@Controller('gcal')
export class GcalController {
  constructor(private readonly svc: GcalService) { }

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

@Post('create')
  async create(@Body() dto: CreateGcalEventDto) {
    const created = await this.svc.createEvent({
      calendarId: dto.calendarId,
      summary: dto.summary,
      description: dto.description,
      start: dto.start,
      end: dto.end,
      location: dto.location,
      timeZone: dto.timeZone,
    });
    // Return a light shape that Flutter can easily read
    return {
      ok: true,
      eventId: created.id ?? null,
      htmlLink: created.htmlLink ?? null,
      created,
    };
  }

//   @Post('update')
// async update(@Body() body: {
//   calendarId?: string;
//   eventId: string;
//   summary?: string;
//   description?: string;
//   start?: string;
//   end?: string;
//   location?: string;
//   timeZone?: string;
// }) {
//   const event = await this.svc.updateEvent(body);
//   return { ok: true, event };
// }

// @Post('delete')
// async delete(@Body() body: { calendarId?: string; eventId: string }) {
//   await this.svc.deleteEvent(body.calendarId ?? 'primary', body.eventId);
//   return { ok: true };
// }

}