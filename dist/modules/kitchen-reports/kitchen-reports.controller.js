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
exports.KitchenReportsController = void 0;
const common_1 = require("@nestjs/common");
const kitchen_reports_service_1 = require("./kitchen-reports.service");
const kitchen_consolidation_dto_1 = require("./dto/kitchen-consolidation.dto");
const update_prep_status_dto_1 = require("./dto/update-prep-status.dto");
let KitchenReportsController = class KitchenReportsController {
    constructor(kitchenReportsService) {
        this.kitchenReportsService = kitchenReportsService;
    }
    /**
     * GET /kitchen-reports/consolidation
     *
     * Returns consolidated menu items across events with total quantities.
     * Supports various filters for date range, event type, time windows, etc.
     *
     * Query Parameters:
     * - date: Single date (YYYY-MM-DD) - gets all events for that day
     * - startDate: Start of date range (YYYY-MM-DD)
     * - endDate: End of date range (YYYY-MM-DD)
     * - eventType: Filter by event type (e.g., "wedding", "corporate")
     * - timeWindow: Filter by time of day ("morning", "afternoon", "evening")
     * - includeClientName: Include client names in output (default: false)
     * - showEventBreakdown: Show which events each item came from (default: false)
     * - eventIds: Comma-separated list of specific event IDs to include
     *
     * Example:
     * GET /kitchen-reports/consolidation?date=2025-12-31&includeClientName=true
     * GET /kitchen-reports/consolidation?startDate=2025-12-25&endDate=2025-12-31&eventType=wedding
     */
    async getConsolidationReport(query) {
        return this.kitchenReportsService.getKitchenConsolidationReport(query);
    }
    /**
     * GET /kitchen-reports/prep-list
     *
     * Returns a simplified prep list with just item names and quantities.
     * This is a kitchen-friendly format without pricing or event details.
     *
     * Same query parameters as consolidation endpoint.
     *
     * Example:
     * GET /kitchen-reports/prep-list?date=2025-12-31
     */
    async getPrepList(query) {
        return this.kitchenReportsService.getPrepList(query);
    }
    /**
     * GET /kitchen-reports/daily-prep-list
     *
     * Returns a formatted daily prep list for the UI with event breakdown and prep status.
     * Groups items together with size variations and shows which events need each item.
     * Includes chef preparation status (not_started, in_progress, completed) for each item.
     *
     * Query Parameters (all optional):
     * - date: Single date (YYYY-MM-DD) - gets all events for that specific day
     * - startDate: Start of date range (YYYY-MM-DD)
     * - endDate: End of date range (YYYY-MM-DD)
     * - eventType: Filter by event type (e.g., "wedding", "corporate", "birthday")
     * - timeWindow: Filter by time of day ("morning", "afternoon", "evening")
     * - eventIds: Comma-separated list of specific event IDs
     *
     * If NO filters are provided, returns ALL events
     *
     * Examples:
     * GET /kitchen-reports/daily-prep-list
     * GET /kitchen-reports/daily-prep-list?date=2026-01-05
     * GET /kitchen-reports/daily-prep-list?startDate=2025-12-31&endDate=2026-01-06
     * GET /kitchen-reports/daily-prep-list?eventType=wedding&timeWindow=evening
     */
    async getDailyPrepList(query) {
        return this.kitchenReportsService.getDailyPrepList(query);
    }
    /**
     * PATCH /kitchen-reports/prep-status
     *
     * Updates the preparation status for a specific menu item in an event.
     * Creates a new status record if one doesn't exist, or updates the existing one.
     *
     * Body Parameters:
     * - eventId: Event ID (number)
     * - menuItemId: Menu item ID (number)
     * - sizeId: Size ID (optional, number)
     * - status: Status value (not_started, in_progress, completed)
     * - notes: Optional notes (string)
     *
     * Example:
     * PATCH /kitchen-reports/prep-status
     * Body: { "eventId": 123, "menuItemId": 456, "sizeId": 789, "status": "in_progress", "notes": "Started prep" }
     */
    async updatePrepStatus(dto) {
        return this.kitchenReportsService.updatePrepStatus(dto);
    }
};
exports.KitchenReportsController = KitchenReportsController;
__decorate([
    (0, common_1.Get)('consolidation'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [kitchen_consolidation_dto_1.KitchenConsolidationQueryDto]),
    __metadata("design:returntype", Promise)
], KitchenReportsController.prototype, "getConsolidationReport", null);
__decorate([
    (0, common_1.Get)('prep-list'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [kitchen_consolidation_dto_1.KitchenConsolidationQueryDto]),
    __metadata("design:returntype", Promise)
], KitchenReportsController.prototype, "getPrepList", null);
__decorate([
    (0, common_1.Get)('daily-prep-list'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [kitchen_consolidation_dto_1.KitchenConsolidationQueryDto]),
    __metadata("design:returntype", Promise)
], KitchenReportsController.prototype, "getDailyPrepList", null);
__decorate([
    (0, common_1.Patch)('prep-status'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_prep_status_dto_1.UpdatePrepStatusDto]),
    __metadata("design:returntype", Promise)
], KitchenReportsController.prototype, "updatePrepStatus", null);
exports.KitchenReportsController = KitchenReportsController = __decorate([
    (0, common_1.Controller)('kitchen-reports'),
    __metadata("design:paramtypes", [kitchen_reports_service_1.KitchenReportsService])
], KitchenReportsController);
