import { Module } from '@nestjs/common';
import { MagicLinksController } from './magic-links.controller';
import { MagicLinksService } from './magic-links.service';
import { PrismaModule } from '../../database/prisma.module';

import { EventsModule } from '../events/events.module';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
    imports: [PrismaModule, EventsModule, AuditLogsModule],
    controllers: [MagicLinksController],
    providers: [MagicLinksService],
    exports: [MagicLinksService],
})
export class MagicLinksModule { }
