import { Controller, Get, Query, BadRequestException, Post, Body } from '@nestjs/common';
import { GcalService } from './gcal.service';
import { CreateGcalEventDto } from './dto/create-google-cal.dto';
import { PrismaService } from '../../database/prisma.service';
import { toDateKeepWall } from '../../utils/date_conversion';
import { DateTime } from 'luxon';

@Controller('gcal')
export class GcalController {
  constructor(
    private readonly svc: GcalService,
    private readonly prisma: PrismaService,
  ) { }

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

  /** DB-vs-Google diff: events present in DB but missing from Google for the range */
  @Get('missing-in-google')
  async missingInGoogle(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('calendarId') calendarId?: string,
    @Query('timeZone') timeZone?: string,
  ) {
    if (!start || !end) throw new BadRequestException('Query params required: start, end');

    // Treat dates as wall-clock strings (no TZ conversion) to match DB storage
    const startWall = `${start.trim()} 00:00:00`;
    const endWall = `${end.trim()} 23:59:59`;
    const startDate = toDateKeepWall(startWall);
    const endDate = toDateKeepWall(endWall);
    if (startDate > endDate) {
      throw new BadRequestException('`start` must be before or equal to `end`');
    }

    const googleIds = await this.svc.listIdsRange({
      start,
      end,
      calendarId,
      timeZone,
    });
    const googleSet = new Set(googleIds);

    const dbRows = await this.prisma.events.findMany({
      where: {
        event_datetime: { gte: startDate, lte: endDate },
        gcalEventId: { not: null },
        NOT: { status: 'archived' },
      },
      select: { gcalEventId: true, event_datetime: true },
    });

    const dbIds = dbRows.map(r => r.gcalEventId).filter(Boolean) as string[];

    const missingIds = Array.from(new Set(dbIds.filter(id => !googleSet.has(id))));
    // Auto-archive missing ones
    let archivedCount = 0;
    if (missingIds.length) {
      const res = await this.prisma.events.updateMany({
        where: { gcalEventId: { in: missingIds }, status: { not: 'archived' } },
        data: { status: 'archived' },
      });
      archivedCount = res.count;
    }

    // Google detail list (name/description/time)
    const googleDetails = await this.svc.listRange({
      start,
      end,
      calendarId,
      timeZone,
    });
    const googleList = googleDetails
      .map(ev => ({
        id: ev.eventId ?? '',
        name: ev.summary,
        description: ev.description,
        start: formatAsCentral(ev.start, timeZone ?? 'America/Chicago'),
      }))
      .filter(ev => ev.id);

    const dbList = dbRows
      .filter(r => !!r.gcalEventId)
      .map(r => ({ id: r.gcalEventId as string }));

    return {
      start: startWall,
      end: endWall,
      calendarId: calendarId ?? 'primary',
      googleCount: googleIds.length,
      dbCount: dbIds.length,
      missingCount: missingIds.length,
      missingIds,
      archivedCount,
      googleEvents: googleList,
      dbEvents: dbList,
    };
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

// Format Google times in provided tz (default America/Chicago)
function formatAsCentral(
  dt?: { dateTime?: string | null; date?: string | null },
  zone = 'America/Chicago',
): string | null {
  if (!dt) return null;
  if (dt.dateTime) {
    const parsed = DateTime.fromISO(dt.dateTime);
    if (!parsed.isValid) return dt.dateTime;
    return parsed.setZone(zone).toFormat('yyyy-LL-dd HH:mm:ss');
  }
  if (dt.date) {
    return `${dt.date} 00:00:00`;
  }
  return null;
}
