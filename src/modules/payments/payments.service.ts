// src/modules/payments/payments.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payments.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) { }

  /* =========================
     Helpers (non-transaction)
     ========================= */

  private async ensureEventByGcal(gcalId: string) {
    if (!gcalId?.trim()) throw new BadRequestException('gcalId is required');
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
      throw new NotFoundException(`Event with gcalId "${gcalId}" not found`);
    }
    return ev;
  }

  private async summaryInternal(
    client: PrismaService | Prisma.TransactionClient,
    gcalId: string,
  ) {
    const ev = await client.events.findUnique({
      where: { gcalEventId: gcalId },
      select: { order_total: true, discount: true },
    });
    const agg = await client.event_payments.aggregate({
      where: { event_gcal_id: gcalId, status: 'succeeded' as any },
      _sum: { amount: true },
    });

    const orderTotal = new Prisma.Decimal(ev?.order_total ?? 0);
    const discount = new Prisma.Decimal(ev?.discount ?? 0);
    const paid = new Prisma.Decimal(agg._sum.amount ?? 0);
    const balance = orderTotal.sub(discount).sub(paid);

    return {
      orderTotal: Number(orderTotal),
      discount: Number(discount),
      paid: Number(paid),
      balance: Number(balance),
    };
  }

  private async recomputeAndSetEventStatusInternal(
    client: PrismaService | Prisma.TransactionClient,
    gcalId: string,
  ) {
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
      throw new NotFoundException(`Event with gcalId "${gcalId}" not found`);
    }

    // Any order with unit_price <= 0 ?
    const missingPrice = await client.event_catering_orders.findFirst({
      where: {
        event_catering: { event: { gcalEventId: gcalId } },
        NOT: { unit_price: { gt: new Prisma.Decimal(0) } },
      },
      select: { id: true },
    });

    const s = await this.summaryInternal(client, gcalId);
    const balanceLE0 = new Prisma.Decimal(s.balance).lte(
      new Prisma.Decimal(0),
    );
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
  // async list(gcalId: string) {
  //   await this.ensureEventByGcal(gcalId);
  //   const payments = await this.prisma.event_payments.findMany({
  //     where: { event_gcal_id: gcalId },
  //     orderBy: { paid_at: 'desc' },
  //   });
  //   const summary = await this.summary(gcalId);
  //   return { payments, summary };
  // }
  // in your service
  async list(gcalId: string) {
    // ensure the event exists (you already do this)
    await this.ensureEventByGcal(gcalId);

    // fetch event (with its customer) + payments in parallel
    const [ev, payments] = await this.prisma.$transaction([
      this.prisma.events.findUnique({
        where: { gcalEventId: gcalId },
        select: {
          // we only need the customer record; you can add more event fields if needed
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              default_venue: true,
              notes: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      }),
      this.prisma.event_payments.findMany({
        where: { event_gcal_id: gcalId },
        orderBy: { paid_at: 'desc' },
      }),
    ]);

    // summary may run its own queries, keep it outside the $transaction if it already uses prisma internally
    const summary = await this.summary(gcalId);

    return {
      payments,
      summary,
      customer: ev?.customer ?? null,  // <- your customer details (or null if none)
    };
  }

  /** POST /events/by-gcal/:gcalId/payments */
  async create(gcalId: string, dto: CreatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      // 0) Ensure event exists
      const ev = await this.ensureEventByGcalTx(tx, gcalId);

      const cust = dto.customer;
      if (cust && cust.email?.trim() && cust.phone?.trim()) {
        const email = cust.email.trim();
        const phone = cust.phone.trim();

        // Prefer the event's linked customer_id
        if (ev.customer_id) {
          await tx.customers.update({
            where: { id: BigInt(ev.customer_id) },
            data: { email, phone },
          });
        } else if (cust.id) {
          // If client sent a customer id, attach + update
          const cid = BigInt(cust.id);
          await tx.customers.update({
            where: { id: cid },
            data: { email, phone },
          });
          await tx.events.update({
            where: { gcalEventId: gcalId },
            data: { customer_id: cid },
          });
        } else {
          // (Optional) If no link & no id, you could create-or-skip.
          // await tx.customers.create({ data: { name: cust.name ?? '', email, phone } })
          // and then set events.customer_id = new id. Skipping as per your ask.
        }
      }

      // 1) Apply discount first (if provided)
      if (dto.discount != null) {
        console.log('[PaymentsService] Received discount in DTO:', dto.discount);

        // Ensure the event exists and has an order_total
        const orderTotal = new Prisma.Decimal(ev.order_total ?? 0);
        const newDisc = new Prisma.Decimal(dto.discount);

        console.log('[PaymentsService] Current orderTotal =', orderTotal.toString());
        console.log('[PaymentsService] Computed newDisc =', newDisc.toString());

        // Validate non-negative
        if (newDisc.lt(0)) {
          console.error('[PaymentsService] ❌ Discount < 0 — throwing error');
          throw new BadRequestException('discount must be ≥ 0');
        }

        // Validate not greater than order total
        if (newDisc.gt(orderTotal)) {
          console.error(
            '[PaymentsService] ❌ Discount exceeds orderTotal — throwing error',
          );
          throw new BadRequestException(
            `discount cannot exceed order total (${orderTotal.toString()})`,
          );
        }

        console.log(
          `[PaymentsService] ✅ Discount valid — updating events.discount = ${newDisc.toString()}`,
        );

        // Perform update
        const updated = await tx.events.update({
          where: { gcalEventId: gcalId },
          data: { discount: new Prisma.Decimal(newDisc) },
          select: { id: true, discount: true },
        });

        console.log(
          '[PaymentsService] ✅ Event discount updated successfully:',
          updated,
        );
      }

      // 2) Recompute balance, clamp amount if needed (defensive)
      const before = await this.summaryInternal(tx, gcalId);
      let amount = new Prisma.Decimal(dto.amount);
      if (amount.lte(0)) {
        throw new BadRequestException('amount must be > 0');
      }
      const bal = new Prisma.Decimal(before.balance);
      if (amount.gt(bal)) {
        amount = bal; // or throw if you prefer: `throw new BadRequestException('amount exceeds balance');`
      }

      // 3) Method-specific validation
      if (dto.method === 'credit' && !dto.squareId?.trim()) {
        throw new BadRequestException(
          'squareId is required for credit payments',
        );
      }

      // 4) Create payment
      const payment = await tx.event_payments.create({
        data: {
          event_gcal_id: gcalId,
          method: dto.method as any,
          amount: new Prisma.Decimal(amount),
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
      timeout: 20_000,  // fail if the callback runs longer than 10 s
      maxWait: 2_000,   // optional: how long to wait for a DB connection
    },);
  }

  /** PUT /events/by-gcal/:gcalId/payments/:paymentId */
  async update(gcalId: string, paymentId: number, dto: UpdatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.ensureEventByGcalTx(tx, gcalId);

      // Optional: allow discount change while editing a payment
      if (dto.discount != null) {
        const ev = await tx.events.findUnique({
          where: { gcalEventId: gcalId },
          select: { order_total: true },
        });
        const orderTotal = new Prisma.Decimal(ev?.order_total ?? 0);
        const newDisc = new Prisma.Decimal(dto.discount);
        if (newDisc.lt(0)) {
          throw new BadRequestException('discount must be ≥ 0');
        }
        if (newDisc.gt(orderTotal)) {
          throw new BadRequestException(
            `discount cannot exceed order total (${orderTotal.toString()})`,
          );
        }
        await tx.events.update({
          where: { gcalEventId: gcalId },
          data: { discount: new Prisma.Decimal(newDisc) },
        });
      }

      // Ensure payment belongs to this event
      const exists = await tx.event_payments.findFirst({
        where: { id: BigInt(paymentId), event_gcal_id: gcalId },
        select: { id: true },
      });
      if (!exists) {
        throw new NotFoundException(
          `Payment ${paymentId} not found for event ${gcalId}`,
        );
      }

      // If amount provided, clamp against latest balance
      let amountDecimal: Prisma.Decimal | undefined;
      if (dto.amount != null) {
        const s = await this.summaryInternal(tx, gcalId);
        let a = new Prisma.Decimal(dto.amount);
        if (a.lte(0)) throw new BadRequestException('amount must be > 0');
        const bal = new Prisma.Decimal(s.balance);
        if (a.gt(bal)) a = bal; // or throw
        amountDecimal = new Prisma.Decimal(a);
      }

      // If method is credit, squareId required
      if (dto.method === 'credit' && !dto.squareId?.trim()) {
        throw new BadRequestException(
          'squareId is required when method=credit',
        );
      }

      const updated = await tx.event_payments.update({
        where: { id: BigInt(paymentId) },
        data: {
          method: (dto.method as any) ?? undefined,
          amount: amountDecimal ?? undefined,
          currency: dto.currency ?? undefined,
          paid_at: dto.paidAt ? new Date(dto.paidAt) : undefined,
          square_id: dto.squareId ?? undefined,
          notes: dto.notes ?? undefined,
          status: (dto.status as any) ?? undefined,
        },
      });

      const after = await this.summaryInternal(tx, gcalId);
      await this.recomputeAndSetEventStatusInternal(tx, gcalId);

      return { payment: updated, summary: after };
    });
  }

  /** DELETE /events/by-gcal/:gcalId/payments/:paymentId */
  async remove(gcalId: string, paymentId: number) {
    await this.ensureEventByGcal(gcalId);

    const exists = await this.prisma.event_payments.findFirst({
      where: { id: BigInt(paymentId), event_gcal_id: gcalId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(
        `Payment ${paymentId} not found for event ${gcalId}`,
      );
    }

    await this.prisma.event_payments.delete({
      where: { id: BigInt(paymentId) },
    });

    const summary = await this.summary(gcalId);
    await this.recomputeAndSetEventStatus(gcalId);

    return { ok: true, summary };
  }

  /** GET /events/by-gcal/:gcalId/payments/summary */
  async summary(gcalId: string) {
    await this.ensureEventByGcal(gcalId);
    return this.summaryInternal(this.prisma, gcalId);
  }

  /* =========================
     Tx-bound variants
     ========================= */

  private async ensureEventByGcalTx(
    tx: Prisma.TransactionClient,
    gcalId: string,
  ) {
    if (!gcalId?.trim()) throw new BadRequestException('gcalId is required');
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
      throw new NotFoundException(`Event with gcalId "${gcalId}" not found`);
    }
    return ev;
  }

  private async recomputeAndSetEventStatus(gcalId: string) {
    await this.recomputeAndSetEventStatusInternal(this.prisma, gcalId);
  }
}