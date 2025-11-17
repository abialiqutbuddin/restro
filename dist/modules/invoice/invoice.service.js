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
exports.InvoicesService = void 0;
// src/invoices/invoices.service.ts
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../database/prisma.service");
let InvoicesService = class InvoicesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const eventIds = (dto.eventIds ?? []).map((id) => BigInt(id));
        return this.prisma.$transaction(async (tx) => {
            const events = eventIds.length
                ? await this.ensureEventsAttachable(tx, eventIds)
                : [];
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNumber: dto.invoiceNumber,
                    date: new Date(dto.date),
                    status: dto.status ?? 'ISSUED',
                    customerName: dto.customerName,
                    customerEmail: dto.customerEmail,
                    customerPhone: dto.customerPhone,
                    company: dto.company,
                    currencyCode: dto.currencyCode,
                    taxRate: dto.taxRate,
                    discount: dto.discount ?? 0,
                    shipping: dto.shipping ?? 0,
                    isTaxExempt: dto.isTaxExempt ?? false,
                    paymentInstr: dto.paymentInstr,
                    subtotal: dto.subtotal,
                    tax: dto.tax,
                    total: dto.total,
                    envelope: dto.envelope,
                    eventLines: dto.eventLines,
                    items: dto.items,
                },
            });
            if (events.length) {
                await tx.invoiceEvent.createMany({
                    data: events.map((ev) => ({
                        invoiceId: invoice.id,
                        eventId: ev.id,
                        lineTotal: ev.order_total ?? new client_1.Prisma.Decimal(0),
                    })),
                });
                await tx.events.updateMany({
                    where: { id: { in: events.map((ev) => ev.id) } },
                    data: {
                        billing_status: dto.eventBillingStatus ?? client_1.EventBillingStatus.invoiced,
                    },
                });
            }
            return tx.invoice.findUnique({
                where: { id: invoice.id },
                include: {
                    eventLinks: {
                        include: { event: true },
                    },
                },
            });
        });
    }
    async findAll() {
        return this.prisma.invoice.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                eventLinks: true,
            },
        });
    }
    async findOne(invoiceNumber) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { invoiceNumber },
            include: {
                eventLinks: {
                    include: { event: true },
                },
            },
        });
        if (!invoice)
            throw new common_1.NotFoundException(`Invoice ${invoiceNumber} not found`);
        return invoice;
    }
    async markAsPaid(invoiceNumber) {
        const existing = await this.prisma.invoice.findUnique({
            where: { invoiceNumber },
            select: { id: true },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Invoice ${invoiceNumber} not found`);
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.invoice.update({
                where: { invoiceNumber },
                data: { status: 'PAID' },
            });
            await tx.events.updateMany({
                where: { invoiceEvents: { some: { invoiceId: updated.id } } },
                data: { billing_status: client_1.EventBillingStatus.paid },
            });
            return updated;
        });
    }
    async getLastInvoiceNumber() {
        const rows = await this.prisma.$queryRaw `
      SELECT \`invoiceNumber\`
      FROM \`Invoice\`
      ORDER BY CAST(REGEXP_REPLACE(\`invoiceNumber\`, '[^0-9]', '') AS UNSIGNED) DESC
      LIMIT 1
    `;
        const lastInv = rows[0]?.invoiceNumber ?? null;
        const num = lastInv ? parseInt(lastInv.replace(/\D/g, ''), 10) || 0 : 0;
        return {
            last: lastInv,
            lastNumeric: num,
            next: `${String(num + 1).padStart(4, '0')}`, // keep 0001 style
        };
    }
    async ensureEventsAttachable(client, ids) {
        const events = await client.events.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                billing_type: true,
                invoiceEvents: { select: { invoiceId: true } },
                order_total: true,
            },
        });
        if (events.length !== ids.length) {
            const missing = ids
                .filter((id) => !events.find((ev) => ev.id === id))
                .map((id) => id.toString());
            throw new common_1.NotFoundException(`Events not found: ${missing.join(', ')}`);
        }
        const alreadyLinked = events.filter((ev) => ev.invoiceEvents.length);
        if (alreadyLinked.length) {
            throw new common_1.BadRequestException(`Events already invoiced: ${alreadyLinked.map((ev) => ev.id.toString()).join(', ')}`);
        }
        const nonContract = events.filter((ev) => ev.billing_type !== client_1.EventBillingType.contract);
        if (nonContract.length) {
            throw new common_1.BadRequestException(`Only contractual events can be invoiced. Offending IDs: ${nonContract
                .map((ev) => ev.id.toString())
                .join(', ')}`);
        }
        return events;
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InvoicesService);
