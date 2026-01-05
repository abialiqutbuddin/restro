// src/invoices/invoices.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventBillingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

type TxLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateInvoiceDto) {
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
          updatedAt: new Date(),
        },
      });

      if (events.length) {
        await tx.invoiceevent.createMany({
          data: events.map((ev) => ({
            invoiceId: invoice.id,
            eventId: ev.id,
            lineTotal: ev.order_total ?? new Prisma.Decimal(0),
          })),
        });

        await tx.events.updateMany({
          where: { id: { in: events.map((ev) => ev.id) } },
          data: {
            billing_status: dto.eventBillingStatus ?? EventBillingStatus.invoiced,
          },
        });
      }

      return tx.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          invoiceevent: {
            include: { events: true },
          },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        invoiceevent: true,
      },
    });
  }

  async findOne(invoiceNumber: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        invoiceevent: {
          include: { events: true },
        },
      },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceNumber} not found`);
    return invoice;
  }

  async markAsPaid(invoiceNumber: string) {
    const existing = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Invoice ${invoiceNumber} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { invoiceNumber },
        data: { status: 'PAID' },
      });

      await tx.events.updateMany({
        where: { invoiceevent: { some: { invoiceId: updated.id } } },
        data: { billing_status: EventBillingStatus.paid },
      });

      return updated;
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

  private async ensureEventsAttachable(client: TxLike, ids: bigint[]) {
    const events = await client.events.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        invoiceevent: { select: { invoiceId: true } },
        order_total: true,
      },
    });

    if (events.length !== ids.length) {
      const missing = ids
        .filter((id) => !events.find((ev) => ev.id === id))
        .map((id) => id.toString());
      throw new NotFoundException(`Events not found: ${missing.join(', ')}`);
    }

    const alreadyLinked = events.filter((ev) => ev.invoiceevent.length);
    if (alreadyLinked.length) {
      throw new BadRequestException(
        `Events already invoiced: ${alreadyLinked.map((ev) => ev.id.toString()).join(', ')}`,
      );
    }

    return events;
  }
}
