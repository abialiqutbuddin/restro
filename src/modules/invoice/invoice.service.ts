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
  const last = await this.prisma.invoice.findFirst({
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  if (!last) {
    return { last: null, lastNumeric: 0, next: 'INV-0001' };
  }

  // make sure invoiceNumber is string "1550" or "INV-1550"
  const num = parseInt(last.invoiceNumber.replace(/\D/g, ''), 10) || 0;
  return {
    last: last.invoiceNumber,
    lastNumeric: num,
    next: `${String(num + 1).padStart(4, '0')}`,
  };
}

}