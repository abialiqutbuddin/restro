import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaService } from '../../database/prisma.service';
import { CustomersModule } from '../customers/customers.module';
import { GcalModule } from '../gcal/gcal.module';

@Module({
  imports: [CustomersModule, GcalModule],
  controllers: [EventsController],
  providers: [EventsService, PrismaService],
  exports: [EventsService],
})
export class EventsModule { }