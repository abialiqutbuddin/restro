import { Injectable, BadRequestException } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { Credentials } from 'google-auth-library'; // ✅ add this

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
      scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
  }

  // ⬇️ Return proper type from google-auth-library
  async handleOAuthCallback(code: string): Promise<Credentials> {
    const { tokens } = await this.oauth2.getToken(code);
    return tokens; // tokens.refresh_token is what you persist
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
    const timeMin = this.toRfc3339(params.start, 'start');
    const timeMax = this.toRfc3339(params.end, 'end');

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
        all.push({
          eventId: ev.id ?? null,
          status: ev.status ?? null,
          summary: ev.summary ?? '',
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

  private toRfc3339(value: string, label: 'start' | 'end'): string {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
    const iso = /^\d{4}-\d{2}-\d{2}T.+Z$/i;
    if (dateOnly.test(value)) {
      return label === 'start' ? `${value}T00:00:00Z` : `${value}T23:59:59Z`;
    }
    if (iso.test(value)) return value;
    const d = new Date(value);
    if (isNaN(d.getTime())) throw new BadRequestException(`Invalid ${label} date: ${value}`);
    return d.toISOString();
  }
}