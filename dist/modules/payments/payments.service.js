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
    async ensureEventByGcal(gcalId) {
        if (!gcalId?.trim()) {
            throw new common_1.BadRequestException('gcalId is required');
        }
        const ev = await this.prisma.events.findUnique({
            where: { gcalEventId: gcalId },
            select: { gcalEventId: true, order_total: true, discount: true },
        });
        if (!ev)
            throw new common_1.NotFoundException(`Event with gcalId "${gcalId}" not found`);
        return ev;
    }
    async recomputeAndSetEventStatus(gcalId) {
        const ev = await this.prisma.events.findUnique({
            where: { gcalEventId: gcalId },
            select: { id: true, customer_id: true, order_total: true, discount: true, status: true },
        });
        if (!ev)
            throw new common_1.NotFoundException(`Event with gcalId "${gcalId}" not found`);
        const hasCustomer = !!ev.customer_id;
        // Missing/zero prices?
        const missingPrice = await this.prisma.event_catering_orders.findFirst({
            where: {
                event_catering: { event_id: ev.id },
                // any row where unit_price is NOT > 0  => includes 0 and negatives
                NOT: { unit_price: { gt: new client_1.Prisma.Decimal(0) } },
            },
            select: { id: true },
        });
        // Sum succeeded payments
        const agg = await this.prisma.event_payments.aggregate({
            where: { event_gcal_id: gcalId, status: 'succeeded' },
            _sum: { amount: true },
        });
        const orderTotal = ev.order_total ?? new client_1.Prisma.Decimal(0);
        const discount = ev.discount ?? new client_1.Prisma.Decimal(0);
        const paid = agg._sum.amount ?? new client_1.Prisma.Decimal(0);
        const balance = orderTotal.sub(discount).sub(paid);
        const canBeComplete = hasCustomer && !missingPrice && balance.lte(new client_1.Prisma.Decimal(0));
        const newStatus = canBeComplete ? 'complete' : 'incomplete';
        if (newStatus !== ev.status) {
            await this.prisma.events.update({ where: { id: ev.id }, data: { status: newStatus } });
        }
    }
    async list(gcalId) {
        await this.ensureEventByGcal(gcalId);
        const payments = await this.prisma.event_payments.findMany({
            where: { event_gcal_id: gcalId },
            orderBy: { paid_at: 'desc' },
        });
        const summary = await this.summary(gcalId);
        return { payments, summary };
    }
    async create(gcalId, dto) {
        await this.ensureEventByGcal(gcalId);
        if (dto.method === 'credit' && !dto.squareId?.trim()) {
            throw new common_1.BadRequestException('squareId is required for credit payments');
        }
        const payment = await this.prisma.event_payments.create({
            data: {
                event_gcal_id: gcalId,
                method: dto.method,
                amount: new client_1.Prisma.Decimal(dto.amount),
                currency: dto.currency,
                paid_at: dto.paidAt ? new Date(dto.paidAt) : new Date(),
                square_id: dto.squareId ?? null,
                notes: dto.notes ?? null,
                // status defaults to 'succeeded'
            },
        });
        const summary = await this.summary(gcalId);
        await this.recomputeAndSetEventStatus(gcalId);
        return { payment, summary };
    }
    async update(gcalId, paymentId, dto) {
        await this.ensureEventByGcal(gcalId);
        if (dto.method === 'credit' && !dto.squareId?.trim()) {
            throw new common_1.BadRequestException('squareId is required when method=credit');
        }
        // Ensure the payment belongs to this gcalId
        const exists = await this.prisma.event_payments.findFirst({
            where: { id: BigInt(paymentId), event_gcal_id: gcalId },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException(`Payment ${paymentId} not found for event ${gcalId}`);
        const updated = await this.prisma.event_payments.update({
            where: { id: BigInt(paymentId) },
            data: {
                method: dto.method ?? undefined,
                amount: dto.amount != null ? new client_1.Prisma.Decimal(dto.amount) : undefined,
                currency: dto.currency ?? undefined,
                paid_at: dto.paidAt ? new Date(dto.paidAt) : undefined,
                square_id: dto.squareId ?? undefined,
                notes: dto.notes ?? undefined,
                status: dto.status ?? undefined,
            },
        });
        const summary = await this.summary(gcalId);
        await this.recomputeAndSetEventStatus(gcalId);
        return { payment: updated, summary };
    }
    async remove(gcalId, paymentId) {
        await this.ensureEventByGcal(gcalId);
        const exists = await this.prisma.event_payments.findFirst({
            where: { id: BigInt(paymentId), event_gcal_id: gcalId },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException(`Payment ${paymentId} not found for event ${gcalId}`);
        await this.prisma.event_payments.delete({ where: { id: BigInt(paymentId) } });
        const summary = await this.summary(gcalId);
        await this.recomputeAndSetEventStatus(gcalId);
        return { ok: true, summary };
    }
    /** Returns { orderTotal, discount, paid, balance } */
    async summary(gcalId) {
        const ev = await this.ensureEventByGcal(gcalId);
        const agg = await this.prisma.event_payments.aggregate({
            where: { event_gcal_id: gcalId, status: 'succeeded' },
            _sum: { amount: true },
        });
        const orderTotal = ev.order_total ?? new client_1.Prisma.Decimal(0);
        const discount = ev.discount ?? new client_1.Prisma.Decimal(0);
        const paid = agg._sum.amount ?? new client_1.Prisma.Decimal(0);
        const balance = orderTotal.sub(discount).sub(paid);
        return {
            orderTotal: Number(orderTotal),
            discount: Number(discount),
            paid: Number(paid),
            balance: Number(balance),
        };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
