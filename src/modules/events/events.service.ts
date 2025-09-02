import { Injectable } from '@nestjs/common';
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
        notes: dto.notes ?? null,
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
            // you may want to update customer/venue on re-import
            customer_name: dto.customerName,
            customer_phone: dto.customerPhone ?? null,
            customer_email: dto.customerEmail ?? null,
            event_datetime: new Date(dto.eventDatetime),
            venue: dto.venue ?? null,
            notes: dto.notes ?? null,
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

}