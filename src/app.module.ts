import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './health/health.module';
import { GcalModule } from './modules/gcal/gcal.module';
import { MenuItemsModule } from './modules/menu-items/menu-items.module';
import { LookupsModule } from './modules/lookups/lookup.module';
import { SeedController } from './seed/seed.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EventsModule,
    GcalModule,
    HealthModule,
    MenuItemsModule,
    LookupsModule,
  ],
  controllers: [SeedController],
})
export class AppModule {}