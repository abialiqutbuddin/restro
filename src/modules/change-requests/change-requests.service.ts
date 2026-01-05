import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditActorType } from '@prisma/client';

@Injectable()
export class ChangeRequestsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogs: AuditLogsService,
    ) { }

    /**
     * List change requests with event details
     */
    async list(options: { skip?: number; take?: number; status?: string }) {
        const { skip = 0, take = 20, status } = options;

        const where = status ? { status: status as any } : {};

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
    async approve(id: string, reviewerId: bigint, notes?: string) {
        const request = await this.prisma.order_change_requests.findUnique({
            where: { id: BigInt(id) },
        });

        if (!request) {
            throw new NotFoundException(`Change request ${id} not found`);
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

        await this.auditLogs.log(request.order_id, AuditActorType.STAFF, 'CHANGE_REQUEST_APPROVED', {
            actorId: reviewerId,
            metadata: { requestId: id, notes },
        });

        return result;
    }

    /**
     * Reject a change request
     */
    async reject(id: string, reviewerId: bigint, notes?: string) {
        const request = await this.prisma.order_change_requests.findUnique({
            where: { id: BigInt(id) },
        });

        if (!request) {
            throw new NotFoundException(`Change request ${id} not found`);
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

        await this.auditLogs.log(request.order_id, AuditActorType.STAFF, 'CHANGE_REQUEST_REJECTED', {
            actorId: reviewerId,
            metadata: { requestId: id, notes },
        });

        return result;
    }
}
