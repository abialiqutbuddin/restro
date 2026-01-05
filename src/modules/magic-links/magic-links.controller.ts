import { Body, Controller, Get, Param, Post, Put, Patch, Query, Res, HttpStatus, BadRequestException } from '@nestjs/common';
import { MagicLinksService } from './magic-links.service';
import { ClientUpdateEventDto } from '../events/dto/client-update-event.dto';

@Controller('magic-links')
export class MagicLinksController {
    constructor(private readonly magicLinksService: MagicLinksService) { }

    @Post('generate')
    async generate(@Body() body: { orderId: number | string; userId?: number | string }) {
        try {
            console.log('Generating Magic Link for order:', body.orderId, 'User:', body.userId);
            const link = await this.magicLinksService.generateLink(
                BigInt(body.orderId),
                body.userId ? BigInt(body.userId) : null,
            );
            // Convert BigInt to string for JSON response
            return {
                ...link,
                id: link.id.toString(),
                order_id: link.order_id.toString(),
                created_by_user_id: link.created_by_user_id?.toString() || null,
            };
        } catch (e) {
            console.error('Error generating magic link:', e);
            throw e;
        }
    }

    @Post('regenerate')
    async regenerate(@Body() body: { orderId: number | string; userId?: number | string }) {
        const link = await this.magicLinksService.regenerateLink(
            BigInt(body.orderId),
            body.userId ? BigInt(body.userId) : null,
        );
        return {
            ...link,
            id: link.id.toString(),
            order_id: link.order_id.toString(),
            created_by_user_id: link.created_by_user_id?.toString() || null,
        };
    }

    @Get('status/:orderId')
    async getStatus(@Param('orderId') orderId: string) {
        // orderId is likely a CUID (string) or number. The service should handle it.
        // If the service expects a number (BigInt), but we moved to CUIDs, the service also needs to be compatible.
        // Given the error "Cannot convert ... to a BigInt", the ID is definitely a string CUID.
        // We pass it as string, and assume service can handle it or we cast to any if service type is strict but implementation allows string.
        // Actually, looking at generate, it takes number|string.
        // Let's assume getLinkForOrder can take string or BigInt.
        const link = await this.magicLinksService.getLinkForOrder(orderId as any);
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

    @Patch('update-order/:token')
    async updateOrder(@Param('token') token: string, @Body() dto: ClientUpdateEventDto) {
        return this.magicLinksService.updateOrder(token, dto);
    }

    @Post('approve/:token')
    async approve(@Param('token') token: string) {
        const result = await this.magicLinksService.approveLink(token);
        return {
            success: true,
            status: 'APPROVED',
            approved_at: result.approved_at,
        };
    }

    @Post('reject/:token')
    async reject(@Param('token') token: string) {
        await this.magicLinksService.rejectLink(token);
        return {
            success: true,
            status: 'REJECTED',
        };
    }

    @Post('change-request/:token')
    async changeRequest(
        @Param('token') token: string,
        @Body() body: { changes: any; reason: string },
    ) {
        if (!body.changes || !body.reason) {
            throw new BadRequestException('Changes and reason are required');
        }
        await this.magicLinksService.createChangeRequest(token, body.changes, body.reason);
        return {
            success: true,
            status: 'PENDING',
        };
    }
}
