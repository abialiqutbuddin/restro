import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) { }

  async kpis(from: Date, to: Date) {
    const [row] = await this.prisma.$queryRawUnsafe<any>(`
      SELECT
        COUNT(*)                                            AS total_events,
        COALESCE(SUM(vt.items_total), 0)                   AS items_total,
        COALESCE(SUM(vt.grand_total - COALESCE(e.discount, 0)), 0)  AS grand_total,
        COALESCE(SUM(vp.amount_paid), 0)                   AS amount_paid,
        COALESCE(SUM((vt.grand_total - COALESCE(e.discount, 0)) - vp.amount_paid), 0)  AS outstanding,
        ROUND(
          CASE WHEN COUNT(*) = 0 THEN 0
               ELSE COALESCE(SUM(vt.grand_total - COALESCE(e.discount, 0)), 0) / COUNT(*)
          END, 2)                                          AS avg_order_value,
        COALESCE(SUM(e.headcount_est), 0)                  AS total_headcount
      FROM v_event_totals vt
      LEFT JOIN v_event_payments vp ON vp.event_id = vt.event_id
      LEFT JOIN events e             ON e.id = vt.event_id
      WHERE vt.event_datetime >= ? AND vt.event_datetime < ?
        AND e.status <> 'archived';
    `, from, to);
    return row ?? {
      total_events: 0, items_total: 0, grand_total: 0, amount_paid: 0,
      outstanding: 0, avg_order_value: 0, total_headcount: 0
    };
  }

  async categoryRevenue(from: Date, to: Date) {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id AS category_id, c.name,
             COALESCE(SUM(eco.line_subtotal), 0) AS revenue
      FROM events e
      JOIN event_caterings ec        ON ec.event_id = e.id
      JOIN category c                ON c.id = ec.category_id
      JOIN event_catering_orders eco ON eco.event_catering_id = ec.id
      WHERE e.event_datetime >= ? AND e.event_datetime < ?
        AND e.status <> 'archived'
      GROUP BY c.id, c.name
      ORDER BY revenue DESC;
    `, from, to);
  }

  async topItemsPerCategory(from: Date, to: Date, topN = 5) {
    return this.prisma.$queryRawUnsafe<any[]>(`
      WITH item_counts AS (
        SELECT c.id AS category_id, c.name AS category_name,
               mi.id AS item_id, mi.name AS item_name,
               SUM(eco.qty * ecmi.qty_per_unit) AS total_item_units
        FROM events e
        JOIN event_caterings ec             ON ec.event_id = e.id
        JOIN category c                     ON c.id = ec.category_id
        JOIN event_catering_orders eco      ON eco.event_catering_id = ec.id
        JOIN event_catering_menu_items ecmi ON ecmi.event_catering_order_id = eco.id
        JOIN menu_items mi                  ON mi.id = ecmi.item_id
        WHERE e.event_datetime >= ? AND e.event_datetime < ?
          AND e.status <> 'archived'
        GROUP BY c.id, c.name, mi.id, mi.name
      ),
      ranked AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY total_item_units DESC) AS rn
        FROM item_counts
      )
      SELECT category_id, category_name, item_id, item_name, total_item_units
      FROM ranked
      WHERE rn <= ?
      ORDER BY category_name, total_item_units DESC;
    `, from, to, topN);
  }

  async todayList() {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT e.id, e.event_datetime, e.venue, e.status,
             cust.name AS customer_name,
             (vt.grand_total - COALESCE(e.discount, 0)) AS grand_total,
             vp.amount_paid,
             ((vt.grand_total - COALESCE(e.discount, 0)) - vp.amount_paid) AS outstanding
      FROM events e
      LEFT JOIN customers cust ON cust.id = e.customer_id
      LEFT JOIN v_event_totals vt ON vt.event_id = e.id
      LEFT JOIN v_event_payments vp ON vp.event_id = e.id
      WHERE DATE(e.event_datetime) = CURDATE()
        AND e.status <> 'archived'
      ORDER BY e.event_datetime ASC;
    `);
  }

  async tomorrowList() {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT e.id, e.event_datetime, e.venue, e.status,
             cust.name AS customer_name,
             (vt.grand_total - COALESCE(e.discount, 0)) AS grand_total,
             vp.amount_paid,
             ((vt.grand_total - COALESCE(e.discount, 0)) - vp.amount_paid) AS outstanding
      FROM events e
      LEFT JOIN customers cust ON cust.id = e.customer_id
      LEFT JOIN v_event_totals vt ON vt.event_id = e.id
      LEFT JOIN v_event_payments vp ON vp.event_id = e.id
      WHERE DATE(e.event_datetime) = CURDATE() + INTERVAL 1 DAY
        AND e.status <> 'archived'
      ORDER BY e.event_datetime ASC;
    `);
  }

  async listByDateRange(from: Date, to: Date) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        DATE(e.event_datetime)               AS event_date,
        e.id,
        e.event_datetime,
        e.venue,
        e.status,
        cust.name                            AS customer_name,
        (vt.grand_total - COALESCE(e.discount, 0)) AS grand_total,
        vp.amount_paid,
        ((vt.grand_total - COALESCE(e.discount, 0)) - vp.amount_paid)    AS outstanding
      FROM events e
      LEFT JOIN customers       cust ON cust.id = e.customer_id
      LEFT JOIN v_event_totals  vt   ON vt.event_id = e.id
      LEFT JOIN v_event_payments vp  ON vp.event_id = e.id
      WHERE e.event_datetime >= ? AND e.event_datetime < ?
        AND e.status <> 'archived'
      ORDER BY event_date ASC, e.event_datetime ASC;
    `, from, to);

    // Group into { date: 'YYYY-MM-DD', items: [...] }
    const byDate = new Map<string, any[]>();

    for (const r of rows) {
      // event_date may come as Date or string depending on MySQL driver config
      const d: string = r.event_date instanceof Date
        ? r.event_date.toISOString().slice(0, 10)
        : String(r.event_date); // already 'YYYY-MM-DD'

      const item = {
        id: r.id,
        event_datetime: r.event_datetime,
        venue: r.venue ?? null,
        status: r.status ?? null,
        customer_name: r.customer_name ?? null,
        grand_total: Number(r.grand_total ?? 0),
        amount_paid: Number(r.amount_paid ?? 0),
        outstanding: Number(r.outstanding ?? 0),
      };

      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(item);
    }

    return Array.from(byDate.entries()).map(([date, items]) => ({ date, items }));
  }

  async getChaosMetrics(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // 1. Total Events
    const eventsCount = await this.prisma.events.count({
      where: {
        event_datetime: { gte: startOfDay, lt: endOfDay },
        status: { not: 'archived' },
      },
    });

    // 2. Menu Breakdown (Categories)
    const menuBreakdown = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.name, COUNT(DISTINCT ec.id) as count
      FROM events e
      JOIN event_caterings ec ON ec.event_id = e.id
      JOIN category c ON c.id = ec.category_id
      WHERE e.event_datetime >= ? AND e.event_datetime < ?
        AND e.status <> 'archived'
      GROUP BY c.name
      ORDER BY count DESC
    `, startOfDay, endOfDay);

    // 3. Item Aggregates
    const itemBreakdown = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT mi.name, SUM(eco.qty * ecmi.qty_per_unit) as total_qty
      FROM events e
      JOIN event_caterings ec ON ec.event_id = e.id
      JOIN event_catering_orders eco ON eco.event_catering_id = ec.id
      JOIN event_catering_menu_items ecmi ON ecmi.event_catering_order_id = eco.id
      JOIN menu_items mi ON mi.id = ecmi.item_id
      WHERE e.event_datetime >= ? AND e.event_datetime < ?
        AND e.status <> 'archived'
      GROUP BY mi.name
      ORDER BY total_qty DESC
      LIMIT 15
    `, startOfDay, endOfDay);

    // Safe Number parsing for BigInt counts from raw query
    const safeMenus = menuBreakdown.map((r) => ({
      name: r.name,
      count: Number(r.count || 0),
    }));
    const safeItems = itemBreakdown.map((r) => ({
      name: r.name,
      quantity: Number(r.total_qty || 0),
    }));

    return {
      totalEvents: eventsCount,
      menuBreakdown: safeMenus,
      itemBreakdown: safeItems,
    };
  }

  async getChaosReport(today: Date, tomorrow: Date) {
    const [todayMetrics, tomorrowMetrics, thresholds] = await Promise.all([
      this.getChaosMetrics(today),
      this.getChaosMetrics(tomorrow),
      this.settings.getChaosSettings(),
    ]);

    return {
      metrics: {
        today: todayMetrics,
        tomorrow: tomorrowMetrics,
      },
      thresholds,
    };
  }
}
