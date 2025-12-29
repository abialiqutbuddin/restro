"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./database/prisma.module");
const events_module_1 = require("./modules/events/events.module");
const health_module_1 = require("./health/health.module");
const gcal_module_1 = require("./modules/gcal/gcal.module");
const menu_items_module_1 = require("./modules/menu-items/menu-items.module");
const lookup_module_1 = require("./modules/lookups/lookup.module");
const seed_controller_1 = require("./seed/seed.controller");
const customers_module_1 = require("./modules/customers/customers.module");
const payments_module_1 = require("./modules/payments/payments.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const square_module_1 = require("./modules/sqaure/square.module");
const invoice_module_1 = require("./modules/invoice/invoice.module");
const email_module_1 = require("./modules/email/email.module");
const magic_links_module_1 = require("./modules/magic-links/magic-links.module");
const auth_module_1 = require("./modules/auth/auth.module");
const audit_logs_module_1 = require("./modules/audit-logs/audit-logs.module");
const settings_module_1 = require("./modules/settings/settings.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            events_module_1.EventsModule,
            gcal_module_1.GcalModule,
            health_module_1.HealthModule,
            menu_items_module_1.MenuItemsModule,
            lookup_module_1.LookupsModule,
            customers_module_1.CustomersModule,
            payments_module_1.PaymentsModule,
            dashboard_module_1.DashboardModule,
            square_module_1.SquareModule,
            invoice_module_1.InvoicesModule,
            email_module_1.EmailModule,
            magic_links_module_1.MagicLinksModule,
            auth_module_1.AuthModule,
            audit_logs_module_1.AuditLogsModule,
            settings_module_1.SettingsModule,
        ],
        controllers: [seed_controller_1.SeedController],
    })
], AppModule);
