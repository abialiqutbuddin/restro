// src/modules/payments/payments.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payments.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  private async ensureEventByGcal(gcalId: string) {
    if (!gcalId?.trim()) {
      throw new BadRequestException('gcalId is required');
    }
    const ev = await this.prisma.events.findUnique({
      where: { gcalEventId: gcalId },
      select: { gcalEventId: true, order_total: true, discount: true },
    });
    if (!ev) throw new NotFoundException(`Event with gcalId "${gcalId}" not found`);
    return ev;
  }

  async list(gcalId: string) {
    await this.ensureEventByGcal(gcalId);
    const payments = await this.prisma.event_payments.findMany({
      where: { event_gcal_id: gcalId },
      orderBy: { paid_at: 'desc' },
    });
    const summary = await this.summary(gcalId);
    return { payments, summary };
  }

  async create(gcalId: string, dto: CreatePaymentDto) {
    await this.ensureEventByGcal(gcalId);

    if (dto.method === 'credit' && !dto.squareId?.trim()) {
      throw new BadRequestException('squareId is required for credit payments');
    }

    const payment = await this.prisma.event_payments.create({
      data: {
        event_gcal_id: gcalId,
        method: dto.method as any,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency,
        paid_at: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        square_id: dto.squareId ?? null,
        notes: dto.notes ?? null,
        // status defaults to 'succeeded'
      },
    });

    const summary = await this.summary(gcalId);
    return { payment, summary };
  }

  async update(gcalId: string, paymentId: number, dto: UpdatePaymentDto) {
    await this.ensureEventByGcal(gcalId);

    if (dto.method === 'credit' && !dto.squareId?.trim()) {
      throw new BadRequestException('squareId is required when method=credit');
    }

    // Ensure the payment belongs to this gcalId
    const exists = await this.prisma.event_payments.findFirst({
      where: { id: BigInt(paymentId), event_gcal_id: gcalId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Payment ${paymentId} not found for event ${gcalId}`);

    const updated = await this.prisma.event_payments.update({
      where: { id: BigInt(paymentId) },
      data: {
        method: (dto.method as any) ?? undefined,
        amount: dto.amount != null ? new Prisma.Decimal(dto.amount) : undefined,
        currency: dto.currency ?? undefined,
        paid_at: dto.paidAt ? new Date(dto.paidAt) : undefined,
        square_id: dto.squareId ?? undefined,
        notes: dto.notes ?? undefined,
        status: (dto.status as any) ?? undefined,
      },
    });

    const summary = await this.summary(gcalId);
    return { payment: updated, summary };
  }

  async remove(gcalId: string, paymentId: number) {
    await this.ensureEventByGcal(gcalId);

    const exists = await this.prisma.event_payments.findFirst({
      where: { id: BigInt(paymentId), event_gcal_id: gcalId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Payment ${paymentId} not found for event ${gcalId}`);

    await this.prisma.event_payments.delete({ where: { id: BigInt(paymentId) } });
    const summary = await this.summary(gcalId);
    return { ok: true, summary };
  }

  /** Returns { orderTotal, discount, paid, balance } */
  async summary(gcalId: string) {
    const ev = await this.ensureEventByGcal(gcalId);

    const agg = await this.prisma.event_payments.aggregate({
      where: { event_gcal_id: gcalId, status: 'succeeded' as any },
      _sum: { amount: true },
    });

    const orderTotal = ev.order_total ?? new Prisma.Decimal(0);
    const discount = ev.discount ?? new Prisma.Decimal(0);
    const paid = agg._sum.amount ?? new Prisma.Decimal(0);
    const balance = orderTotal.sub(discount).sub(paid);

    return {
      orderTotal: Number(orderTotal),
      discount: Number(discount),
      paid: Number(paid),
      balance: Number(balance),
    };
  }
}