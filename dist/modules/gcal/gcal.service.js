"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GcalService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
let GcalService = class GcalService {
    constructor() {
        this.oauth2 = new googleapis_1.google.auth.OAuth2({
            clientId: process.env.GCAL_CLIENT_ID,
            clientSecret: process.env.GCAL_CLIENT_SECRET,
            redirectUri: process.env.GCAL_REDIRECT_URI,
        });
        const refresh = process.env.GCAL_REFRESH_TOKEN;
        if (refresh)
            this.oauth2.setCredentials({ refresh_token: refresh });
    }
    get calendar() {
        return googleapis_1.google.calendar({ version: 'v3', auth: this.oauth2 });
    }
    generateAuthUrl() {
        return this.oauth2.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: ['https://www.googleapis.com/auth/calendar'],
        });
    }
    async handleOAuthCallback(code) {
        const { tokens } = await this.oauth2.getToken(code);
        return tokens;
    }
    async listRange(params) {
        const calendarId = params.calendarId || 'primary';
        const maxResults = params.maxPerPage ?? 250;
        const timeMin = this.toCstRfc3339(params.start, false);
        const timeMax = this.toCstRfc3339(params.end, true);
        // Titles to ignore (lowercased, trimmed)
        const ignoredTitles = new Set([
            'barbq village marketing meeting',
        ]);
        const all = [];
        let pageToken;
        do {
            const { data } = await this.calendar.events.list({
                calendarId,
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: 'startTime',
                maxResults,
                pageToken,
                timeZone: params.timeZone,
            });
            for (const ev of data.items ?? []) {
                const title = (ev.summary ?? '').trim();
                // ⛔️ Skip ignored titles (case-insensitive)
                if (ignoredTitles.has(title.toLowerCase()))
                    continue;
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
                    attendees: ev.attendees?.map(a => ({
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
    async listIdsRange(params) {
        const events = await this.listRange(params);
        const ids = new Set();
        for (const ev of events) {
            if (ev.eventId)
                ids.add(ev.eventId);
        }
        return Array.from(ids);
    }
    /**
     * Normalize inbound date/datetime to RFC3339 with CST offset.
     * Accepts:
     *  - "YYYY-MM-DD"
     *  - ISO strings like "2025-11-20T05:00:00.000Z" or without Z
     */
    toCstRfc3339(dateStr, isEnd = false) {
        if (!dateStr || !dateStr.trim()) {
            throw new common_1.BadRequestException('Invalid date');
        }
        const raw = dateStr.trim();
        // If it already includes 'T', parse directly; else append midnight
        const parsed = raw.includes('T') ? new Date(raw) : new Date(`${raw}T00:00:00`);
        if (isNaN(parsed.getTime())) {
            throw new common_1.BadRequestException(`Invalid date: ${dateStr}`);
        }
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        const hh = isEnd ? "23" : "00";
        const min = isEnd ? "59" : "00";
        const ss = isEnd ? "59" : "00";
        return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}-06:00`;
    }
    async createEvent(params) {
        const calendarId = params.calendarId || 'primary';
        const event = {
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
        }
        catch (err) {
            console.error('[GcalService] createEvent error:', err);
            throw new common_1.BadRequestException('Failed to create Google Calendar event');
        }
    }
    wrapDate(value, tz) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return { date: value };
        }
        // No conversion — pass through the datetime string and timezone as-is
        return { dateTime: value, timeZone: tz ?? 'America/Chicago' };
    }
};
exports.GcalService = GcalService;
exports.GcalService = GcalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GcalService);
