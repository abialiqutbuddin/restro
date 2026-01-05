import { Module } from '@nestjs/common';
import { ChangeRequestsService } from './change-requests.service';
import { ChangeRequestsController } from './change-requests.controller';
import { PrismaModule } from '../../database/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
    imports: [PrismaModule, AuditLogsModule],
    controllers: [ChangeRequestsController],
    providers: [ChangeRequestsService],
    exports: [ChangeRequestsService],
})
export class ChangeRequestsModule { }
