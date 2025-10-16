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
exports.PaymentsService = void 0;
// src/modules/payments/payments.service.ts
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../database/prisma.service");
let PaymentsService = class PaymentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /* =========================
       Helpers (non-transaction)
       ========================= */
    async ensureEventByGcal(gcalId) {
        if (!gcalId?.trim())
            throw new common_1.BadRequestException('gcalId is required');
        const ev = await this.prisma.events.findUnique({
            where: { gcalEventId: gcalId },
            select: {
                id: true,
                gcalEventId: true,
                order_total: true,
                discount: true,
                customer_id: true,
                status: true,
            },
        });
        if (!ev) {
            throw new common_1.NotFoundException(`Event with gcalId "${gcalId}" not found`);
        }
        return ev;
    }
    async summaryInternal(client, gcalId) {
        const ev = await client.events.findUnique({
            where: { gcalEventId: gcalId },
            select: { order_total: true, discount: true },
        });
        const agg = await client.event_payments.aggregate({
            where: { event_gcal_id: gcalId, status: 'succeeded' },
            _sum: { amount: true },
        });
        const orderTotal = new client_1.Prisma.Decimal(ev?.order_total ?? 0);
        const discount = new client_1.Prisma.Decimal(ev?.discount ?? 0);
        const paid = new client_1.Prisma.Decimal(agg._sum.amount ?? 0);
        const balance = orderTotal.sub(discount).sub(paid);
        return {
            orderTotal: Number(orderTotal),
            discount: Number(discount),
            paid: Number(paid),
            balance: Number(balance),
        };
    }
    async recomputeAndSetEventStatusInternal(client, gcalId) {
        const ev = await client.events.findUnique({
            where: { gcalEventId: gcalId },
            select: {
                id: true,
                customer_id: true,
                order_total: true,
                discount: true,
                status: true,
            },
        });
        if (!ev) {
            throw new common_1.NotFoundException(`Event with gcalId "${gcalId}" not found`);
        }
        // Any order with unit_price <= 0 ?
        const missingPrice = await client.event_catering_orders.findFirst({
            where: {
                event_catering: { event: { gcalEventId: gcalId } },
                NOT: { unit_price: { gt: new client_1.Prisma.Decimal(0) } },
            },
            select: { id: true },
        });
        const s = await this.summaryInternal(client, gcalId);
        const balanceLE0 = new client_1.Prisma.Decimal(s.balance).lte(new client_1.Prisma.Decimal(0));
        // const canBeComplete = !!ev.customer_id && !missingPrice && balanceLE0;
        // const newStatus = 'complete';
        // if (newStatus !== ev.status) {
        //   await client.events.update({
        //     where: { id: ev.id },
        //     data: { status: newStatus },
        //   });
        // }
    }
    /* =========================
       Public API
       ========================= */
    /** GET /events/by-gcal/:gcalId/payments */
    async list(gcalId) {
        await this.ensureEventByGcal(gcalId);
        const payments = await this.prisma.event_payments.findMany({
            where: { event_gcal_id: gcalId },
            orderBy: { paid_at: 'desc' },
        });
        const summary = await this.summary(gcalId);
        return { payments, summary };
    }
    /** POST /events/by-gcal/:gcalId/payments */
    async create(gcalId, dto) {
        return this.prisma.$transaction(async (tx) => {
            // 0) Ensure event exists
            const ev = await this.ensureEventByGcalTx(tx, gcalId);
            console.log(dto.discount);
            // 1) Apply discount first (if provided)
            if (dto.discount != null) {
                console.log('[PaymentsService] Received discount in DTO:', dto.discount);
                // Ensure the event exists and has an order_total
                const orderTotal = new client_1.Prisma.Decimal(ev.order_total ?? 0);
                const newDisc = new client_1.Prisma.Decimal(dto.discount);
                console.log('[PaymentsService] Current orderTotal =', orderTotal.toString());
                console.log('[PaymentsService] Computed newDisc =', newDisc.toString());
                // Validate non-negative
                if (newDisc.lt(0)) {
                    console.error('[PaymentsService] ❌ Discount < 0 — throwing error');
                    throw new common_1.BadRequestException('discount must be ≥ 0');
                }
                // Validate not greater than order total
                if (newDisc.gt(orderTotal)) {
                    console.error('[PaymentsService] ❌ Discount exceeds orderTotal — throwing error');
                    throw new common_1.BadRequestException(`discount cannot exceed order total (${orderTotal.toString()})`);
                }
                console.log(`[PaymentsService] ✅ Discount valid — updating events.discount = ${newDisc.toString()}`);
                // Perform update
                const updated = await tx.events.update({
                    where: { gcalEventId: gcalId },
                    data: { discount: new client_1.Prisma.Decimal(newDisc) },
                    select: { id: true, discount: true },
                });
                console.log('[PaymentsService] ✅ Event discount updated successfully:', updated);
            }
            // 2) Recompute balance, clamp amount if needed (defensive)
            const before = await this.summaryInternal(tx, gcalId);
            let amount = new client_1.Prisma.Decimal(dto.amount);
            if (amount.lte(0)) {
                throw new common_1.BadRequestException('amount must be > 0');
            }
            const bal = new client_1.Prisma.Decimal(before.balance);
            if (amount.gt(bal)) {
                amount = bal; // or throw if you prefer: `throw new BadRequestException('amount exceeds balance');`
            }
            // 3) Method-specific validation
            if (dto.method === 'credit' && !dto.squareId?.trim()) {
                throw new common_1.BadRequestException('squareId is required for credit payments');
            }
            // 4) Create payment
            const payment = await tx.event_payments.create({
                data: {
                    event_gcal_id: gcalId,
                    method: dto.method,
                    amount: new client_1.Prisma.Decimal(amount),
                    currency: dto.currency,
                    paid_at: dto.paidAt ? new Date(dto.paidAt) : new Date(),
                    square_id: dto.squareId ?? null,
                    notes: dto.notes ?? null,
                    // status defaults to 'succeeded'
                },
            });
            // 5) Recompute summary + event status after
            const after = await this.summaryInternal(tx, gcalId);
            await this.recomputeAndSetEventStatusInternal(tx, gcalId);
            return { payment, summary: after };
        }, {
            timeout: 20_000, // fail if the callback runs longer than 10 s
            maxWait: 2_000, // optional: how long to wait for a DB connection
        });
    }
    /** PUT /events/by-gcal/:gcalId/payments/:paymentId */
    async update(gcalId, paymentId, dto) {
        return this.prisma.$transaction(async (tx) => {
            await this.ensureEventByGcalTx(tx, gcalId);
            // Optional: allow discount change while editing a payment
            if (dto.discount != null) {
                const ev = await tx.events.findUnique({
                    where: { gcalEventId: gcalId },
                    select: { order_total: true },
                });
                const orderTotal = new client_1.Prisma.Decimal(ev?.order_total ?? 0);
                const newDisc = new client_1.Prisma.Decimal(dto.discount);
                if (newDisc.lt(0)) {
                    throw new common_1.BadRequestException('discount must be ≥ 0');
                }
                if (newDisc.gt(orderTotal)) {
                    throw new common_1.BadRequestException(`discount cannot exceed order total (${orderTotal.toString()})`);
                }
                await tx.events.update({
                    where: { gcalEventId: gcalId },
                    data: { discount: new client_1.Prisma.Decimal(newDisc) },
                });
            }
            // Ensure payment belongs to this event
            const exists = await tx.event_payments.findFirst({
                where: { id: BigInt(paymentId), event_gcal_id: gcalId },
                select: { id: true },
            });
            if (!exists) {
                throw new common_1.NotFoundException(`Payment ${paymentId} not found for event ${gcalId}`);
            }
            // If amount provided, clamp against latest balance
            let amountDecimal;
            if (dto.amount != null) {
                const s = await this.summaryInternal(tx, gcalId);
                let a = new client_1.Prisma.Decimal(dto.amount);
                if (a.lte(0))
                    throw new common_1.BadRequestException('amount must be > 0');
                const bal = new client_1.Prisma.Decimal(s.balance);
                if (a.gt(bal))
                    a = bal; // or throw
                amountDecimal = new client_1.Prisma.Decimal(a);
            }
            // If method is credit, squareId required
            if (dto.method === 'credit' && !dto.squareId?.trim()) {
                throw new common_1.BadRequestException('squareId is required when method=credit');
            }
            const updated = await tx.event_payments.update({
                where: { id: BigInt(paymentId) },
                data: {
                    method: dto.method ?? undefined,
                    amount: amountDecimal ?? undefined,
                    currency: dto.currency ?? undefined,
                    paid_at: dto.paidAt ? new Date(dto.paidAt) : undefined,
                    square_id: dto.squareId ?? undefined,
                    notes: dto.notes ?? undefined,
                    status: dto.status ?? undefined,
                },
            });
            const after = await this.summaryInternal(tx, gcalId);
            await this.recomputeAndSetEventStatusInternal(tx, gcalId);
            return { payment: updated, summary: after };
        });
    }
    /** DELETE /events/by-gcal/:gcalId/payments/:paymentId */
    async remove(gcalId, paymentId) {
        await this.ensureEventByGcal(gcalId);
        const exists = await this.prisma.event_payments.findFirst({
            where: { id: BigInt(paymentId), event_gcal_id: gcalId },
            select: { id: true },
        });
        if (!exists) {
            throw new common_1.NotFoundException(`Payment ${paymentId} not found for event ${gcalId}`);
        }
        await this.prisma.event_payments.delete({
            where: { id: BigInt(paymentId) },
        });
        const summary = await this.summary(gcalId);
        await this.recomputeAndSetEventStatus(gcalId);
        return { ok: true, summary };
    }
    /** GET /events/by-gcal/:gcalId/payments/summary */
    async summary(gcalId) {
        await this.ensureEventByGcal(gcalId);
        return this.summaryInternal(this.prisma, gcalId);
    }
    /* =========================
       Tx-bound variants
       ========================= */
    async ensureEventByGcalTx(tx, gcalId) {
        if (!gcalId?.trim())
            throw new common_1.BadRequestException('gcalId is required');
        const ev = await tx.events.findUnique({
            where: { gcalEventId: gcalId },
            select: {
                id: true,
                gcalEventId: true,
                order_total: true,
                discount: true,
                customer_id: true,
                status: true,
            },
        });
        if (!ev) {
            throw new common_1.NotFoundException(`Event with gcalId "${gcalId}" not found`);
        }
        return ev;
    }
    async recomputeAndSetEventStatus(gcalId) {
        await this.recomputeAndSetEventStatusInternal(this.prisma, gcalId);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
