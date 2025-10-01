import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ImportEventDto } from './dto/import-events.dto';
import { GcalService } from '../gcal/gcal.service';
import { mapRowsToInvoiceEnvelope } from './invoice-mapper'; // <— add this import

const asNum = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === 'bigint') return Number(v);
  if ((v as any)?.constructor?.name === 'Decimal') return Number(v as any);
  if (typeof v === 'number') return v;
  const n = Number(v as any);
  return Number.isNaN(n) ? null : n;
};

type BuildInvoiceArgs = {
  customerId: number;
  start: Date; // inclusive
  end: Date;   // exclusive
  includeEvents: boolean;
};

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private customers: CustomersService,
    private readonly gcal: GcalService,   // <-- inject here
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
        status: 'incomplete',
        ...(customerRel ? { customer: customerRel } : {}),
      },
      include: { customer: true },
    });
  }

  /** Check many Google event IDs against DB */
  /** Check many Google event IDs against DB */
  async checkByGcalIds(
    ids: string[],
    googleEvents: Record<string, { description?: string }> = {}
  ) {
    if (!ids.length) return {};

    // 1) Pull events from DB
    const events = await this.prisma.events.findMany({
      where: { gcalEventId: { in: ids } },
      select: {
        gcalEventId: true,
        status: true,
        event_datetime: true,
        calender_text: true,
      },
    });

    // 2) Pull payments (latest per gcal id)
    const payments = await this.prisma.event_payments.findMany({
      where: { event_gcal_id: { in: ids } },
      select: { event_gcal_id: true, status: true },
      orderBy: { created_at: 'desc' },
    });

    const latestPayByGcal = new Map<string, string>();
    for (const p of payments) {
      if (p.event_gcal_id && !latestPayByGcal.has(p.event_gcal_id)) {
        latestPayByGcal.set(p.event_gcal_id, p.status ?? 'pending');
      }
    }

    // 3) Build result
    const result: Record<string, {
      exists: boolean;
      status?: string;
      paymentStatus: string;
      orderDate?: string;
      /** true if DB calender_text === Google description; null if we didn't get Google data */
      isDescriptionSame: boolean | null;
      /** conventional: true if different, false if same, null if unknown */
      isModified: boolean | null;
    }> = {};

    const norm = (s?: string | null) => (s ?? '').trim();

    for (const id of ids) {
      const ev = events.find(e => e.gcalEventId === id);
      const localDesc = ev?.calender_text ?? null;

      const haveG = Object.prototype.hasOwnProperty.call(googleEvents, id);
      const gcalDesc = haveG ? (googleEvents[id]?.description ?? null) : null;

      const same = (ev && haveG) ? norm(localDesc) === norm(gcalDesc) : null;

      result[id] = {
        exists: !!ev,
        status: ev?.status ?? undefined,
        paymentStatus: latestPayByGcal.get(id) ?? 'pending',
        orderDate: ev?.event_datetime ? ev.event_datetime.toISOString() : undefined,
        isDescriptionSame: same,
        isModified: same === null ? null : !same,
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

    let createdGcalId: string | null = null;
    let createdInGcal = false;

    //log('Importing event:', dto);
    // If newOrder is true, create in Google Calendar first

    if (dto.newOrder) {
      // Build basic details for Google
      const start = new Date(dto.eventDatetime);
      const end = new Date(start.getTime() + 1 * 60 * 60 * 1000); // +2h default

      const summary =
        (dto.calendarText?.split('\n')[0]?.trim())
        || 'Catering Order';

      const description = dto.calendarText ?? dto.notes ?? '';

      const ev = await this.gcal.createEvent({
        summary,
        description,
        location: dto.venue ?? undefined,
        start: start.toISOString(),
        end: end.toISOString(),
        timeZone: 'America/Chicago', // if you have one in dto
      });

      createdGcalId = ev.id ?? null;
      if (!createdGcalId) {
        throw new BadRequestException('Google Calendar did not return an event id');
      }
      createdInGcal = true;

      // make it available to the DB upsert below
      dto.gcalEventId = createdGcalId;
    }

    return this.prisma.$transaction(async (tx) => {

      
      // ---------- A) Resolve customer relation on the SAME tx client ----------
      type CustomerRelConnect = { connect: { id: bigint } } | null;

      let finalCustomerRel: CustomerRelConnect = null;

      const trimmed = (s?: string | null) => (s ?? '').trim();
      const nonEmpty = (s?: string | null) => {
        const t = trimmed(s);
        return t.length ? t : undefined;
      };

      if (dto.customerId != null) {
        const id = BigInt(dto.customerId);

        // Ensure the customer exists (throws if not)
        const existing = await tx.customers.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!existing) {
          throw new NotFoundException(`Customer ${dto.customerId} not found`);
        }

        // If caller sent newCustomer along with customerId, treat as a PATCH
        const patch = dto.newCustomer
          ? {
            name: nonEmpty(dto.newCustomer.name),
            email: nonEmpty(dto.newCustomer.email) ?? null, // allow explicit null
            phone: nonEmpty(dto.newCustomer.phone) ?? null,
          }
          : null;

        if (patch && (patch.name || patch.email !== undefined || patch.phone !== undefined)) {
          await tx.customers.update({
            where: { id },
            data: {
              ...(patch.name ? { name: patch.name } : {}),
              ...(patch.email !== undefined ? { email: patch.email } : {}),
              ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
            },
            select: { id: true },
          });
        }

        finalCustomerRel = { connect: { id } };

      } else if (dto.newCustomer) {
        // existing logic: resolve by email/phone/name; create if not found
        const nameRaw = trimmed(dto.newCustomer.name);
        const emailRaw = nonEmpty(dto.newCustomer.email);
        const phoneRaw = nonEmpty(dto.newCustomer.phone);

        const pickOneBy = async (where: Prisma.customersWhereInput) =>
          tx.customers.findFirst({
            where,
            orderBy: { created_at: 'desc' },
            select: { id: true },
          });

        let found = null as { id: bigint } | null;

        if (emailRaw) found = await pickOneBy({ email: emailRaw });
        if (!found && phoneRaw) found = await pickOneBy({ phone: phoneRaw });
        if (!found && nameRaw) found = await pickOneBy({ name: nameRaw });

        if (!found) {
          const created = await tx.customers.create({
            data: {
              name: nameRaw || emailRaw || phoneRaw || 'New Customer',
              email: emailRaw ?? null,
              phone: phoneRaw ?? null,
            },
            select: { id: true },
          });
          found = created;
        }

        finalCustomerRel = { connect: { id: found.id } };

      } else {
        finalCustomerRel = null; // allowed: event without a customer (will mark incomplete below)
      }

      // Consider "missing price" if unitPrice is null/undefined OR not a finite number OR <= 0 (adjust if you allow 0)
      const hasMissingPriceInDto = (dto: ImportEventDto) => {
        if (!dto.caterings?.length) return true; // no caterings yet => treat as incomplete
        for (const cat of dto.caterings) {
          for (const ord of cat.orders ?? []) {
            const u = (ord as any)?.unitPrice;
            const n = typeof u === 'number' ? u : (u != null ? Number(u) : NaN);
            if (!Number.isFinite(n) || n <= 0) return true;
          }
        }
        return false;
      };

      const missingPriceFromDto = hasMissingPriceInDto(dto);

      const desiredStatusAtStart =
        (finalCustomerRel == null || missingPriceFromDto)
          ? 'incomplete'
          : (dto.status ?? 'incomplete');

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
        status: desiredStatusAtStart,
        ...(finalCustomerRel ? { customer: finalCustomerRel } : {}), // <-- key bit
      };

      // ---------- C) Create / Upsert event ----------
      const eventRow = dto.gcalEventId
        ? await tx.events.upsert({
          where: { gcalEventId: dto.gcalEventId },
          create: baseEventData,
          update: {
            ...baseEventData,
            status: desiredStatusAtStart, // <= force our computed status on edit
          },
        })
        : await tx.events.create({ data: baseEventData });

      await tx.event_caterings.deleteMany({ where: { event_id: eventRow.id } });

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
      timeout: 200_000,
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

  private asNum(v: unknown): number {
    const n = (v == null) ? 0 : (typeof v === 'bigint') ? Number(v) :
      (v as any)?.constructor?.name === 'Decimal' ? Number(v as any) :
        typeof v === 'number' ? v : Number(v as any);
    return Number.isFinite(n) ? n : 0;
  }

  private mapDbEventToEventView(ev: any) {
    let itemsSubtotal = 0;

    const caterings = ev.event_caterings.map((c: any) => {
      const orders = c.event_catering_orders.map((o: any) => {
        const qty = this.asNum(o.qty);
        const unitPrice = this.asNum(o.unit_price);
        const lineSubtotal = qty * unitPrice;
        itemsSubtotal += lineSubtotal;

        const items = o.event_catering_menu_items.map((mi: any) => {
          const qtyPerUnit = this.asNum(mi.qty_per_unit) || 1;
          const componentPrice = mi.component_price != null ? this.asNum(mi.component_price) : null;
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
          currency: o.currency ?? 'USD',
          lineSubtotal,
          calcNotes: o.calc_notes,
          items,
        };
      });

      const subtotal = orders.reduce((s: number, x: any) => s + x.lineSubtotal, 0);

      return {
        id: Number(c.id),
        category: c.category && {
          id: Number(c.category.id),
          name: c.category.name,
          slug: c.category.slug,
        },
        titleOverride: c.title_override,
        instructions: c.instructions,
        subtotal,
        orders,
      };
    });

    const delivery = this.asNum(ev.delivery_charges);
    const service = this.asNum(ev.service_charges);
    const grandTotal = itemsSubtotal + delivery + service;

    return {
      id: Number(ev.id),
      gcalEventId: ev.gcalEventId,
      customer: ev.customer
        ? {
          id: Number(ev.customer.id),
          name: ev.customer.name,
          email: ev.customer.email,
          phone: ev.customer.phone,
        }
        : null,
      customerName: ev.customer?.name ?? '', // optional if you want flat
      customerPhone: ev.customer?.phone ?? null,
      customerEmail: ev.customer?.email ?? null,
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

  async buildInvoiceForCustomerRange(args: BuildInvoiceArgs) {
    const { customerId, start, end, includeEvents } = args;

    const rows = await this.prisma.events.findMany({
      where: {
        customer_id: BigInt(customerId),
        event_datetime: { gte: start, lt: end },
      },
      orderBy: { event_datetime: 'asc' },
      include: {
        customer: true,
        event_caterings: {
          include: {
            category: true,
            event_catering_orders: {
              include: {
                unit: true,
                event_catering_menu_items: {
                  include: { item: true, size: true },
                },
              },
            },
          },
        },
      },
    });

    if (!rows.length) {
      // Keep your existing empty skeleton for backward compatibility
      return {
        invoice: {
          invoiceNumber: '',
          date: new Date().toISOString(),
          clientName: '',
          company: null,
          items: [],
          paymentInstructions: '',
          discount: 0,
          shipping: 0,
          isTaxExempt: false,
          taxRate: 0.0,
          currencyCode: 'USD',
          notes: '',
          range: { start: start.toISOString(), end: end.toISOString() },
          customerId,
        },
        ...(includeEvents ? { events: [] } : {}),
      };
    }

    // ✅ Use the external mapper for the new structure
    return mapRowsToInvoiceEnvelope(rows, start, end);
  }

  // (Optional) If you want same JSON for explicit eventIds:
  async buildInvoiceForEvents(eventIds: string[], includeEvents: boolean) {
    if (!eventIds.length) {
      return {
        invoice: {
          invoiceNumber: '',
          date: new Date().toISOString(),
          clientName: '',
          company: null,
          items: [],
          paymentInstructions: '',
          discount: 0,
          shipping: 0,
          isTaxExempt: false,
          taxRate: 0.0,
          currencyCode: 'USD',
          notes: '',
          range: null,
          eventIds,
        },
        ...(includeEvents ? { events: [] } : {}),
      };
    }

    const rows = await this.prisma.events.findMany({
      where: { gcalEventId: { in: eventIds } },
      orderBy: { event_datetime: 'asc' },
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

    if (!rows.length) {
      return {
        invoice: {
          invoiceNumber: '',
          date: new Date().toISOString(),
          clientName: '',
          company: null,
          items: [],
          paymentInstructions: '',
          discount: 0,
          shipping: 0,
          isTaxExempt: false,
          taxRate: 0.0,
          currencyCode: 'USD',
          notes: '',
          range: null,
          eventIds,
        },
        ...(includeEvents ? { events: [] } : {}),
      };
    }

    // ✅ Reuse the same mapper (range is null here; pass a minimal range if needed)
    const start = rows[0].event_datetime;
    const end = rows[rows.length - 1].event_datetime;
    return mapRowsToInvoiceEnvelope(rows, start, end);
  }

  // async buildInvoiceForEvents(eventIds: string[], includeEvents: boolean) {
  //   if (!eventIds.length) {
  //     return { invoice: { items: [], discount: 0, shipping: 0, isTaxExempt: false, taxRate: 0, currencyCode: 'USD', notes: '' }, ...(includeEvents ? { events: [] } : {}) };
  //   }

  //   // Fetch those events (preserve order by date)
  //   const rows = await this.prisma.events.findMany({
  //     where: { gcalEventId: { in: eventIds } },
  //     orderBy: { event_datetime: 'asc' },
  //     include: {
  //       customer: true,
  //       event_caterings: {
  //         include: {
  //           category: true,
  //           event_catering_orders: {
  //             include: {
  //               unit: true,
  //               event_catering_menu_items: { include: { item: true, size: true } },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });

  //   if (!rows.length) {
  //     return {
  //       invoice: {
  //         invoiceNumber: '',
  //         date: new Date().toISOString(),
  //         clientName: '',
  //         company: null,
  //         items: [],
  //         paymentInstructions: '',
  //         discount: 0,
  //         shipping: 0,
  //         isTaxExempt: false,
  //         taxRate: 0.0,
  //         currencyCode: 'USD',
  //         notes: '',
  //         range: null,          // no range for explicit ids
  //         eventIds,             // echo back what was requested
  //       },
  //       ...(includeEvents ? { events: [] } : {}),
  //     };
  //   }

  //   // Build EventView[] (same mapping you already have)
  //   const eventViews = rows.map((r) => this.mapDbEventToEventView(r));

  //   // Flatten into invoice items (same pattern as customer-range)
  //   const items: Array<{ description: string; qty: number; unitPrice: number }> = [];
  //   for (const ev of rows) {
  //     const dateStr = ev.event_datetime.toISOString().slice(0, 10); // YYYY-MM-DD

  //     for (const cat of ev.event_caterings) {
  //       for (const ord of cat.event_catering_orders) {
  //         const qty = this.asNum(ord.qty);
  //         const unitPrice = this.asNum(ord.unit_price);
  //         const unit = ord.unit?.qty_label ?? ord.unit?.label ?? 'units';
  //         const catName = cat.title_override || cat.category?.name || 'Catering';
  //         const venuePart = ev.venue ? ` @ ${ev.venue}` : '';
  //         const desc = `${catName}${venuePart} — ${qty} ${unit}`;
  //         items.push({ description: desc, qty, unitPrice });
  //       }
  //     }

  //     // const delivery = this.asNum(ev.delivery_charges);
  //     // if (delivery > 0) items.push({ description: `[${dateStr}] Delivery`, qty: 1, unitPrice: delivery });

  //     // const service = this.asNum(ev.service_charges);
  //     // if (service > 0) items.push({ description: `[${dateStr}] Service`, qty: 1, unitPrice: service });
  //   }

  //   const first = rows[0];
  //   const clientName = first.customer?.name ?? 'Customer';

  //   const invoice = {
  //     invoiceNumber: '',
  //     date: new Date().toISOString(),
  //     clientName,
  //     company: null as any,
  //     items: items.map((x) => ({ description: x.description, qty: x.qty, unitPrice: x.unitPrice })),
  //     paymentInstructions: '',
  //     discount: 0,
  //     shipping: 0,
  //     isTaxExempt: false,
  //     taxRate: 0.0,
  //     currencyCode: 'USD',
  //     notes: '',
  //     range: null,
  //     eventIds,
  //   };

  //   return includeEvents ? { invoice, events: eventViews } : { invoice };
  // }

}