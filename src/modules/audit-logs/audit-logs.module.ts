import { Module, Global } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../../database/prisma.service';

@Global()
@Module({
    providers: [AuditLogsService, PrismaService],
    exports: [AuditLogsService],
})
export class AuditLogsModule { }
