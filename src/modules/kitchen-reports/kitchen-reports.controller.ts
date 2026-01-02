import { Controller, Get, Query, Patch, Body } from '@nestjs/common';
import { KitchenReportsService } from './kitchen-reports.service';
import { KitchenConsolidationQueryDto } from './dto/kitchen-consolidation.dto';
import { UpdatePrepStatusDto } from './dto/update-prep-status.dto';

@Controller('kitchen-reports')
export class KitchenReportsController {
  constructor(private readonly kitchenReportsService: KitchenReportsService) {}

  /**
   * GET /kitchen-reports/consolidation
   *
   * Returns consolidated menu items across events with total quantities.
   * Supports various filters for date range, event type, time windows, etc.
   *
   * Query Parameters:
   * - date: Single date (YYYY-MM-DD) - gets all events for that day
   * - startDate: Start of date range (YYYY-MM-DD)
   * - endDate: End of date range (YYYY-MM-DD)
   * - eventType: Filter by event type (e.g., "wedding", "corporate")
   * - timeWindow: Filter by time of day ("morning", "afternoon", "evening")
   * - includeClientName: Include client names in output (default: false)
   * - showEventBreakdown: Show which events each item came from (default: false)
   * - eventIds: Comma-separated list of specific event IDs to include
   *
   * Example:
   * GET /kitchen-reports/consolidation?date=2025-12-31&includeClientName=true
   * GET /kitchen-reports/consolidation?startDate=2025-12-25&endDate=2025-12-31&eventType=wedding
   */
  @Get('consolidation')
  async getConsolidationReport(@Query() query: KitchenConsolidationQueryDto) {
    return this.kitchenReportsService.getKitchenConsolidationReport(query);
  }

  /**
   * GET /kitchen-reports/prep-list
   *
   * Returns a simplified prep list with just item names and quantities.
   * This is a kitchen-friendly format without pricing or event details.
   *
   * Same query parameters as consolidation endpoint.
   *
   * Example:
   * GET /kitchen-reports/prep-list?date=2025-12-31
   */
  @Get('prep-list')
  async getPrepList(@Query() query: KitchenConsolidationQueryDto) {
    return this.kitchenReportsService.getPrepList(query);
  }

  /**
   * GET /kitchen-reports/daily-prep-list
   *
   * Returns a formatted daily prep list for the UI with event breakdown and prep status.
   * Groups items together with size variations and shows which events need each item.
   * Includes chef preparation status (not_started, in_progress, completed) for each item.
   *
   * Query Parameters (all optional):
   * - date: Single date (YYYY-MM-DD) - gets all events for that specific day
   * - startDate: Start of date range (YYYY-MM-DD)
   * - endDate: End of date range (YYYY-MM-DD)
   * - eventType: Filter by event type (e.g., "wedding", "corporate", "birthday")
   * - timeWindow: Filter by time of day ("morning", "afternoon", "evening")
   * - eventIds: Comma-separated list of specific event IDs
   *
   * If NO filters are provided, returns ALL events
   *
   * Examples:
   * GET /kitchen-reports/daily-prep-list
   * GET /kitchen-reports/daily-prep-list?date=2026-01-05
   * GET /kitchen-reports/daily-prep-list?startDate=2025-12-31&endDate=2026-01-06
   * GET /kitchen-reports/daily-prep-list?eventType=wedding&timeWindow=evening
   */
  @Get('daily-prep-list')
  async getDailyPrepList(@Query() query: KitchenConsolidationQueryDto) {
    return this.kitchenReportsService.getDailyPrepList(query);
  }

  /**
   * PATCH /kitchen-reports/prep-status
   *
   * Updates the preparation status for a specific menu item in an event.
   * Creates a new status record if one doesn't exist, or updates the existing one.
   *
   * Body Parameters:
   * - eventId: Event ID (number)
   * - menuItemId: Menu item ID (number)
   * - sizeId: Size ID (optional, number)
   * - status: Status value (not_started, in_progress, completed)
   * - notes: Optional notes (string)
   *
   * Example:
   * PATCH /kitchen-reports/prep-status
   * Body: { "eventId": 123, "menuItemId": 456, "sizeId": 789, "status": "in_progress", "notes": "Started prep" }
   */
  @Patch('prep-status')
  async updatePrepStatus(@Body() dto: UpdatePrepStatusDto) {
    return this.kitchenReportsService.updatePrepStatus(dto);
  }
}
