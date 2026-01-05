import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaService } from '../../database/prisma.service';
import { PrismaModule } from '../../database/prisma.module';
import { CustomersModule } from '../customers/customers.module';
import { GcalModule } from '../gcal/gcal.module';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    PrismaModule,
    CustomersModule,
    GcalModule,
    AuditLogsModule
  ],
  controllers: [EventsController],
  providers: [EventsService, PrismaService],
  exports: [EventsService],
})
export class EventsModule { }