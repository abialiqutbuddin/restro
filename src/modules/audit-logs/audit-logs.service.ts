import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditActorType } from '@prisma/client';

@Injectable()
export class AuditLogsService {
    constructor(private readonly prisma: PrismaService) { }

    async log(
        orderId: string | number | bigint,
        actorType: AuditActorType,
        action: string,
        options?: {
            actorId?: string | number | bigint;
            metadata?: Record<string, any>;
        },
    ) {
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
        } catch (e) {
            console.error(
                `[AuditLog] Failed to log action "${action}" for order ${orderId}:`,
                e,
            );
            // We generally don't want audit logging failure to block the main transaction,
            // but strictly speaking an audit trail SHOULD ensure logs are written.
            // For now, we log the error but allow flow to proceed unless critical.
        }
    }
    async findAll(query: { action?: string; orderId?: string; skip?: number; take?: number }) {
        const where: any = {};
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
        const data = JSON.parse(
            JSON.stringify(logs, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value,
            ),
        );

        return { items: data, total };
    }
    async updateStatus(id: number | string, status: string) {
        const logId = BigInt(id);
        const log = await this.prisma.order_audit_logs.findUnique({ where: { id: logId } });
        if (!log) return null;

        const currentMeta = (log.metadata as Record<string, any>) || {};
        const newMeta = { ...currentMeta, status };

        return this.prisma.order_audit_logs.update({
            where: { id: logId },
            data: { metadata: newMeta },
        });
    }
}
