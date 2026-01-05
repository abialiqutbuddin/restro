import { Controller, Get, Post, Body, Query, Patch, Param } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditActorType } from '@prisma/client';

@Controller('audit-logs')
export class AuditLogsController {
    constructor(private readonly auditLogsService: AuditLogsService) { }

    @Get()
    async findAll(@Query() query: { action?: string; orderId?: string; skip?: number; take?: number }) {
        return this.auditLogsService.findAll(query);
    }

    @Patch(':id/status')
    async updateStatus(@Param('id') id: string, @Body('status') status: string) {
        const log = await this.auditLogsService.updateStatus(id, status);
        if (log && status === 'APPROVED') {
            await this.auditLogsService.log(
                log.order_id,
                AuditActorType.SYSTEM,
                'MAGIC_LINK_APPROVED',
                {
                    metadata: {
                        requestId: id,
                        email: (log.metadata as any)?.email,
                    },
                },
            );
        }
        return { success: true };
    }

    @Post('request-link')
    async requestLink(@Body() body: { email: string; reason: string; orderId: string }) {
        // Log the request
        await this.auditLogsService.log(
            body.orderId,
            AuditActorType.SYSTEM, // Or CLIENT if unauthenticated but public? relying on body.
            'MAGIC_LINK_REQUEST',
            {
                metadata: {
                    email: body.email,
                    reason: body.reason,
                    status: 'PENDING',
                },
            },
        );
        return { success: true, message: 'Request submitted successfully' };
    }
}
