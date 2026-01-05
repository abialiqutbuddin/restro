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
exports.MagicLinksController = void 0;
const common_1 = require("@nestjs/common");
const magic_links_service_1 = require("./magic-links.service");
const client_update_event_dto_1 = require("../events/dto/client-update-event.dto");
let MagicLinksController = class MagicLinksController {
    constructor(magicLinksService) {
        this.magicLinksService = magicLinksService;
    }
    async generate(body) {
        const result = await this.magicLinksService.generateLink(BigInt(body.orderId), body.userId ? BigInt(body.userId) : null);
        return {
            token: result.raw_token,
            link: {
                id: result.id.toString(),
                order_id: result.order_id.toString(),
                token_hash: result.token_hash,
                created_at: result.created_at,
                expires_at: result.expires_at,
                created_by_user_id: result.created_by_user_id?.toString() || null,
            },
        };
    }
    async regenerate(body) {
        const result = await this.magicLinksService.regenerateLink(BigInt(body.orderId), body.userId);
        return {
            token: result.raw_token,
            link: {
                id: result.id.toString(),
                order_id: result.order_id.toString(),
                token_hash: result.token_hash,
                created_at: result.created_at,
                expires_at: result.expires_at,
                created_by_user_id: result.created_by_user_id?.toString() || null,
            },
        };
    }
    async list(skip, take, status) {
        const result = await this.magicLinksService.listLinks({
            skip: skip ? Number(skip) : undefined,
            take: take ? Number(take) : undefined,
            status,
        });
        return {
            items: result.items.map((link) => ({
                id: link.id.toString(),
                order_id: link.order_id.toString(),
                token_hash: link.token_hash,
                raw_token: link.raw_token,
                created_at: link.created_at,
                expires_at: link.expires_at,
                revoked_at: link.revoked_at,
                last_accessed_at: link.last_accessed_at,
                access_count: link.access_count,
                event: {
                    id: link.event.id.toString(),
                    customer_name: link.event.customer?.name ?? 'Unknown',
                    event_date: link.event.event_datetime,
                }
            })),
            total: result.total,
        };
    }
    async revoke(id) {
        await this.magicLinksService.revokeLink(BigInt(id));
        return { success: true };
    }
    async getStatus(orderId) {
        // orderId is likely a CUID (string) or number. The service should handle it.
        const link = await this.magicLinksService.getLinkForOrder(BigInt(orderId));
        if (!link) {
            return { exists: false };
        }
        const isExpired = new Date() > link.expires_at;
        const isRevoked = !!link.revoked_at;
        return {
            exists: true,
            id: link.id.toString(),
            order_id: link.order_id.toString(),
            created_at: link.created_at,
            expires_at: link.expires_at,
            revoked_at: link.revoked_at,
            access_count: link.access_count,
            last_accessed_at: link.last_accessed_at,
            is_expired: isExpired,
            is_revoked: isRevoked,
            is_active: !isExpired && !isRevoked,
        };
    }
    async validate(token) {
        const { status, link } = await this.magicLinksService.validateLinkDetailed(token);
        if (status !== 'VALID' || !link) {
            return {
                valid: false,
                status,
                orderId: link?.order_id?.toString() || null
            };
        }
        const event = await this.magicLinksService.getEventForLink(link.order_id);
        return {
            valid: true,
            status: 'VALID',
            orderId: link.order_id.toString(),
            expiresAt: link.expires_at,
            event,
        };
    }
    async updateOrder(token, dto) {
        return this.magicLinksService.updateOrder(token, dto);
    }
    async approve(token) {
        await this.magicLinksService.approveLink(token);
        return { success: true };
    }
    async reject(token) {
        await this.magicLinksService.rejectLink(token);
        return { success: true };
    }
    async changeRequest(token, body) {
        if (!body.reason)
            throw new common_1.BadRequestException('Reason is required');
        const result = await this.magicLinksService.createChangeRequest(token, body.changes, body.reason);
        return {
            success: true,
            id: result.id.toString(),
        };
    }
};
exports.MagicLinksController = MagicLinksController;
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MagicLinksController.prototype, "generate", null);
__decorate([
    (0, common_1.Post)('regenerate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MagicLinksController.prototype, "regenerate", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('skip')),
    __param(1, (0, common_1.Query)('take')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", Promise)
], MagicLinksController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id/revoke'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MagicLinksController.prototype, "revoke", null);
__decorate([
    (0, common_1.Get)('status/:orderId'),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MagicLinksController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('validate/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MagicLinksController.prototype, "validate", null);
__decorate([
    (0, common_1.Put)('order/:token'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, client_update_event_dto_1.ClientUpdateEventDto]),
    __metadata("design:returntype", Promise)
], MagicLinksController.prototype, "updateOrder", null);
__decorate([
    (0, common_1.Post)('approve/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MagicLinksController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)('reject/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MagicLinksController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)('change-request/:token'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MagicLinksController.prototype, "changeRequest", null);
exports.MagicLinksController = MagicLinksController = __decorate([
    (0, common_1.Controller)('magic-links'),
    __metadata("design:paramtypes", [magic_links_service_1.MagicLinksService])
], MagicLinksController);
