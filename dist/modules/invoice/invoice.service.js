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
const prisma_service_1 = require("../../database/prisma.service");
let InvoicesService = class InvoicesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        return this.prisma.invoice.create({
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
    }
    async findAll() {
        return this.prisma.invoice.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(invoiceNumber) {
        return this.prisma.invoice.findUnique({
            where: { invoiceNumber },
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
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InvoicesService);
