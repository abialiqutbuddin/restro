import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ChangeRequestsService } from './change-requests.service';

@Controller('change-requests')
export class ChangeRequestsController {
    constructor(private readonly service: ChangeRequestsService) { }

    @Get()
    async list(
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('status') status?: string,
    ) {
        return this.service.list({
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined,
            status,
        });
    }

    @Patch(':id/approve')
    async approve(
        @Param('id') id: string,
        @Body() body: { notes?: string; reviewerId?: string },
    ) {
        // In a real app, reviewerId would come from auth token
        // For now, accept it from body or default to 1
        const reviewerId = body.reviewerId ? BigInt(body.reviewerId) : BigInt(1);
        await this.service.approve(id, reviewerId, body.notes);
        return { success: true, status: 'APPROVED' };
    }

    @Patch(':id/reject')
    async reject(
        @Param('id') id: string,
        @Body() body: { notes?: string; reviewerId?: string },
    ) {
        const reviewerId = body.reviewerId ? BigInt(body.reviewerId) : BigInt(1);
        await this.service.reject(id, reviewerId, body.notes);
        return { success: true, status: 'REJECTED' };
    }
}
