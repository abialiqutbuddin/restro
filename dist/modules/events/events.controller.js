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
exports.EventsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const events_service_1 = require("./events.service");
const import_events_dto_1 = require("./dto/import-events.dto");
const create_event_dto_1 = require("./dto/create-event.dto");
const class_transformer_1 = require("class-transformer"); // <-- important
const invoice_dto_1 = require("./dto/invoice.dto");
class GoogleEventLiteDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GoogleEventLiteDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GoogleEventLiteDto.prototype, "description", void 0);
class CheckEventsDto {
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayNotEmpty)(),
    __metadata("design:type", Array)
], CheckEventsDto.prototype, "ids", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => GoogleEventLiteDto),
    __metadata("design:type", Array)
], CheckEventsDto.prototype, "events", void 0);
let EventsController = class EventsController {
    constructor(svc) {
        this.svc = svc;
    }
    list() {
        return this.svc.list();
    }
    create(dto) {
        return this.svc.create(dto);
    }
    import(dto) {
        return this.svc.importEventTree(dto);
    }
    /** POST /api/events/check  → { "<id>": { exists: boolean, status?: string } } */
    check(dto) {
        const map = Object.fromEntries((dto.events ?? []).map(e => [
            e.id,
            e.description == null ? {} : { description: e.description } // omit when null
        ]));
        return this.svc.checkByGcalIds(dto.ids, map);
    }
    /** Optional convenience: GET /api/events/by-gcal/:id */
    getByGcal(id) {
        return this.svc.getByGcalId(id);
    }
    /** GET /api/events/:id → single row (no deep relations) */
    getById(id) {
        return this.svc.getById(id);
    }
    /** GET /api/events/:id/tree → full nested tree */
    getTreeById(id) {
        return this.svc.getTreeById(id);
    }
    getEventView(id) {
        return this.svc.getEventView(id);
    }
    async deleteByGcal(gcalId) {
        return this.svc.deleteByGcalId(gcalId);
    }
    async buildInvoice(q) {
        const includeEvents = (q.includeEvents ?? 'true').toLowerCase() === 'true';
        const eventIds = q.eventIds ?? []; // already string[]
        if (eventIds.length) {
            return this.svc.buildInvoiceForEvents(eventIds, includeEvents); // expects string[]
        }
        if (!q.customerId || !q.start || !q.end) {
            return { error: 'Provide either eventIds OR customerId + start + end (ISO).' };
        }
        return this.svc.buildInvoiceForCustomerRange({
            customerId: q.customerId,
            start: new Date(q.start),
            end: new Date(q.end),
            includeEvents,
        });
    }
};
exports.EventsController = EventsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_event_dto_1.CreateEventDto]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('import'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [import_events_dto_1.ImportEventDto]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "import", null);
__decorate([
    (0, common_1.Post)('check'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CheckEventsDto]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "check", null);
__decorate([
    (0, common_1.Get)('by-gcal/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "getByGcal", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "getById", null);
__decorate([
    (0, common_1.Get)(':id/tree'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "getTreeById", null);
__decorate([
    (0, common_1.Get)(':id/view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "getEventView", null);
__decorate([
    (0, common_1.Delete)('by-gcal/:gcalId'),
    __param(0, (0, common_1.Param)('gcalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "deleteByGcal", null);
__decorate([
    (0, common_1.Get)('invoice/build'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invoice_dto_1.InvoiceQueryDto]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "buildInvoice", null);
exports.EventsController = EventsController = __decorate([
    (0, common_1.Controller)('events'),
    __metadata("design:paramtypes", [events_service_1.EventsService])
], EventsController);
