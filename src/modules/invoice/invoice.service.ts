// src/invoices/invoices.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';


@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInvoiceDto) {
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

  async findOne(invoiceNumber: string) {
    return this.prisma.invoice.findUnique({
      where: { invoiceNumber },
    });
  }

async getLastInvoiceNumber() {
  const rows = await this.prisma.$queryRaw<
    Array<{ invoiceNumber: string }>
  >`
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

}