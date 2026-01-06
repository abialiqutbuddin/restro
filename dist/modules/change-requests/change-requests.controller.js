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
exports.ChangeRequestsController = void 0;
const common_1 = require("@nestjs/common");
const change_requests_service_1 = require("./change-requests.service");
let ChangeRequestsController = class ChangeRequestsController {
    constructor(service) {
        this.service = service;
    }
    async list(skip, take, status) {
        return this.service.list({
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined,
            status,
        });
    }
    async approve(id, body) {
        // In a real app, reviewerId would come from auth token
        // For now, accept it from body or default to 1
        const reviewerId = body.reviewerId ? BigInt(body.reviewerId) : BigInt(1);
        await this.service.approve(id, reviewerId, body.notes);
        return { success: true, status: 'APPROVED' };
    }
    async reject(id, body) {
        const reviewerId = body.reviewerId ? BigInt(body.reviewerId) : BigInt(1);
        await this.service.reject(id, reviewerId, body.notes);
        return { success: true, status: 'REJECTED' };
    }
};
exports.ChangeRequestsController = ChangeRequestsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('skip')),
    __param(1, (0, common_1.Query)('take')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ChangeRequestsController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChangeRequestsController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChangeRequestsController.prototype, "reject", null);
exports.ChangeRequestsController = ChangeRequestsController = __decorate([
    (0, common_1.Controller)('change-requests'),
    __metadata("design:paramtypes", [change_requests_service_1.ChangeRequestsService])
], ChangeRequestsController);
