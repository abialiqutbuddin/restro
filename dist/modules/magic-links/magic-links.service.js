"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MagicLinksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const crypto = __importStar(require("crypto"));
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const client_1 = require("@prisma/client");
const events_service_1 = require("../events/events.service");
let MagicLinksService = class MagicLinksService {
    constructor(prisma, eventsService, auditLogs) {
        this.prisma = prisma;
        this.eventsService = eventsService;
        this.auditLogs = auditLogs;
    }
    get db() { return this.prisma; }
    /**
     * Generates a secure random token.
     */
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    /**
     * Generates a new magic link for an order.
     * If an active link exists, it returns it.
     */
    async generateLink(orderId, userId) {
        // Check if an active link already exists
        const existing = await this.db.order_magic_links.findFirst({
            where: {
                order_id: orderId,
                revoked_at: null,
                expires_at: { gt: new Date() },
            },
        });
        if (existing) {
            // NOTE: In a real "hash-only" system we cannot return the token if we only stored the hash.
            // However, the requirement says "Store only hash" but also "Staff button: Generate link".
            // If we only store hash, we can only give the token ONCE at generation time.
            // If the staff clicks "Generate" again, and one exists, we can't show it if we didn't store it.
            // STRATEGY: 
            // 1. If we must strictly store only hash: We regenerate if they ask again (or we tell them "one exists").
            // OR 2. We store the token usage is "magic link".
            // 
            // The requirement "Store only hash" implies we cannot retrieve the original token.
            // So if one exists, we might need to regenerate it or tell user "Link exists but can't be shown".
            // But typically "Generate Link" button implies showing it.
            // 
            // Let's assume: access logic uses token.
            // 
            // Wait, if I store ONLY hash, I cannot construct the URL `domain.com/magic/TOKEN`.
            // So "Generate Link" MUST create a new one every time? OR we store the token properly (maybe encrypted?)
            // OR: The "Store only hash" requirement is for security.
            // 
            // Let's implement: regenerate if requested. But "Generate Link" implies idempotent if possible.
            // If "Store only hash" is strict: 
            // - We create a token. Return it to Frontend. Frontend shows it.
            // - DB stores hash.
            // - Next time staff opens page, we can't show the link. We can only show "Link Active".
            // - Staff must click "Regenerate" to get a new one.
            // So if existing is found, we can't return the raw token (we don't have it).
            // We will assume the UI handles "Link is active" vs "Show me the link".
            // But for this implementation, let's just return the existing object (without raw token) 
            // and let the controller/frontend handle "I need a token" -> force regenerate.
            // Actually, let's treat "generateLink" as "Create if not exists". 
            // Since we can't return the token of an existing one, we might assume the User always copies it immediately.
            // If they lost it, they must Regenerate.
            return existing; // Frontend will see "token_hash" but not the raw token.
        }
        return this.createLink(orderId, userId);
    }
    async createLink(orderId, userId) {
        const token = this.generateToken();
        // In a real high-security app we hash.
        // Ideally: const hash = crypto.createHash('sha256').update(token).digest('hex');
        // But then we need to lookup by hash.
        // For simplicity and to match "Store only hash" requirement:
        // We will store the token (which is large random string) AS the identifier?
        // No, lookup should be by token.
        // If we hash, `findFirst({ where: { token_hash: hash_of_input_token } })`.
        // Let's stick to the prompt: "Store only hash".
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        try {
            const created = await this.db.order_magic_links.create({
                data: {
                    order_id: orderId,
                    token_hash: tokenHash,
                    created_by_user_id: userId,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
                },
            });
            await this.auditLogs.log(orderId, client_1.AuditActorType.STAFF, 'LINK_CREATED', {
                actorId: userId ?? undefined,
                metadata: { linkId: created.id.toString() },
            });
            // Return the raw token ONLY here so the requester can see it once.
            return {
                ...created,
                raw_token: token,
            };
        }
        catch (e) {
            if (e.code === 'P2003') {
                throw new common_1.NotFoundException(`Order with ID ${orderId} not found`);
            }
            throw e;
        }
    }
    async regenerateLink(orderId, userId) {
        // Revoke all existing active links
        await this.db.order_magic_links.updateMany({
            where: {
                order_id: orderId,
                revoked_at: null,
            },
            data: {
                revoked_at: new Date(),
            },
        });
        await this.auditLogs.log(orderId, client_1.AuditActorType.STAFF, 'LINK_REGENERATED', {
            actorId: userId ?? undefined,
        });
        return this.createLink(orderId, userId);
    }
    /**
     * Get the most recent magic link for an order (active or not).
     */
    async getLinkForOrder(orderId) {
        return this.db.order_magic_links.findFirst({
            where: { order_id: orderId },
            orderBy: { created_at: 'desc' },
        });
    }
    async validateLink(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const link = await this.db.order_magic_links.findFirst({
            where: {
                token_hash: tokenHash,
            },
        });
        if (!link)
            return null;
        if (link.revoked_at)
            return null;
        if (new Date() > link.expires_at)
            return null; // Expired
        // Increment access count
        await this.db.order_magic_links.update({
            where: { id: link.id },
            data: {
                access_count: { increment: 1 },
                last_accessed_at: new Date(),
            },
        });
        // Log access (CLIENT)
        // We don't have a user ID for the client, so actorId is null.
        // To avoid spamming logs on every validation/page load, we could conditionally log?
        // But the requirement says "Link created, accessed...".
        // Let's log it.
        await this.auditLogs.log(link.order_id, client_1.AuditActorType.CLIENT, 'LINK_ACCESSED', {
            metadata: { tokenHash: tokenHash.substring(0, 8) + '...' },
        });
        return link;
    }
    async updateOrder(token, dto) {
        const link = await this.validateLink(token);
        if (!link)
            throw new common_1.ForbiddenException('Invalid token');
        const ev = await this.db.events.findUnique({ where: { id: link.order_id } });
        if (!ev)
            throw new common_1.NotFoundException('Order not found');
        const isLocked = this.eventsService.isEventLocked(ev);
        if (isLocked) {
            throw new common_1.ForbiddenException('Order is locked for editing');
        }
        await this.eventsService.updateEventTree(link.order_id, dto);
        await this.auditLogs.log(link.order_id, client_1.AuditActorType.CLIENT, 'CLIENT_EDIT', {
            metadata: { changes: dto },
        });
        return this.getEventForLink(link.order_id);
    }
    async getEventForLink(orderId) {
        return this.eventsService.getEventViewById(orderId);
    }
    async approveLink(token) {
        const link = await this.validateLink(token);
        if (!link)
            throw new common_1.ForbiddenException('Invalid or expired token');
        const event = await this.db.events.findUnique({ where: { id: link.order_id } });
        if (!event)
            throw new common_1.NotFoundException('Order not found');
        if (event.client_approval_status === 'APPROVED') {
            throw new common_1.BadRequestException('Order is already approved');
        }
        const result = await this.db.events.update({
            where: { id: link.order_id },
            data: {
                client_approval_status: 'APPROVED',
                approved_at: new Date(),
                is_locked: true,
            },
        });
        await this.auditLogs.log(link.order_id, client_1.AuditActorType.CLIENT, 'ORDER_APPROVED');
        return result;
    }
    async rejectLink(token) {
        const link = await this.validateLink(token);
        if (!link)
            throw new common_1.ForbiddenException('Invalid or expired token');
        const event = await this.db.events.findUnique({ where: { id: link.order_id } });
        if (!event)
            throw new common_1.NotFoundException('Order not found');
        if (event.client_approval_status !== 'PENDING') {
            throw new common_1.BadRequestException('Cannot reject an order that is not pending');
        }
        const result = await this.db.events.update({
            where: { id: link.order_id },
            data: {
                client_approval_status: 'REJECTED',
            },
        });
        await this.auditLogs.log(link.order_id, client_1.AuditActorType.CLIENT, 'ORDER_REJECTED');
        return result;
    }
    async createChangeRequest(token, changes, reason) {
        const link = await this.validateLink(token);
        if (!link)
            throw new common_1.ForbiddenException('Invalid or expired token');
        const event = await this.db.events.findUnique({ where: { id: link.order_id } });
        if (!event)
            throw new common_1.NotFoundException('Order not found');
        if (!event.is_locked) {
            throw new common_1.BadRequestException('Order must be locked to request changes');
        }
        const result = await this.db.order_change_requests.create({
            data: {
                order_id: link.order_id,
                changes_json: changes,
                reason: reason,
                status: 'PENDING',
            },
        });
        await this.auditLogs.log(link.order_id, client_1.AuditActorType.CLIENT, 'CHANGE_REQUEST_CREATED', {
            metadata: { reason, changes },
        });
        return result;
    }
};
exports.MagicLinksService = MagicLinksService;
exports.MagicLinksService = MagicLinksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        events_service_1.EventsService,
        audit_logs_service_1.AuditLogsService])
], MagicLinksService);
