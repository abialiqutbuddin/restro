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
exports.KitchenReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let KitchenReportsService = class KitchenReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Normalize menu item names to handle variations and typos
     * This helps group similar items together
     */
    normalizeItemName(name) {
        if (!name)
            return '';
        // Convert to lowercase and trim
        let normalized = name.toLowerCase().trim();
        // Remove common punctuation and extra spaces
        normalized = normalized.replace(/[,.\-_]/g, ' ');
        normalized = normalized.replace(/\s+/g, ' ');
        // Common substitutions for variations
        const substitutions = {
            'w/': 'with',
            'wo/': 'without',
            '&': 'and',
            '+': 'and',
        };
        Object.entries(substitutions).forEach(([key, value]) => {
            // Escape special regex characters
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            normalized = normalized.replace(new RegExp(escapedKey, 'g'), value);
        });
        return normalized.trim();
    }
    /**
     * Get time window filter based on time of day
     */
    getTimeWindowFilter(timeWindow) {
        const windows = {
            morning: { gte: 0, lt: 12 },
            afternoon: { gte: 12, lt: 17 },
            evening: { gte: 17, lt: 24 },
        };
        return windows[timeWindow.toLowerCase()] || null;
    }
    /**
     * Generate kitchen consolidation report
     * Groups menu items across events and sums quantities
     */
    async getKitchenConsolidationReport(query) {
        const { startDate, endDate, date, eventType, timeWindow, includeClientName = false, showEventBreakdown = false, eventIds, } = query;
        // Build date range filter
        const dateFilter = {};
        if (date) {
            // Single date - get events for that entire day
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            dateFilter.event_datetime = { gte: dayStart, lte: dayEnd };
        }
        else if (startDate || endDate) {
            // Date range
            if (startDate && endDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.event_datetime = { gte: start, lte: end };
            }
            else if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                dateFilter.event_datetime = { gte: start };
            }
            else if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.event_datetime = { lte: end };
            }
        }
        // Build where clause
        const whereClause = {
            ...dateFilter,
            ...(eventType && { event_type: eventType }),
            ...(eventIds && eventIds.length > 0 && { gcalEventId: { in: eventIds } }),
            // Exclude archived events
            status: { not: 'archived' },
        };
        // Apply time window filter if specified
        if (timeWindow) {
            const timeRange = this.getTimeWindowFilter(timeWindow);
            if (timeRange) {
                // We need to filter by hour of the event_datetime
                // This is a bit tricky with Prisma, so we'll filter in memory after fetching
            }
        }
        // Fetch events with all related data
        // Using optimized query to reduce data transfer
        const events = await this.prisma.events.findMany({
            where: whereClause,
            include: {
                customer: includeClientName || showEventBreakdown ? true : false,
                event_caterings: {
                    include: {
                        category: true,
                        event_catering_orders: {
                            include: {
                                unit: true,
                                event_catering_menu_items: {
                                    include: {
                                        item: true,
                                        size: true,
                                    },
                                    orderBy: {
                                        position_number: 'asc',
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                event_datetime: 'asc',
            },
        });
        // Apply time window filter in memory if needed
        let filteredEvents = events;
        if (timeWindow) {
            const timeRange = this.getTimeWindowFilter(timeWindow);
            if (timeRange) {
                filteredEvents = events.filter((event) => {
                    const hour = event.event_datetime.getHours();
                    return hour >= timeRange.gte && hour < timeRange.lt;
                });
            }
        }
        // Consolidation logic
        const itemMap = new Map();
        for (const event of filteredEvents) {
            for (const catering of event.event_caterings) {
                for (const order of catering.event_catering_orders) {
                    for (const menuItem of order.event_catering_menu_items) {
                        const itemId = Number(menuItem.item_id);
                        const itemName = menuItem.item?.name || 'Unknown Item';
                        const sizeId = menuItem.size_id ? Number(menuItem.size_id) : null;
                        const sizeName = menuItem.size?.name || null;
                        // Create a unique key for grouping
                        // Group by: normalized item name + size
                        const normalizedName = this.normalizeItemName(itemName);
                        const key = `${normalizedName}::${sizeId || 'no-size'}`;
                        // Calculate quantity for this menu item
                        // qty_per_unit * order.qty gives total quantity for this item
                        const qtyPerUnit = Number(menuItem.qty_per_unit) || 1;
                        const orderQty = Number(order.qty) || 0;
                        const itemQty = qtyPerUnit * orderQty;
                        if (!itemMap.has(key)) {
                            itemMap.set(key, {
                                menuItemId: itemId,
                                menuItemName: itemName, // Use original name for display
                                sizeId,
                                sizeName,
                                totalQuantity: 0,
                                unit: order.unit?.label || 'unit',
                                ...(showEventBreakdown && { events: [] }),
                            });
                        }
                        const consolidated = itemMap.get(key);
                        consolidated.totalQuantity += itemQty;
                        // Add event breakdown if requested
                        if (showEventBreakdown && consolidated.events) {
                            consolidated.events.push({
                                eventId: Number(event.id),
                                eventDate: event.event_datetime,
                                ...(includeClientName && event.customer && { clientName: event.customer.name }),
                                venue: event.venue || undefined,
                                quantity: itemQty,
                            });
                        }
                    }
                }
            }
        }
        // Convert map to array and sort by item name
        const consolidatedItems = Array.from(itemMap.values()).sort((a, b) => {
            const nameCompare = a.menuItemName.localeCompare(b.menuItemName);
            if (nameCompare !== 0)
                return nameCompare;
            // If names are same, sort by size
            if (!a.sizeName && b.sizeName)
                return -1;
            if (a.sizeName && !b.sizeName)
                return 1;
            if (a.sizeName && b.sizeName)
                return a.sizeName.localeCompare(b.sizeName);
            return 0;
        });
        return {
            filters: {
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
                ...(date && { date }),
                ...(eventType && { eventType }),
                ...(timeWindow && { timeWindow }),
            },
            consolidatedItems,
            totalEvents: filteredEvents.length,
            reportGeneratedAt: new Date(),
        };
    }
    /**
     * Get a simple prep list - just item names and quantities
     * This is a simplified version without event breakdown
     */
    async getPrepList(query) {
        const report = await this.getKitchenConsolidationReport({
            ...query,
            showEventBreakdown: false,
            includeClientName: false,
        });
        return {
            date: query.date || `${query.startDate} to ${query.endDate}`,
            totalEvents: report.totalEvents,
            items: report.consolidatedItems.map((item) => ({
                name: item.menuItemName,
                size: item.sizeName,
                quantity: item.totalQuantity,
                unit: item.unit,
            })),
            generatedAt: report.reportGeneratedAt,
        };
    }
    /**
     * Get daily consolidated prep list formatted for UI
     * Returns items grouped with event breakdown
     */
    async getDailyPrepList(query) {
        // If no date filters provided, default to showing events from today onwards
        if (!query.date && !query.startDate && !query.endDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            query.startDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
        const report = await this.getKitchenConsolidationReport({
            ...query,
            showEventBreakdown: true,
            includeClientName: true,
        });
        // Collect all event IDs and menu item IDs to fetch statuses
        const eventIds = new Set();
        const menuItemIds = new Set();
        for (const item of report.consolidatedItems) {
            menuItemIds.add(item.menuItemId);
            if (item.events && item.events.length > 0) {
                for (const event of item.events) {
                    eventIds.add(event.eventId);
                }
            }
        }
        // Fetch all prep statuses for these events and menu items in one query
        const prepStatuses = await this.prisma.kitchen_prep_status.findMany({
            where: {
                event_id: { in: Array.from(eventIds).map(id => BigInt(id)) },
                menu_item_id: { in: Array.from(menuItemIds).map(id => BigInt(id)) },
            },
        });
        // Create a lookup map for quick status access
        // Key format: "eventId_menuItemId_sizeId"
        const statusMap = new Map();
        for (const status of prepStatuses) {
            const key = `${status.event_id}_${status.menu_item_id}_${status.size_id || 'null'}`;
            statusMap.set(key, status.status);
        }
        // Group items by menu item name (consolidate same items with different sizes)
        const itemsMap = new Map();
        for (const item of report.consolidatedItems) {
            const key = item.menuItemName;
            if (!itemsMap.has(key)) {
                itemsMap.set(key, {
                    itemName: item.menuItemName,
                    totalQuantity: 0,
                    unit: item.unit,
                    events: []
                });
            }
            const groupedItem = itemsMap.get(key);
            groupedItem.totalQuantity += item.totalQuantity;
            // Add event breakdown
            if (item.events && item.events.length > 0) {
                for (const event of item.events) {
                    const existingEvent = groupedItem.events.find((e) => e.eventId === event.eventId);
                    // Lookup status from the status map
                    const statusKey = `${event.eventId}_${item.menuItemId}_${item.sizeId || 'null'}`;
                    const itemStatus = statusMap.get(statusKey) || 'not_started';
                    if (!existingEvent) {
                        groupedItem.events.push({
                            eventId: event.eventId,
                            eventDate: event.eventDate,
                            clientName: event.clientName,
                            venue: event.venue,
                            quantity: event.quantity,
                            status: itemStatus,
                        });
                    }
                    else {
                        existingEvent.quantity += event.quantity;
                        // If any item is in progress or completed, update status accordingly
                        // Priority: completed > in_progress > not_started
                        if (itemStatus === 'completed' ||
                            (itemStatus === 'in_progress' && existingEvent.status === 'not_started')) {
                            existingEvent.status = itemStatus;
                        }
                    }
                }
            }
        }
        return {
            filters: report.filters,
            items: Array.from(itemsMap.values()),
            totalEvents: report.totalEvents,
            generatedAt: report.reportGeneratedAt,
        };
    }
    /**
     * Update or create prep status for a menu item in an event
     */
    async updatePrepStatus(dto) {
        const { eventId, menuItemId, sizeId, status, notes } = dto;
        // Use upsert to create or update the status
        const whereClause = {
            event_id: BigInt(eventId),
            menu_item_id: BigInt(menuItemId),
            size_id: sizeId ? BigInt(sizeId) : null,
        };
        const prepStatus = await this.prisma.kitchen_prep_status.upsert({
            where: {
                unique_event_item_size: whereClause,
            },
            update: {
                status,
                notes,
                updated_at: new Date(),
            },
            create: {
                event_id: BigInt(eventId),
                menu_item_id: BigInt(menuItemId),
                ...(sizeId && { size_id: BigInt(sizeId) }),
                status,
                notes,
            },
            include: {
                event: {
                    select: {
                        id: true,
                        event_datetime: true,
                        venue: true,
                        customer: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                menu_item: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                size: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        return {
            success: true,
            message: 'Prep status updated successfully',
            data: prepStatus,
        };
    }
};
exports.KitchenReportsService = KitchenReportsService;
exports.KitchenReportsService = KitchenReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], KitchenReportsService);
