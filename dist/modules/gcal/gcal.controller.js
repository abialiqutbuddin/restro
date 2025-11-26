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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GcalController = void 0;
const common_1 = require("@nestjs/common");
const gcal_service_1 = require("./gcal.service");
const create_google_cal_dto_1 = require("./dto/create-google-cal.dto");
const prisma_service_1 = require("../../database/prisma.service");
const date_conversion_1 = require("../../utils/date_conversion");
const luxon_1 = require("luxon");
let GcalController = class GcalController {
    constructor(svc, prisma) {
        this.svc = svc;
        this.prisma = prisma;
    }
    /** Get the OAuth consent URL */
    authUrl() {
        return { url: this.svc.generateAuthUrl() };
    }
    /** OAuth redirect URI (paste into Google Console) */
    async callback(code) {
        if (!code)
            throw new common_1.BadRequestException('Missing ?code');
        const tokens = await this.svc.handleOAuthCallback(code);
        return {
            ok: true,
            note: 'Save refresh_token securely (e.g., in .env or DB). Restart server after adding it.',
            tokens,
        };
    }
    /** List events between start & end (inclusive) */
    async list(start, end, calendarId, timeZone, pageSize) {
        if (!start || !end)
            throw new common_1.BadRequestException('Query params required: start, end');
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
    async missingInGoogle(start, end, calendarId, timeZone) {
        if (!start || !end)
            throw new common_1.BadRequestException('Query params required: start, end');
        // Treat dates as wall-clock strings (no TZ conversion) to match DB storage
        const startWall = `${start.trim()} 00:00:00`;
        const endWall = `${end.trim()} 23:59:59`;
        const startDate = (0, date_conversion_1.toDateKeepWall)(startWall);
        const endDate = (0, date_conversion_1.toDateKeepWall)(endWall);
        if (startDate > endDate) {
            throw new common_1.BadRequestException('`start` must be before or equal to `end`');
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
        const dbIds = dbRows.map(r => r.gcalEventId).filter(Boolean);
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
            .map(r => ({ id: r.gcalEventId }));
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
    async create(dto) {
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
};
exports.GcalController = GcalController;
__decorate([
    (0, common_1.Get)('auth-url'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GcalController.prototype, "authUrl", null);
__decorate([
    (0, common_1.Get)('oauth2callback'),
    __param(0, (0, common_1.Query)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GcalController.prototype, "callback", null);
__decorate([
    (0, common_1.Get)('events'),
    __param(0, (0, common_1.Query)('start')),
    __param(1, (0, common_1.Query)('end')),
    __param(2, (0, common_1.Query)('calendarId')),
    __param(3, (0, common_1.Query)('timeZone')),
    __param(4, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], GcalController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('missing-in-google'),
    __param(0, (0, common_1.Query)('start')),
    __param(1, (0, common_1.Query)('end')),
    __param(2, (0, common_1.Query)('calendarId')),
    __param(3, (0, common_1.Query)('timeZone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], GcalController.prototype, "missingInGoogle", null);
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_google_cal_dto_1.CreateGcalEventDto]),
    __metadata("design:returntype", Promise)
], GcalController.prototype, "create", null);
exports.GcalController = GcalController = __decorate([
    (0, common_1.Controller)('gcal'),
    __metadata("design:paramtypes", [gcal_service_1.GcalService,
        prisma_service_1.PrismaService])
], GcalController);
// Format Google times in provided tz (default America/Chicago)
function formatAsCentral(dt, zone = 'America/Chicago') {
    if (!dt)
        return null;
    if (dt.dateTime) {
        const parsed = luxon_1.DateTime.fromISO(dt.dateTime);
        if (!parsed.isValid)
            return dt.dateTime;
        return parsed.setZone(zone).toFormat('yyyy-LL-dd HH:mm:ss');
    }
    if (dt.date) {
        return `${dt.date} 00:00:00`;
    }
    return null;
}
