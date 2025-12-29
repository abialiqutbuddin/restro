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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const dashboard_service_1 = require("./dashboard.service");
let DashboardController = class DashboardController {
    constructor(svc) {
        this.svc = svc;
    }
    async getDashboard(fromStr, toStr, topStr) {
        const now = new Date();
        const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
        const to = toStr ? new Date(toStr) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const top = topStr ? Math.max(1, Number(topStr)) : 5;
        const todayDate = new Date();
        const tomorrowDate = new Date(todayDate);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const [kpis, catRevenue, topItems, today, tomorrow, chaos] = await Promise.all([
            this.svc.kpis(from, to),
            this.svc.categoryRevenue(from, to),
            this.svc.topItemsPerCategory(from, to, top),
            this.svc.todayList(),
            this.svc.tomorrowList(),
            this.svc.getChaosReport(todayDate, tomorrowDate),
        ]);
        return { range: { from, to }, kpis, catRevenue, topItems, today, tomorrow, chaos };
    }
    async rangeList(fromStr, toStr) {
        const now = new Date();
        const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
        // make `to` exclusive (next day midnight) if only a date was passed
        const toRaw = toStr ? new Date(toStr) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const to = new Date(toRaw); // clone
        return {
            range: { from, to },
            days: await this.svc.listByDateRange(from, to),
        };
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('top')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('range-list'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "rangeList", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
