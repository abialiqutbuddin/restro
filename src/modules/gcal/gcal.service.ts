import { Injectable, BadRequestException } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { Credentials } from 'google-auth-library';

type ISO = string;

@Injectable()
export class GcalService {
  private readonly oauth2 = new google.auth.OAuth2({
    clientId: process.env.GCAL_CLIENT_ID,
    clientSecret: process.env.GCAL_CLIENT_SECRET,
    redirectUri: process.env.GCAL_REDIRECT_URI,
  });

  constructor() {
    const refresh = process.env.GCAL_REFRESH_TOKEN;
    if (refresh) this.oauth2.setCredentials({ refresh_token: refresh });
  }

  private get calendar(): calendar_v3.Calendar {
    return google.calendar({ version: 'v3', auth: this.oauth2 });
  }

  generateAuthUrl(): string {
    return this.oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar'],
    });
  }

  async handleOAuthCallback(code: string): Promise<Credentials> {
    const { tokens } = await this.oauth2.getToken(code);
    return tokens;
  }

  async listRange(params: {
    calendarId?: string;
    start: ISO;
    end: ISO;
    maxPerPage?: number;
    timeZone?: string;
  }): Promise<Array<{
    eventId?: string | null;
    status?: string | null;
    summary: string;
    description: string;
    start?: calendar_v3.Schema$EventDateTime;
    end?: calendar_v3.Schema$EventDateTime;
    location: string;
    htmlLink?: string | null;
    created?: string | null;
    updated?: string | null;
    attendees: Array<{ email?: string | null; displayName?: string | null; responseStatus?: string | null }>;
  }>> {
    const calendarId = params.calendarId || 'primary';
    const maxResults = params.maxPerPage ?? 250;
    const timeMin = this.toCstRfc3339(params.start, false);
    const timeMax = this.toCstRfc3339(params.end, true);

    // Titles to ignore (lowercased, trimmed)
    const ignoredTitles = new Set<string>([
      'barbq village marketing meeting',
    ]);

    const all: Array<{
      eventId?: string | null;
      status?: string | null;
      summary: string;
      description: string;
      start?: calendar_v3.Schema$EventDateTime;
      end?: calendar_v3.Schema$EventDateTime;
      location: string;
      htmlLink?: string | null;
      created?: string | null;
      updated?: string | null;
      attendees: Array<{ email?: string | null; displayName?: string | null; responseStatus?: string | null }>;
    }> = [];

    let pageToken: string | undefined;

    do {
      const { data }: { data: calendar_v3.Schema$Events } =
        await this.calendar.events.list({
          calendarId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults,
          pageToken,
          timeZone: params.timeZone,
        } as calendar_v3.Params$Resource$Events$List);

      for (const ev of data.items ?? []) {
        const title = (ev.summary ?? '').trim();
        // ⛔️ Skip ignored titles (case-insensitive)
        if (ignoredTitles.has(title.toLowerCase())) continue;

        all.push({
          eventId: ev.id ?? null,
          status: ev.status ?? null,
          summary: title,
          description: ev.description ?? '',
          start: ev.start,
          end: ev.end,
          location: ev.location ?? '',
          htmlLink: ev.htmlLink ?? null,
          created: ev.created ?? null,
          updated: ev.updated ?? null,
          attendees:
            ev.attendees?.map(a => ({
              email: a.email ?? null,
              displayName: a.displayName ?? null,
              responseStatus: a.responseStatus ?? null,
            })) ?? [],
        });
      }

      pageToken = data.nextPageToken ?? undefined;
    } while (pageToken);

    return all;
  }

  /** Light variant: returns only unique event ids for the range */
  async listIdsRange(params: {
    calendarId?: string;
    start: ISO;
    end: ISO;
    maxPerPage?: number;
    timeZone?: string;
  }): Promise<string[]> {
    const events = await this.listRange(params);
    const ids = new Set<string>();
    for (const ev of events) {
      if (ev.eventId) ids.add(ev.eventId);
    }
    return Array.from(ids);
  }

  /**
   * Normalize inbound date/datetime to RFC3339 with CST offset.
   * Accepts:
   *  - "YYYY-MM-DD"
   *  - ISO strings like "2025-11-20T05:00:00.000Z" or without Z
   */
  private toCstRfc3339(dateStr: string, isEnd = false): string {
    if (!dateStr || !dateStr.trim()) {
      throw new BadRequestException('Invalid date');
    }
    const raw = dateStr.trim();

    // If it already includes 'T', parse directly; else append midnight
    const parsed = raw.includes('T') ? new Date(raw) : new Date(`${raw}T00:00:00`);

    if (isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid date: ${dateStr}`);
    }

    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');

    const hh = isEnd ? "23" : "00";
    const min = isEnd ? "59" : "00";
    const ss = isEnd ? "59" : "00";

    return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}-06:00`;
  }



  async createEvent(params: {
    calendarId?: string;
    summary: string;
    description?: string;
    start?: string;
    end?: string;
    location?: string;
    timeZone?: string;
  }) {
    const calendarId = params.calendarId || 'primary';

    const event: calendar_v3.Schema$Event = {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: this.wrapDate(params.start ?? '', params.timeZone),
      end: this.wrapDate(params.end ?? '', params.timeZone),
    };

    try {
      const { data } = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
      });
      return data;
    } catch (err) {
      console.error('[GcalService] createEvent error:', err);
      throw new BadRequestException('Failed to create Google Calendar event');
    }
  }

  private wrapDate(value: string, tz?: string): calendar_v3.Schema$EventDateTime {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { date: value };
    }
    // No conversion — pass through the datetime string and timezone as-is
    return { dateTime: value, timeZone: tz ?? 'America/Chicago' };
  }

}
