import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ImportEventDto } from './import-events.dto';

type CreateEventInput = {
  customerName: string;
  eventDate: Date | string;
  customerPhone?: string;
  customerEmail?: string;
  venue?: string;
  notes?: string;
  deliveryFee?: number;
  serviceFee?: number;
  headcountEst?: number;
  isDelivery?: boolean;
  status?: string;         // e.g. 'new' | 'incomplete' | 'complete'
  gcalEventId?: string;    // 👈 new
};

const asNum = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === 'bigint') return Number(v);
  if (v instanceof Prisma.Decimal) return Number(v);
  if (typeof v === 'number') return v;
  return Number(v as any);
};

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) { }

  /** List events with full nested tree */
  list() {
    return this.prisma.events.findMany({
      orderBy: { event_datetime: 'desc' },
      include: {
        event_caterings: {
          include: {
            event_catering_orders: {
              include: {
                event_catering_menu_items: true,
              },
            },
          },
        },
      },
    });
  }

  /** Create event (camelCase -> snake_case) */
  async create(data: CreateEventInput) {
    return this.prisma.events.create({
      data: {
        customer_name: data.customerName,
        event_datetime:
          typeof data.eventDate === 'string'
            ? new Date(data.eventDate)
            : data.eventDate,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail,
        venue: data.venue,
        notes: data.notes,
        delivery_charges:
          data.deliveryFee !== undefined ? new Prisma.Decimal(data.deliveryFee) : undefined,
        service_charges:
          data.serviceFee !== undefined ? new Prisma.Decimal(data.serviceFee) : undefined,
        headcount_est: data.headcountEst,
        is_delivery: data.isDelivery ?? false,
        status: data.status ?? 'incomplete',     // default if you want
        gcalEventId: data.gcalEventId ?? null, // 👈 store GCal id
        // order_total: compute later
      },
    });
  }

  /** Check many Google event IDs against DB presence + status */
  async checkByGcalIds(ids: string[]) {
    if (!ids.length) return {};

    const rows = await this.prisma.events.findMany({
      where: { gcalEventId: { in: ids } },
      select: { gcalEventId: true, status: true },
    });

    const found = new Map(rows.map(r => [r.gcalEventId!, { exists: true, status: r.status || 'complete' }]));
    const result: Record<string, { exists: boolean; status?: string }> = {};

    for (const id of ids) {
      const hit = found.get(id);
      result[id] = hit ? hit : { exists: false };
    }
    return result;
  }

  /** Optional: single lookup */
  async getByGcalId(id: string) {
    return this.prisma.events.findFirst({
      where: { gcalEventId: id },
      include: {
        event_caterings: {
          include: {
            event_catering_orders: { include: { event_catering_menu_items: true } },
          },
        },
      },
    });
  }

  /**
   * Upsert event (by gcalEventId if provided) and create nested caterings->orders->items
   * Everything happens inside a single transaction.
   */
  async importEventTree(dto: ImportEventDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1) Upsert event by gcalEventId (if provided), else create
      const baseEventData: Prisma.eventsUncheckedCreateInput = {
        gcalEventId: dto.gcalEventId ?? null,
        customer_name: dto.customerName,
        customer_phone: dto.customerPhone ?? null,
        customer_email: dto.customerEmail ?? null,
        event_datetime: new Date(dto.eventDatetime),
        venue: dto.venue ?? null,

        // 👇 keep them separate
        notes: dto.notes ?? null,
        calender_text: dto.calendarText ?? null,  // (column name kept as-is)

        is_delivery: dto.isDelivery ?? false,
        delivery_charges: dto.deliveryCharges != null ? new Prisma.Decimal(dto.deliveryCharges) : null,
        service_charges: dto.serviceCharges != null ? new Prisma.Decimal(dto.serviceCharges) : null,
        headcount_est: dto.headcountEst ?? null,
        status: dto.status ?? 'incomplete',
      };

      let eventRow;
      if (dto.gcalEventId) {
        eventRow = await tx.events.upsert({
          where: { gcalEventId: dto.gcalEventId },
          create: baseEventData,
          update: {
            customer_name: dto.customerName,
            customer_phone: dto.customerPhone ?? null,
            customer_email: dto.customerEmail ?? null,
            event_datetime: new Date(dto.eventDatetime),
            venue: dto.venue ?? null,

            // 👇 keep them separate
            notes: dto.notes ?? null,
            calender_text: dto.calendarText ?? null,

            is_delivery: dto.isDelivery ?? false,
            delivery_charges: dto.deliveryCharges != null ? new Prisma.Decimal(dto.deliveryCharges) : null,
            service_charges: dto.serviceCharges != null ? new Prisma.Decimal(dto.serviceCharges) : null,
            headcount_est: dto.headcountEst ?? null,
            status: dto.status ?? undefined,
          },
        });
      } else {
        eventRow = await tx.events.create({ data: baseEventData });
      }

      // 2) Create nested caterings -> orders -> items
      let itemsSubtotal = new Prisma.Decimal(0);
      const toOptBigInt = (n?: number) => (typeof n === 'number' ? BigInt(n) : undefined);


      for (const cat of dto.caterings) {
        const catering = await tx.event_caterings.create({
          data: {
            event_id: eventRow.id,
            category_id: BigInt(cat.categoryId), // optional, but consistent with BigInt PKs
            title_override: cat.titleOverride ?? null,
            instructions: cat.instructions ?? null,
          },
        });

        for (const [orderIndex, ord] of cat.orders.entries()) {
          const lineSubtotal = new Prisma.Decimal(ord.qty).mul(new Prisma.Decimal(ord.unitPrice));
          itemsSubtotal = itemsSubtotal.add(lineSubtotal);

          const order = await tx.event_catering_orders.create({
            data: {
              event_catering_id: catering.id,
              unit_code: ord.unitCode,
              pricing_mode: ord.pricingMode,
              qty: new Prisma.Decimal(ord.qty),
              unit_price: new Prisma.Decimal(ord.unitPrice),
              currency: ord.currency,
              line_subtotal: lineSubtotal,
              calc_notes: ord.calcNotes ?? null,
            },
          });

          if (ord.items?.length) {
            for (const [i, it] of ord.items.entries()) {
              await tx.event_catering_menu_items.create({
                data: {
                  event_catering_order_id: order.id,
                  position_number: i + 1, // <- give each item a position
                  item_id: BigInt(it.itemId),          // <- cast to bigint
                  // size_id is optional; only include if provided
                  ...(it.sizeId !== undefined ? { size_id: BigInt(it.sizeId) } : {}),

                  qty_per_unit:
                    it.qtyPerUnit != null
                      ? new Prisma.Decimal(it.qtyPerUnit)
                      : new Prisma.Decimal(1),
                  component_price:
                    it.componentPrice != null
                      ? new Prisma.Decimal(it.componentPrice)
                      : null,
                  component_subtotal_for_one_unit:
                    it.qtyPerUnit != null && it.componentPrice != null
                      ? new Prisma.Decimal(it.qtyPerUnit).mul(
                        new Prisma.Decimal(it.componentPrice),
                      )
                      : null,
                  notes: it.notes ?? null,
                },
              });
            }
          }
        }
      }

      // 3) Update event.order_total = itemsSubtotal + delivery + service
      const delivery = eventRow.delivery_charges ?? new Prisma.Decimal(0);
      const service = eventRow.service_charges ?? new Prisma.Decimal(0);
      const orderTotal = itemsSubtotal.add(delivery).add(service);

      const updated = await tx.events.update({
        where: { id: eventRow.id },
        data: { order_total: orderTotal },
        include: {
          event_caterings: {
            include: {
              event_catering_orders: { include: { event_catering_menu_items: true } },
            },
          },
        },
      });

      return updated;
    });
  }

  /** Flat fetch (no deep relations) */
  async getById(id: number) {
    const row = await this.prisma.events.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException(`Event ${id} not found`);
    return row;
  }

  /** Full nested tree: event → caterings → orders → items */
  async getTreeById(id: number) {
    const row = await this.prisma.events.findUnique({
      where: { id },
      include: {
        event_caterings: {
          orderBy: { id: 'asc' },
          include: {
            event_catering_orders: {
              orderBy: { id: 'asc' },
              include: {
                event_catering_menu_items: {
                  orderBy: { position_number: 'asc' },
                },
              },
            },
          },
        },
      },
    });
    if (!row) throw new NotFoundException(`Event ${id} not found`);
    return row;
  }

  /** Get a view of event with summary data */
  async getEventView(gcalId: string) {
    const ev = await this.prisma.events.findUnique({
      where: { gcalEventId: gcalId }, // id is BigInt in schema
      include: {
        event_caterings: {
          include: {
            category: true, // id, name, slug
            event_catering_orders: {
              include: {
                unit: true, // pricing_unit { code, label, qty_label }
                event_catering_menu_items: {
                  include: {
                    item: true, // menu_items { id, name }
                    size: true, // sizes { id, name } (nullable)
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ev) throw new NotFoundException(`Event ${gcalId} not found`);

    // Totals
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
          unit: {
            code: o.unit.code,
            label: o.unit.label,
            qtyLabel: o.unit.qty_label,
          },
          pricingMode: o.pricing_mode, // per_unit_manual | per_unit_from_items
          qty,
          unitPrice,
          currency: o.currency,
          lineSubtotal,
          calcNotes: o.calc_notes,
          items,
        };
      });

      const cateringSubtotal = orders.reduce((s, x) => s + x.lineSubtotal, 0);

      return {
        id: Number(c.id),
        category: c.category && {
          id: Number(c.category.id),
          name: c.category.name,
          slug: c.category.slug,
        },
        titleOverride: c.title_override,
        instructions: c.instructions,
        subtotal: cateringSubtotal,
        orders,
      };
    });

    const delivery = asNum(ev.delivery_charges) ?? 0;
    const service = asNum(ev.service_charges) ?? 0;
    const grandTotal = itemsSubtotal + delivery + service;

    return {
      id: Number(ev.id),
      gcalEventId: ev.gcalEventId,
      customerName: ev.customer_name,
      customerPhone: ev.customer_phone,
      customerEmail: ev.customer_email,
      eventDate: ev.event_datetime,
      venue: ev.venue,
      notes: ev.notes,
      calendarText: ev.calender_text,
      isDelivery: !!ev.is_delivery,
      status: ev.status,
      totals: {
        itemsSubtotal,
        delivery,
        service,
        grandTotal,
      },
      caterings,
    };
  }


}