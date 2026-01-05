import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) { }

  @Get()
  async getDashboard(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
    @Query('top') topStr?: string,
  ) {
    const now = new Date();
    const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = toStr ? new Date(toStr) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const top = topStr ? Math.max(1, Number(topStr)) : 5;

    const todayDate = new Date();
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    // Calculate "Tomorrow" range relative to the user's "Today" (to)
    const tomorrowStart = new Date(to);
    const tomorrowEnd = new Date(to);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const [kpis, catRevenue, topItems, today, tomorrow, chaos] = await Promise.all([
      this.svc.kpis(from, to),
      this.svc.categoryRevenue(from, to),
      this.svc.topItemsPerCategory(from, to, top),
      // Use the explicit user range for "Today"
      this.svc.todayList(from, to),
      // Use the calculated next day for "Tomorrow"
      this.svc.tomorrowList(tomorrowStart, tomorrowEnd),
      this.svc.getChaosReport(todayDate, tomorrowDate),
    ]);

    return { range: { from, to }, kpis, catRevenue, topItems, today, tomorrow, chaos };
  }

  @Get('range-list')
  async rangeList(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const now = new Date();
    const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
    // make `to` exclusive (next day midnight) if only a date was passed
    const toRaw = toStr ? new Date(toStr) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const to = new Date(toRaw); // clone

    return {
      range: { from, to },
      days: await this.svc.listByDateRange(from, to),
    };
  }

}