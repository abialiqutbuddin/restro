import { Body, Controller, Get, Param, Post, Put, Patch, Query, Res, HttpStatus, BadRequestException } from '@nestjs/common';
import { MagicLinksService } from './magic-links.service';
import { ClientUpdateEventDto } from '../events/dto/client-update-event.dto';

@Controller('magic-links')
export class MagicLinksController {
    constructor(private readonly magicLinksService: MagicLinksService) { }

    @Post('generate')
    async generate(@Body() body: { orderId: string, userId?: string }) {
        const result = await this.magicLinksService.generateLink(
            BigInt(body.orderId),
            body.userId ? BigInt(body.userId) : null,
        );

        return {
            token: result.raw_token,
            link: {
                id: result.id.toString(),
                order_id: result.order_id.toString(),
                token_hash: result.token_hash,
                created_at: result.created_at,
                expires_at: result.expires_at,
                created_by_user_id: result.created_by_user_id?.toString() || null,
            },
        };
    }

    @Post('regenerate')
    async regenerate(@Body() body: { orderId: string, userId?: string }) {
        const result = await this.magicLinksService.regenerateLink(
            BigInt(body.orderId),
            body.userId,
        );

        return {
            token: result.raw_token,
            link: {
                id: result.id.toString(),
                order_id: result.order_id.toString(),
                token_hash: result.token_hash,
                created_at: result.created_at,
                expires_at: result.expires_at,
                created_by_user_id: result.created_by_user_id?.toString() || null,
            },
        };
    }

    @Get()
    async list(
        @Query('skip') skip?: number,
        @Query('take') take?: number,
        @Query('status') status?: 'active' | 'expired' | 'revoked' | 'all',
    ) {
        const result = await this.magicLinksService.listLinks({
            skip: skip ? Number(skip) : undefined,
            take: take ? Number(take) : undefined,
            status,
        });

        return {
            items: result.items.map((link: any) => ({
                id: link.id.toString(),
                order_id: link.order_id.toString(),
                token_hash: link.token_hash,
                raw_token: link.raw_token,
                created_at: link.created_at,
                expires_at: link.expires_at,
                revoked_at: link.revoked_at,
                last_accessed_at: link.last_accessed_at,
                access_count: link.access_count,
                event: {
                    id: link.event.id.toString(),
                    customer_name: link.event.customer?.name ?? 'Unknown',
                    event_date: link.event.event_datetime,
                }
            })),
            total: result.total,
        };
    }

    @Patch(':id/revoke')
    async revoke(@Param('id') id: string) {
        await this.magicLinksService.revokeLink(BigInt(id));
        return { success: true };
    }

    @Get('status/:orderId')
    async getStatus(@Param('orderId') orderId: string) {
        // orderId is likely a CUID (string) or number. The service should handle it.
        const link = await this.magicLinksService.getLinkForOrder(BigInt(orderId));
        if (!link) {
            return { exists: false };
        }
        const isExpired = new Date() > link.expires_at;
        const isRevoked = !!link.revoked_at;
        return {
            exists: true,
            id: link.id.toString(),
            order_id: link.order_id.toString(),
            created_at: link.created_at,
            expires_at: link.expires_at,
            revoked_at: link.revoked_at,
            access_count: link.access_count,
            last_accessed_at: link.last_accessed_at,
            is_expired: isExpired,
            is_revoked: isRevoked,
            is_active: !isExpired && !isRevoked,
        };
    }

    @Get('validate/:token')
    async validate(@Param('token') token: string) {
        const { status, link } = await this.magicLinksService.validateLinkDetailed(token);

        if (status !== 'VALID' || !link) {
            return {
                valid: false,
                status,
                orderId: link?.order_id?.toString() || null
            };
        }

        const event = await this.magicLinksService.getEventForLink(link.order_id);

        return {
            valid: true,
            status: 'VALID',
            orderId: link.order_id.toString(),
            expiresAt: link.expires_at,
            event,
        };
    }

    @Put('order/:token')
    async updateOrder(@Param('token') token: string, @Body() dto: ClientUpdateEventDto) {
        return this.magicLinksService.updateOrder(token, dto);
    }

    @Post('approve/:token')
    async approve(@Param('token') token: string) {
        await this.magicLinksService.approveLink(token);
        return { success: true };
    }

    @Post('reject/:token')
    async reject(@Param('token') token: string) {
        await this.magicLinksService.rejectLink(token);
        return { success: true };
    }

    @Post('change-request/:token')
    async changeRequest(
        @Param('token') token: string,
        @Body() body: { changes: any; reason: string },
    ) {
        if (!body.reason) throw new BadRequestException('Reason is required');

        const result = await this.magicLinksService.createChangeRequest(
            token,
            body.changes,
            body.reason,
        );

        return {
            success: true,
            id: result.id.toString(),
        };
    }
}
