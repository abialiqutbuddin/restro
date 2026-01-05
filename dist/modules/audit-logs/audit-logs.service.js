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
exports.AuditLogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let AuditLogsService = class AuditLogsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(orderId, actorType, action, options) {
        try {
            await this.prisma.order_audit_logs.create({
                data: {
                    order_id: BigInt(orderId),
                    actor_type: actorType,
                    action: action,
                    actor_id: options?.actorId ? BigInt(options.actorId) : null,
                    metadata: options?.metadata || {},
                },
            });
        }
        catch (e) {
            console.error(`[AuditLog] Failed to log action "${action}" for order ${orderId}:`, e);
            // We generally don't want audit logging failure to block the main transaction,
            // but strictly speaking an audit trail SHOULD ensure logs are written.
            // For now, we log the error but allow flow to proceed unless critical.
        }
    }
    async findAll(query) {
        const where = {};
        if (query.action) {
            where.action = query.action;
        }
        if (query.orderId) {
            where.order_id = BigInt(query.orderId);
        }
        const skip = query.skip ? Number(query.skip) : 0;
        const take = query.take ? Number(query.take) : 50;
        const [total, logs] = await Promise.all([
            this.prisma.order_audit_logs.count({ where }),
            this.prisma.order_audit_logs.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    event: {
                        select: {
                            id: true,
                            // Add other event fields if needed
                        },
                    },
                },
                orderBy: {
                    timestamp: 'desc',
                },
                skip,
                take,
            }),
        ]);
        // Serialize BigInt
        const data = JSON.parse(JSON.stringify(logs, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        return { items: data, total };
    }
    async updateStatus(id, status) {
        const logId = BigInt(id);
        const log = await this.prisma.order_audit_logs.findUnique({ where: { id: logId } });
        if (!log)
            return null;
        const currentMeta = log.metadata || {};
        const newMeta = { ...currentMeta, status };
        return this.prisma.order_audit_logs.update({
            where: { id: logId },
            data: { metadata: newMeta },
        });
    }
};
exports.AuditLogsService = AuditLogsService;
exports.AuditLogsService = AuditLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditLogsService);
