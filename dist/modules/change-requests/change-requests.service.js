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
exports.ChangeRequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const client_1 = require("@prisma/client");
let ChangeRequestsService = class ChangeRequestsService {
    constructor(prisma, auditLogs) {
        this.prisma = prisma;
        this.auditLogs = auditLogs;
    }
    /**
     * List change requests with event details
     */
    async list(options) {
        const { skip = 0, take = 20, status } = options;
        const where = status ? { status: status } : {};
        const [items, total] = await Promise.all([
            this.prisma.order_change_requests.findMany({
                where,
                skip,
                take,
                orderBy: { requested_at: 'desc' },
                include: {
                    event: {
                        include: {
                            customer: true,
                        },
                    },
                    reviewer: {
                        select: { id: true, name: true, email: true },
                    },
                },
            }),
            this.prisma.order_change_requests.count({ where }),
        ]);
        return {
            items: items.map(item => ({
                id: item.id.toString(),
                orderId: item.order_id.toString(),
                gcalEventId: item.event?.gcalEventId ?? null,
                changesJson: item.changes_json,
                reason: item.reason,
                status: item.status,
                requestedAt: item.requested_at,
                reviewedBy: item.reviewed_by?.toString() ?? null,
                reviewedAt: item.reviewed_at,
                reviewNotes: item.review_notes,
                // Event details
                customerName: item.event?.customer?.name ?? 'Unknown',
                customerEmail: item.event?.customer?.email ?? null,
                eventDate: item.event?.event_datetime ?? null,
                venue: item.event?.venue ?? null,
                // Reviewer details
                reviewerName: item.reviewer?.name ?? null,
            })),
            total,
            skip,
            take,
        };
    }
    /**
     * Approve a change request
     */
    async approve(id, reviewerId, notes) {
        const request = await this.prisma.order_change_requests.findUnique({
            where: { id: BigInt(id) },
        });
        if (!request) {
            throw new common_1.NotFoundException(`Change request ${id} not found`);
        }
        const result = await this.prisma.order_change_requests.update({
            where: { id: BigInt(id) },
            data: {
                status: 'APPROVED',
                reviewed_by: reviewerId,
                reviewed_at: new Date(),
                review_notes: notes ?? null,
            },
        });
        await this.auditLogs.log(request.order_id, client_1.AuditActorType.STAFF, 'CHANGE_REQUEST_APPROVED', {
            actorId: reviewerId,
            metadata: { requestId: id, notes },
        });
        return result;
    }
    /**
     * Reject a change request
     */
    async reject(id, reviewerId, notes) {
        const request = await this.prisma.order_change_requests.findUnique({
            where: { id: BigInt(id) },
        });
        if (!request) {
            throw new common_1.NotFoundException(`Change request ${id} not found`);
        }
        const result = await this.prisma.order_change_requests.update({
            where: { id: BigInt(id) },
            data: {
                status: 'REJECTED',
                reviewed_by: reviewerId,
                reviewed_at: new Date(),
                review_notes: notes ?? null,
            },
        });
        await this.auditLogs.log(request.order_id, client_1.AuditActorType.STAFF, 'CHANGE_REQUEST_REJECTED', {
            actorId: reviewerId,
            metadata: { requestId: id, notes },
        });
        return result;
    }
};
exports.ChangeRequestsService = ChangeRequestsService;
exports.ChangeRequestsService = ChangeRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_logs_service_1.AuditLogsService])
], ChangeRequestsService);
