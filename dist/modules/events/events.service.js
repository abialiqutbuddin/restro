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
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../database/prisma.service");
const customers_service_1 = require("../customers/customers.service");
const gcal_service_1 = require("../gcal/gcal.service");
const asNum = (v) => {
    if (v == null)
        return null;
    if (typeof v === 'bigint')
        return Number(v);
    if (v?.constructor?.name === 'Decimal')
        return Number(v);
    if (typeof v === 'number')
        return v;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
};
let EventsService = class EventsService {
    constructor(prisma, customers, gcal) {
        this.prisma = prisma;
        this.customers = customers;
        this.gcal = gcal;
    }
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
    async create(dto) {
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
                ? patchFromInline
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
                delivery_charges: dto.deliveryFee != null ? new client_1.Prisma.Decimal(dto.deliveryFee) : null,
                service_charges: dto.serviceFee != null ? new client_1.Prisma.Decimal(dto.serviceFee) : null,
                headcount_est: dto.headcountEst ?? null,
                status: 'incomplete',
                ...(customerRel ? { customer: customerRel } : {}),
            },
            include: { customer: true },
        });
    }
    /** Check many Google event IDs against DB */
    /** Check many Google event IDs against DB */
    async checkByGcalIds(ids, googleEvents = {}) {
        if (!ids.length)
            return {};
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
        const latestPayByGcal = new Map();
        for (const p of payments) {
            if (p.event_gcal_id && !latestPayByGcal.has(p.event_gcal_id)) {
                latestPayByGcal.set(p.event_gcal_id, p.status ?? 'pending');
            }
        }
        // 3) Build result
        const result = {};
        const norm = (s) => (s ?? '').trim();
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
    async getByGcalId(id) {
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
    async importEventTree(dto) {
        let createdGcalId = null;
        let createdInGcal = false;
        //log('Importing event:', dto);
        // If newOrder is true, create in Google Calendar first
        if (dto.newOrder) {
            // Build basic details for Google
            const start = new Date(dto.eventDatetime);
            const end = new Date(start.getTime() + 1 * 60 * 60 * 1000); // +2h default
            const summary = (dto.calendarText?.split('\n')[0]?.trim())
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
                throw new common_1.BadRequestException('Google Calendar did not return an event id');
            }
            createdInGcal = true;
            // make it available to the DB upsert below
            dto.gcalEventId = createdGcalId;
        }
        return this.prisma.$transaction(async (tx) => {
            let finalCustomerRel = null;
            const trimmed = (s) => (s ?? '').trim();
            const nonEmpty = (s) => {
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
                    throw new common_1.NotFoundException(`Customer ${dto.customerId} not found`);
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
            }
            else if (dto.newCustomer) {
                // existing logic: resolve by email/phone/name; create if not found
                const nameRaw = trimmed(dto.newCustomer.name);
                const emailRaw = nonEmpty(dto.newCustomer.email);
                const phoneRaw = nonEmpty(dto.newCustomer.phone);
                const pickOneBy = async (where) => tx.customers.findFirst({
                    where,
                    orderBy: { created_at: 'desc' },
                    select: { id: true },
                });
                let found = null;
                if (emailRaw)
                    found = await pickOneBy({ email: emailRaw });
                if (!found && phoneRaw)
                    found = await pickOneBy({ phone: phoneRaw });
                if (!found && nameRaw)
                    found = await pickOneBy({ name: nameRaw });
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
            }
            else {
                finalCustomerRel = null; // allowed: event without a customer (will mark incomplete below)
            }
            // Consider "missing price" if unitPrice is null/undefined OR not a finite number OR <= 0 (adjust if you allow 0)
            const hasMissingPriceInDto = (dto) => {
                if (!dto.caterings?.length)
                    return true; // no caterings yet => treat as incomplete
                for (const cat of dto.caterings) {
                    for (const ord of cat.orders ?? []) {
                        const u = ord?.unitPrice;
                        const n = typeof u === 'number' ? u : (u != null ? Number(u) : NaN);
                        if (!Number.isFinite(n) || n <= 0)
                            return true;
                    }
                }
                return false;
            };
            const missingPriceFromDto = hasMissingPriceInDto(dto);
            const desiredStatusAtStart = (finalCustomerRel == null || missingPriceFromDto)
                ? 'incomplete'
                : (dto.status ?? 'incomplete');
            // ---------- B) Build base event payload (omit customer if none) ----------
            const baseEventData = {
                gcalEventId: dto.gcalEventId ?? null,
                event_datetime: new Date(dto.eventDatetime),
                venue: dto.venue ?? null,
                notes: dto.notes ?? null,
                calender_text: dto.calendarText ?? null,
                is_delivery: dto.isDelivery ?? false,
                delivery_charges: dto.deliveryCharges != null ? new client_1.Prisma.Decimal(dto.deliveryCharges) : null,
                service_charges: dto.serviceCharges != null ? new client_1.Prisma.Decimal(dto.serviceCharges) : null,
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
            let itemsSubtotal = new client_1.Prisma.Decimal(0);
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
                    const qtyDec = new client_1.Prisma.Decimal(ord.qty);
                    const unitPriceDec = new client_1.Prisma.Decimal(ord.unitPrice);
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
                            const qtyPerUnitDec = it.qtyPerUnit != null
                                ? new client_1.Prisma.Decimal(it.qtyPerUnit)
                                : new client_1.Prisma.Decimal(1);
                            const componentPriceDec = it.componentPrice != null ? new client_1.Prisma.Decimal(it.componentPrice) : null;
                            return {
                                event_catering_order_id: order.id,
                                position_number: i + 1,
                                item_id: BigInt(it.itemId),
                                size_id: it.sizeId !== undefined ? BigInt(it.sizeId) : null,
                                qty_per_unit: qtyPerUnitDec,
                                component_price: componentPriceDec,
                                component_subtotal_for_one_unit: componentPriceDec ? qtyPerUnitDec.mul(componentPriceDec) : null,
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
            const delivery = eventRow.delivery_charges ?? new client_1.Prisma.Decimal(0);
            const service = eventRow.service_charges ?? new client_1.Prisma.Decimal(0);
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
    async getById(id) {
        const row = await this.prisma.events.findUnique({
            where: { id: BigInt(id) },
            include: { customer: true },
        });
        if (!row)
            throw new common_1.NotFoundException(`Event ${id} not found`);
        return row;
    }
    /** Full nested tree */
    async getTreeById(id) {
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
        if (!row)
            throw new common_1.NotFoundException(`Event ${id} not found`);
        return row;
    }
    /** Summary view by gcal id */
    async getEventView(gcalId) {
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
        if (!ev)
            throw new common_1.NotFoundException(`Event ${gcalId} not found`);
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
                    const componentSubtotalForOne = componentPrice == null ? null : qtyPerUnit * componentPrice;
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
    async deleteByGcalId(gcalId) {
        const ev = await this.prisma.events.findUnique({
            where: { gcalEventId: gcalId },
            select: { id: true },
        });
        if (!ev)
            throw new common_1.NotFoundException(`Event with gcalEventId "${gcalId}" not found`);
        await this.prisma.events.delete({ where: { id: ev.id } });
        return { success: true, gcalEventId: gcalId, id: ev.id };
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        customers_service_1.CustomersService,
        gcal_service_1.GcalService])
], EventsService);
