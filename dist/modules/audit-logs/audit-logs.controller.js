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
exports.AuditLogsController = void 0;
const common_1 = require("@nestjs/common");
const audit_logs_service_1 = require("./audit-logs.service");
const client_1 = require("@prisma/client");
let AuditLogsController = class AuditLogsController {
    constructor(auditLogsService) {
        this.auditLogsService = auditLogsService;
    }
    async findAll(query) {
        return this.auditLogsService.findAll(query);
    }
    async updateStatus(id, status) {
        const log = await this.auditLogsService.updateStatus(id, status);
        if (log && status === 'APPROVED') {
            await this.auditLogsService.log(log.order_id, client_1.AuditActorType.SYSTEM, 'MAGIC_LINK_APPROVED', {
                metadata: {
                    requestId: id,
                    email: log.metadata?.email,
                },
            });
        }
        return { success: true };
    }
    async requestLink(body) {
        // Log the request
        await this.auditLogsService.log(body.orderId, client_1.AuditActorType.SYSTEM, // Or CLIENT if unauthenticated but public? relying on body.
        'MAGIC_LINK_REQUEST', {
            metadata: {
                email: body.email,
                reason: body.reason,
                status: 'PENDING',
            },
        });
        return { success: true, message: 'Request submitted successfully' };
    }
};
exports.AuditLogsController = AuditLogsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)('request-link'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditLogsController.prototype, "requestLink", null);
exports.AuditLogsController = AuditLogsController = __decorate([
    (0, common_1.Controller)('audit-logs'),
    __metadata("design:paramtypes", [audit_logs_service_1.AuditLogsService])
], AuditLogsController);
