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
let GcalController = class GcalController {
    constructor(svc) {
        this.svc = svc;
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
exports.GcalController = GcalController = __decorate([
    (0, common_1.Controller)('gcal'),
    __metadata("design:paramtypes", [gcal_service_1.GcalService])
], GcalController);
