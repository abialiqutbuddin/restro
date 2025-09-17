import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get()
  async getDashboard(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
    @Query('top') topStr?: string,
  ) {
    const now = new Date();
    const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to   = toStr   ? new Date(toStr)   : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const top  = topStr ? Math.max(1, Number(topStr)) : 5;

    const [kpis, catRevenue, topItems, today, tomorrow] = await Promise.all([
      this.svc.kpis(from, to),
      this.svc.categoryRevenue(from, to),
      this.svc.topItemsPerCategory(from, to, top),
      this.svc.todayList(),
      this.svc.tomorrowList(),
    ]);

    return { range: { from, to }, kpis, catRevenue, topItems, today, tomorrow };
  }
}