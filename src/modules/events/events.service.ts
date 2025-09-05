import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ImportEventDto } from './import-events.dto';

const asNum = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === 'bigint') return Number(v);
  if ((v as any)?.constructor?.name === 'Decimal') return Number(v as any);
  if (typeof v === 'number') return v;
  const n = Number(v as any);
  return Number.isNaN(n) ? null : n;
};

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private customers: CustomersService,
  ) { }

  /** List events including customer + nested items */
  list() {
    return this.prisma.events.findMany({
      orderBy: { event_datetime: 'desc' },
      include: {
        customer: true,
        event_caterings: {
          include: {
            event_catering_orders: {
              include: { event_catering_menu_items: true },
            },
          },
        },
      },
    });
  }

  /** Create event: connect by id (with optional patch) OR create new customer */
  async create(dto: CreateEventDto) {
    // Inline patch if an existing customer id was provided
    const patchFromInline = dto.customerId
      ? {
        name: dto.customerName,
        email: dto.customerEmail ?? undefined,
        phone: dto.customerPhone ?? undefined,
      }
      : undefined;

    const customerRel = await this.customers.resolveForEvent({
      customerId: dto.customerId ?? null,
      newCustomer: dto.customerId
        ? (patchFromInline as any)
        : dto.newCustomer
          ? {
            name: dto.newCustomer.name,
            email: dto.newCustomer.email ?? null,
            phone: dto.newCustomer.phone ?? null,
          }
          : dto.customerName
            ? {
              name: dto.customerName,
              email: dto.customerEmail ?? null,
              phone: dto.customerPhone ?? null,
            }
            : null,
    });

    const noCustomerProvided = !customerRel;

    return this.prisma.events.create({
      data: {
        gcalEventId: dto.gcalEventId ?? null,
        event_datetime: new Date(dto.eventDate),
        venue: dto.venue ?? null,
        notes: dto.notes ?? null,
        calender_text: dto.calendarText ?? null,
        is_delivery: dto.isDelivery ?? false,
        delivery_charges:
          dto.deliveryFee != null ? new Prisma.Decimal(dto.deliveryFee) : null,
        service_charges:
          dto.serviceFee != null ? new Prisma.Decimal(dto.serviceFee) : null,
        headcount_est: dto.headcountEst ?? null,

        // ✅ Force incomplete if no customer
        status: noCustomerProvided ? 'incomplete' : dto.status ?? 'incomplete',

        // 👇 Only include relation if we actually have one
        ...(customerRel ? { customer: customerRel } : {}),
      },
      include: { customer: true },
    });
  }

  /** Check many Google event IDs against DB */
  async checkByGcalIds(ids: string[]) {
    if (!ids.length) return {};

    // 1) Pull events
    const events = await this.prisma.events.findMany({
      where: { gcalEventId: { in: ids } },
      select: {
        gcalEventId: true,
        status: true,
        event_datetime: true,
      },
    });

    // 2) Pull all payments (newest first, so first row per id is latest)
    const payments = await this.prisma.event_payments.findMany({
      where: { event_gcal_id: { in: ids } },
      select: {
        event_gcal_id: true,
        status: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // 3) Collapse to latest status per gcal id
    const latestPayByGcal = new Map<string, string>();
    for (const p of payments) {
      if (!p.event_gcal_id) continue;
      if (!latestPayByGcal.has(p.event_gcal_id)) {
        latestPayByGcal.set(p.event_gcal_id, p.status ?? 'pending');
      }
    }

    // 4) Build result
    const result: Record<string, {
      exists: boolean;
      status?: string;        // event status
      paymentStatus: string;  // latest payment status or 'pending'
      orderDate?: string;     // event datetime ISO
    }> = {};

    for (const id of ids) {
      const ev = events.find(e => e.gcalEventId === id);

      result[id] = {
        exists: !!ev,
        status: ev?.status ?? undefined,
        paymentStatus: latestPayByGcal.get(id) ?? 'pending',
        orderDate: ev?.event_datetime ? ev.event_datetime.toISOString() : undefined,
      };
    }

    return result;
  }

  /** Single lookup by gcal */
  async getByGcalId(id: string) {
    return this.prisma.events.findFirst({
      where: { gcalEventId: id },
      include: {
        customer: true,
        event_caterings: {
          include: {
            event_catering_orders: { include: { event_catering_menu_items: true } },
          },
        },
      },
    });
  }

  /** Import nested event tree (short tx; no connectOrCreate on email/phone) */
  // src/modules/events/events.service.ts (inside EventsService)

  async importEventTree(dto: ImportEventDto) {
    type CustomerRel =
      | { connect: { id: bigint } }
      | { connectOrCreate: { where: any; create: any } }
      | { __needsCreateByName: { name: string } }
      | null;

    return this.prisma.$transaction(async (tx) => {
      // ---------- A) Resolve customer relation on the SAME tx client ----------
      let customerRel: CustomerRel = null;

      if (dto.customerId != null) {
        // connect to existing
        customerRel = { connect: { id: BigInt(dto.customerId) } };
      } else if (dto.newCustomer) {
        const name = (dto.newCustomer.name ?? '').trim();
        const email = (dto.newCustomer.email ?? undefined) || undefined;
        const phone = (dto.newCustomer.phone ?? undefined) || undefined;

        if (email) {
          customerRel = {
            connectOrCreate: {
              where: { email },
              create: { name: name || email, email, phone: phone ?? null },
            },
          };
        } else if (phone) {
          customerRel = {
            connectOrCreate: {
              where: { phone },
              create: { name: name || phone, phone, email: email ?? null },
            },
          };
        } else if (name) {
          // name only -> we’ll create inside the tx and then connect
          customerRel = { __needsCreateByName: { name } };
        } else {
          // newCustomer provided but empty -> treat as no customer
          customerRel = null;
        }
      }
      // else: no customer info at all -> leave as null

      // If we need a name-only customer, create it now (inside the same tx)
      let finalCustomerRel:
        | { connect: { id: bigint } }
        | { connectOrCreate: { where: any; create: any } }
        | null = null;

      if (customerRel && '__needsCreateByName' in customerRel) {
        const created = await tx.customers.create({
          data: { name: customerRel.__needsCreateByName.name, email: null, phone: null },
          select: { id: true },
        });
        finalCustomerRel = { connect: { id: created.id } };
      } else {
        finalCustomerRel = customerRel;
      }

      // ---------- B) Build base event payload (omit customer if none) ----------
      const baseEventData: Prisma.eventsCreateInput = {
        gcalEventId: dto.gcalEventId ?? null,
        event_datetime: new Date(dto.eventDatetime),
        venue: dto.venue ?? null,
        notes: dto.notes ?? null,
        calender_text: dto.calendarText ?? null,
        is_delivery: dto.isDelivery ?? false,
        delivery_charges:
          dto.deliveryCharges != null ? new Prisma.Decimal(dto.deliveryCharges) : null,
        service_charges:
          dto.serviceCharges != null ? new Prisma.Decimal(dto.serviceCharges) : null,
        headcount_est: dto.headcountEst ?? null,
        status: finalCustomerRel == null ? 'incomplete' :dto.status ?? 'incomplete',
        ...(finalCustomerRel ? { customer: finalCustomerRel } : {}), // <-- key bit
      };

      // ---------- C) Create / Upsert event ----------
      const eventRow = dto.gcalEventId
        ? await tx.events.upsert({
          where: { gcalEventId: dto.gcalEventId },
          create: baseEventData,
          update: { ...baseEventData, status: dto.status ?? undefined },
        })
        : await tx.events.create({ data: baseEventData });

      // ---------- D) Create caterings, orders, and items (batch) ----------
      let itemsSubtotal = new Prisma.Decimal(0);

      for (const cat of dto.caterings) {
        const catering = await tx.event_caterings.create({
          data: {
            event_id: eventRow.id,
            category_id: BigInt(cat.categoryId),
            title_override: cat.titleOverride ?? null,
            instructions: cat.instructions ?? null,
          },
          select: { id: true },
        });

        for (const ord of cat.orders) {
          const qtyDec = new Prisma.Decimal(ord.qty);
          const unitPriceDec = new Prisma.Decimal(ord.unitPrice);
          const lineSubtotal = qtyDec.mul(unitPriceDec);
          itemsSubtotal = itemsSubtotal.add(lineSubtotal);

          const order = await tx.event_catering_orders.create({
            data: {
              event_catering_id: catering.id,
              unit_code: ord.unitCode,
              pricing_mode: ord.pricingMode,
              qty: qtyDec,
              unit_price: unitPriceDec,
              currency: ord.currency,
              line_subtotal: lineSubtotal,
              calc_notes: ord.calcNotes ?? null,
            },
            select: { id: true },
          });

          if (ord.items?.length) {
            const rows = ord.items.map((it, i) => {
              const qtyPerUnitDec =
                it.qtyPerUnit != null
                  ? new Prisma.Decimal(it.qtyPerUnit)
                  : new Prisma.Decimal(1);
              const componentPriceDec =
                it.componentPrice != null ? new Prisma.Decimal(it.componentPrice) : null;

              return {
                event_catering_order_id: order.id,
                position_number: i + 1,
                item_id: BigInt(it.itemId),
                size_id: it.sizeId !== undefined ? BigInt(it.sizeId) : null,
                qty_per_unit: qtyPerUnitDec,
                component_price: componentPriceDec,
                component_subtotal_for_one_unit:
                  componentPriceDec ? qtyPerUnitDec.mul(componentPriceDec) : null,
                notes: it.notes ?? null,
              };
            });

            const CHUNK = 500;
            for (let i = 0; i < rows.length; i += CHUNK) {
              await tx.event_catering_menu_items.createMany({
                data: rows.slice(i, i + CHUNK),
              });
            }
          }
        }
      }

      // ---------- E) Compute totals & return with includes ----------
      const delivery = eventRow.delivery_charges ?? new Prisma.Decimal(0);
      const service = eventRow.service_charges ?? new Prisma.Decimal(0);
      const orderTotal = itemsSubtotal.add(delivery).add(service);

      return tx.events.update({
        where: { id: eventRow.id },
        data: { order_total: orderTotal },
        include: {
          customer: true,
          event_caterings: {
            include: {
              event_catering_orders: { include: { event_catering_menu_items: true } },
            },
          },
        },
      });
    }, {
      timeout: 20_000,
      maxWait: 5_000,
    });
  }

  /** Flat fetch (with customer) */
  async getById(id: number) {
    const row = await this.prisma.events.findUnique({
      where: { id: BigInt(id) },
      include: { customer: true },
    });
    if (!row) throw new NotFoundException(`Event ${id} not found`);
    return row;
  }

  /** Full nested tree */
  async getTreeById(id: number) {
    const row = await this.prisma.events.findUnique({
      where: { id: BigInt(id) },
      include: {
        customer: true,
        event_caterings: {
          orderBy: { id: 'asc' },
          include: {
            event_catering_orders: {
              orderBy: { id: 'asc' },
              include: {
                unit: true,
                event_catering_menu_items: {
                  orderBy: { position_number: 'asc' },
                  include: { item: true, size: true },
                },
              },
            },
            category: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException(`Event ${id} not found`);
    return row;
  }

  /** Summary view by gcal id */
  async getEventView(gcalId: string) {
    const ev = await this.prisma.events.findUnique({
      where: { gcalEventId: gcalId },
      include: {
        customer: true,
        event_caterings: {
          include: {
            category: true,
            event_catering_orders: {
              include: {
                unit: true,
                event_catering_menu_items: { include: { item: true, size: true } },
              },
            },
          },
        },
      },
    });
    if (!ev) throw new NotFoundException(`Event ${gcalId} not found`);

    let itemsSubtotal = 0;

    const caterings = ev.event_caterings.map((c) => {
      const orders = c.event_catering_orders.map((o) => {
        const qty = asNum(o.qty) ?? 0;
        const unitPrice = asNum(o.unit_price) ?? 0;
        const lineSubtotal = qty * unitPrice;
        itemsSubtotal += lineSubtotal;

        const items = o.event_catering_menu_items.map((mi) => {
          const qtyPerUnit = asNum(mi.qty_per_unit) ?? 1;
          const componentPrice = asNum(mi.component_price);
          const componentSubtotalForOne =
            componentPrice == null ? null : qtyPerUnit * componentPrice;

          return {
            id: Number(mi.id),
            position: mi.position_number,
            item: mi.item && { id: Number(mi.item.id), name: mi.item.name },
            size: mi.size ? { id: Number(mi.size.id), name: mi.size.name } : null,
            qtyPerUnit,
            componentPrice,
            componentSubtotalForOne,
            notes: mi.notes,
          };
        });

        return {
          id: Number(o.id),
          unit: { code: o.unit.code, label: o.unit.label, qtyLabel: o.unit.qty_label },
          pricingMode: o.pricing_mode,
          qty,
          unitPrice,
          currency: o.currency,
          lineSubtotal,
          calcNotes: o.calc_notes,
          items,
        };
      });

      const subtotal = orders.reduce((s, x) => s + x.lineSubtotal, 0);

      return {
        id: Number(c.id),
        category: c.category && { id: Number(c.category.id), name: c.category.name, slug: c.category.slug },
        titleOverride: c.title_override,
        instructions: c.instructions,
        subtotal,
        orders,
      };
    });

    const delivery = asNum(ev.delivery_charges) ?? 0;
    const service = asNum(ev.service_charges) ?? 0;
    const grandTotal = itemsSubtotal + delivery + service;

    return {
      id: Number(ev.id),
      gcalEventId: ev.gcalEventId,
      customer: ev.customer
        ? { id: Number(ev.customer.id), name: ev.customer.name, email: ev.customer.email, phone: ev.customer.phone }
        : null,
      eventDate: ev.event_datetime,
      venue: ev.venue,
      notes: ev.notes,
      calendarText: ev.calender_text,
      isDelivery: !!ev.is_delivery,
      status: ev.status,
      totals: { itemsSubtotal, delivery, service, grandTotal },
      caterings,
    };
  }

  async deleteByGcalId(gcalId: string) {
    const ev = await this.prisma.events.findUnique({
      where: { gcalEventId: gcalId },
      select: { id: true },
    });
    if (!ev) throw new NotFoundException(`Event with gcalEventId "${gcalId}" not found`);
    await this.prisma.events.delete({ where: { id: ev.id } });
    return { success: true, gcalEventId: gcalId, id: ev.id };
  }
}