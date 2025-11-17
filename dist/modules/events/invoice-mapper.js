"use strict";
// src/modules/events/invoice-mapper.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapRowsToInvoiceEnvelope = mapRowsToInvoiceEnvelope;
// ---------- internal helpers ----------
function normSlug(s) {
    return (s ?? '').trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
}
function asNumSafe(v) {
    const n = v == null
        ? 0
        : typeof v === 'bigint'
            ? Number(v)
            : v?.constructor?.name === 'Decimal'
                ? Number(v)
                : typeof v === 'number'
                    ? v
                    : Number(v);
    return Number.isFinite(n) ? n : 0;
}
function ymd(date) {
    return date.toISOString().slice(0, 10);
}
function uniq(arr, key) {
    const seen = new Set();
    const out = [];
    for (const v of arr) {
        const k = key(v);
        if (!seen.has(k)) {
            seen.add(k);
            out.push(v);
        }
    }
    return out;
}
function detectCateringType(cat) {
    const s = normSlug(cat.slug || cat.name || cat.title_override);
    if (['thaal', 'thaal-menu', 'thaal-catering'].includes(s))
        return 'thaal';
    if (['thaali', 'thaali-menu', 'thaali-catering'].includes(s))
        return 'thaali';
    if (['party-tray', 'party_tray', 'tray', 'trays'].includes(s))
        return 'party_tray';
    if (['party-box', 'party_box', 'box', 'boxes'].includes(s))
        return 'party_box';
    if (['live-bbq', 'bbq', 'live-bbq-station', 'live-grill'].includes(s))
        return 'live_bbq';
    if (['buffet'].includes(s))
        return 'buffet';
    if (['per-item', 'a-la-carte', 'itemwise', 'peritem'].includes(s))
        return 'per_item';
    return 'per_item';
}
// ---------- mappers ----------
function mapThaal(c) {
    const allItems = (c.event_catering_orders ?? []).flatMap((o) => (o.event_catering_menu_items ?? []).map((mi) => ({
        item: mi.item?.name ?? `#${Number(mi.item_id)}`,
        qtyPerThaal: asNumSafe(mi.qty_per_unit) || null,
    })));
    const sharedMenu = uniq(allItems, (x) => x.item);
    let totalQty = 0;
    let pricePerThaal = 0;
    let subtotal = 0;
    for (const o of c.event_catering_orders ?? []) {
        const qty = asNumSafe(o.qty);
        const price = asNumSafe(o.unit_price);
        totalQty += qty;
        if (pricePerThaal === 0)
            pricePerThaal = price;
        subtotal += qty * price;
    }
    return {
        type: 'thaal',
        title: 'Thaal',
        description: 'Thaal (shared menu, qty × price/Thaal)',
        menuItems: sharedMenu,
        qtyThaal: totalQty,
        pricePerThaal,
        total: subtotal,
        subtotal,
    };
}
function mapThaali(c) {
    const allItems = (c.event_catering_orders ?? []).flatMap((o) => (o.event_catering_menu_items ?? []).map((mi) => ({
        item: mi.item?.name ?? `#${Number(mi.item_id)}`,
        qtyPerThaali: asNumSafe(mi.qty_per_unit) || null,
    })));
    const sharedMenu = uniq(allItems, (x) => x.item);
    const sizeMap = new Map();
    for (const o of c.event_catering_orders ?? []) {
        const firstWithSize = (o.event_catering_menu_items ?? []).find((mi) => mi.size?.name);
        const sizeName = firstWithSize?.size?.name ?? 'Regular';
        const qty = asNumSafe(o.qty);
        const price = asNumSafe(o.unit_price);
        const total = qty * price;
        const prev = sizeMap.get(sizeName);
        if (prev) {
            prev.qty += qty;
            prev.pricePerSize = price;
            prev.total += total;
        }
        else {
            sizeMap.set(sizeName, { size: sizeName, qty, pricePerSize: price, total });
        }
    }
    const sizes = [...sizeMap.values()];
    const subtotal = sizes.reduce((s, x) => s + x.total, 0);
    return {
        type: 'thaali',
        title: 'Thaali',
        description: 'Thaali (shared menu; per-size qty × price/size)',
        sharedMenuItems: sharedMenu,
        sizes,
        subtotal,
    };
}
function mapPartyTray(c) {
    const trays = (c.event_catering_orders ?? []).map((o) => {
        const firstWithSize = (o.event_catering_menu_items ?? []).find((mi) => mi.size?.name);
        const sizeName = firstWithSize?.size?.name ?? 'Tray';
        const menuItems = (o.event_catering_menu_items ?? []).map((mi) => ({
            item: mi.item?.name ?? `#${Number(mi.item_id)}`,
            qtyInTray: mi.qty_per_unit != null ? asNumSafe(mi.qty_per_unit) : null,
        }));
        const qty = asNumSafe(o.qty);
        const price = asNumSafe(o.unit_price);
        const total = qty * price;
        return { size: sizeName, menuItems, qty, pricePerTray: price, total };
    });
    const subtotal = trays.reduce((s, x) => s + x.total, 0);
    return {
        type: 'party_tray',
        title: 'Party Tray',
        description: 'Party Tray (with size; each size has its own menu)',
        trays,
        subtotal,
    };
}
function mapPartyBox(c) {
    const allMenu = (c.event_catering_orders ?? []).flatMap((o) => (o.event_catering_menu_items ?? []).map((mi) => ({
        item: mi.item?.name ?? `#${Number(mi.item_id)}`,
        qtyPerBox: mi.qty_per_unit != null ? asNumSafe(mi.qty_per_unit) : null,
    })));
    const menuItems = uniq(allMenu, (x) => x.item);
    let totalQty = 0;
    let pricePerBox = 0;
    let subtotal = 0;
    for (const o of c.event_catering_orders ?? []) {
        const qty = asNumSafe(o.qty);
        const price = asNumSafe(o.unit_price);
        totalQty += qty;
        if (pricePerBox === 0)
            pricePerBox = price;
        subtotal += qty * price;
    }
    return {
        type: 'party_box',
        title: 'Party Box',
        description: 'One fixed menu per box; boxes × price/box',
        menuItems,
        boxes: { qty: totalQty, pricePerBox, total: subtotal },
        subtotal,
    };
}
function mapLiveBbq(c) {
    const menu = uniq((c.event_catering_orders ?? []).flatMap((o) => (o.event_catering_menu_items ?? []).map((mi) => ({
        item: mi.item?.name ?? `#${Number(mi.item_id)}`,
    }))), (x) => x.item);
    let headcount = 0;
    let pricePerHead = 0;
    let subtotal = 0;
    for (const o of c.event_catering_orders ?? []) {
        const qty = asNumSafe(o.qty);
        const price = asNumSafe(o.unit_price);
        headcount += qty;
        if (pricePerHead === 0)
            pricePerHead = price;
        subtotal += qty * price;
    }
    return {
        type: 'live_bbq',
        title: 'Live BBQ',
        description: 'Menu + headcount × price/head',
        menuItems: menu,
        headcount,
        pricePerHead,
        total: subtotal,
        subtotal,
    };
}
function mapBuffet(c) {
    const menu = uniq((c.event_catering_orders ?? []).flatMap((o) => (o.event_catering_menu_items ?? []).map((mi) => ({
        item: mi.item?.name ?? `#${Number(mi.item_id)}`,
    }))), (x) => x.item);
    let headcount = 0;
    let pricePerHead = 0;
    let subtotal = 0;
    for (const o of c.event_catering_orders ?? []) {
        const qty = asNumSafe(o.qty);
        const price = asNumSafe(o.unit_price);
        headcount += qty;
        if (pricePerHead === 0)
            pricePerHead = price;
        subtotal += qty * price;
    }
    return {
        type: 'buffet',
        title: 'Buffet',
        description: 'Menu + headcount × price/head',
        menuItems: menu,
        headcount,
        pricePerHead,
        total: subtotal,
        subtotal,
    };
}
function mapPerItem(c) {
    // Toggle this to true if you want same (item,size,price) lines combined by summing qty
    const COLLAPSE_DUPLICATES = true;
    const rawLines = [];
    for (const o of c.event_catering_orders ?? []) {
        const orderQty = asNumSafe(o.qty);
        const orderUnitPrice = asNumSafe(o.unit_price);
        const mis = o.event_catering_menu_items ?? [];
        // No menu items attached → fallback to a generic line
        if (!mis.length) {
            const itemName = 'Item';
            const sizeName = null;
            const price = orderUnitPrice;
            rawLines.push({
                item: itemName,
                size: sizeName,
                qty: orderQty,
                pricePerQty: price / orderQty,
                total: orderQty * (price / orderQty),
            });
            continue;
        }
        // Exactly one menu item → keep the old behavior but prefer component_price when present
        if (mis.length === 1) {
            const mi = mis[0];
            const itemName = mi.item?.name ?? `#${Number(mi.item_id)}`;
            const sizeName = mi.size?.name ?? null;
            const price = mi.component_price != null ? asNumSafe(mi.component_price) : orderUnitPrice;
            const perUnitFactor = mi.qty_per_unit != null ? asNumSafe(mi.qty_per_unit) : 1;
            const qty = orderQty * perUnitFactor;
            rawLines.push({
                item: itemName,
                size: sizeName,
                qty,
                pricePerQty: price / qty,
                total: qty * (price / qty),
            });
            continue;
        }
        // Multiple menu items → explode into separate lines (no "Mixed Items")
        for (const mi of mis) {
            const itemName = mi.item?.name ?? `#${Number(mi.item_id)}`;
            const sizeName = mi.size?.name ?? null;
            const perUnitFactor = mi.qty_per_unit != null ? asNumSafe(mi.qty_per_unit) : 1;
            const qty = orderQty * perUnitFactor;
            // Prefer component price if present, else fall back to order price
            const price = mi.component_price != null ? asNumSafe(mi.component_price) : orderUnitPrice;
            rawLines.push({
                item: itemName,
                size: sizeName,
                qty,
                pricePerQty: price / qty,
                total: qty * (price / qty),
            });
        }
    }
    // Optionally collapse duplicate lines: same item + size + pricePerQty => sum qty/total
    let items;
    if (COLLAPSE_DUPLICATES) {
        const map = new Map();
        for (const ln of rawLines) {
            const key = `${ln.item}||${ln.size ?? ''}||${ln.pricePerQty}`;
            const prev = map.get(key);
            if (prev) {
                const qty = prev.qty + ln.qty;
                map.set(key, {
                    ...prev,
                    qty,
                    total: qty * prev.pricePerQty,
                });
            }
            else {
                map.set(key, { ...ln });
            }
        }
        items = [...map.values()];
    }
    else {
        items = rawLines;
    }
    const subtotal = items.reduce((s, x) => s + x.total, 0);
    return {
        type: 'per_item',
        title: 'Per Item',
        description: 'Each line: qty × price',
        items,
        subtotal,
    };
}
function mapCateringBlock(c) {
    const t = detectCateringType({
        slug: c.category?.slug,
        name: c.category?.name,
        title_override: c.title_override ?? undefined,
    });
    switch (t) {
        case 'thaal':
            return mapThaal(c);
        case 'thaali':
            return mapThaali(c);
        case 'party_tray':
            return mapPartyTray(c);
        case 'party_box':
            return mapPartyBox(c);
        case 'live_bbq':
            return mapLiveBbq(c);
        case 'buffet':
            return mapBuffet(c);
        case 'per_item':
        default:
            return mapPerItem(c);
    }
}
// ---------- main exported function ----------
// rows = result of your prisma query with nested includes
function mapRowsToInvoiceEnvelope(rows, start, end) {
    const first = rows[0];
    const clientName = first.customer?.name ?? 'Customer';
    const currency = 'USD';
    const byDate = new Map();
    for (const r of rows) {
        const key = ymd(r.event_datetime);
        const prev = byDate.get(key);
        if (prev)
            prev.push(r);
        else
            byDate.set(key, [r]);
    }
    const dateGroups = [];
    let grandItemsSubtotal = 0;
    let grandDelivery = 0;
    let grandService = 0;
    let grandDiscount = 0;
    for (const [date, events] of byDate.entries()) {
        const eventBlocks = [];
        for (const ev of events) {
            const cateringBlocks = (ev.event_caterings ?? []).map((c) => mapCateringBlock(c));
            const itemsSubtotal = cateringBlocks.reduce((s, x) => s + (x.subtotal || 0), 0);
            const delivery = asNumSafe(ev.delivery_charges);
            const service = asNumSafe(ev.service_charges);
            //const eventTotal = itemsSubtotal + delivery + service;
            const discount = asNumSafe(ev.discount); // ✅ from event row
            const eventTotal = itemsSubtotal + delivery + service - discount; // ✅ only here
            eventBlocks.push({
                eventId: Number(ev.id),
                gcalEventId: ev.gcalEventId ?? null,
                eventDate: ev.event_datetime.toISOString(),
                venue: ev.venue ?? null,
                notes: ev.notes ?? null,
                caterings: cateringBlocks,
                extras: { delivery, service, discount }, // ✅ surface at event-level
                totals: { itemsSubtotal, delivery, service, discount, eventTotal },
            });
            grandItemsSubtotal += itemsSubtotal;
            grandDelivery += delivery;
            grandService += service;
            grandDiscount += discount; // ✅ sum event discounts only
        }
        const dateTotal = eventBlocks.reduce((s, e) => s + e.totals.eventTotal, 0);
        dateGroups.push({ date, events: eventBlocks, dateTotal });
    }
    // Asc sort
    dateGroups.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return {
        invoice: {
            invoiceNumber: '',
            date: new Date().toISOString(),
            clientName,
            currencyCode: currency,
            notes: '',
            range: { start: start.toISOString(), end: end.toISOString() },
        },
        dateGroups,
        totals: {
            itemsSubtotal: grandItemsSubtotal,
            delivery: grandDelivery,
            service: grandService,
            discount: grandDiscount, // ✅
            grandTotal: grandItemsSubtotal + grandDelivery + grandService - grandDiscount,
        },
    };
}
