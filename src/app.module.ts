import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './health/health.module';
import { GcalModule } from './modules/gcal/gcal.module';
import { MenuItemsModule } from './modules/menu-items/menu-items.module';
import { LookupsModule } from './modules/lookups/lookup.module';
import { SeedController } from './seed/seed.controller';
import { CustomersModule } from './modules/customers/customers.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SquareModule } from './modules/sqaure/square.module';
import { InvoicesModule } from './modules/invoice/invoice.module';
import { EmailModule } from './modules/email/email.module';
import { MagicLinksModule } from './modules/magic-links/magic-links.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EventsModule,
    GcalModule,
    HealthModule,
    MenuItemsModule,
    LookupsModule,
    CustomersModule,
    PaymentsModule,
    DashboardModule,
    SquareModule,
    InvoicesModule,
    EmailModule,
    MagicLinksModule,
    AuthModule,
    AuditLogsModule,
    SettingsModule,
  ],
  controllers: [SeedController],
})
export class AppModule { }
