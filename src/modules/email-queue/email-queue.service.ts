
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface EmailPayload {
    to: string | string[];
    cc?: string | string[];
    subject: string;
    html?: string;
    text?: string;
    pdfBase64?: string;
    pdfFilename?: string;
}

@Injectable()
export class EmailQueueService {
    private readonly log = new Logger(EmailQueueService.name);

    constructor(private readonly prisma: PrismaService) { }

    async addToQueue(payload: EmailPayload) {
        try {
            await this.prisma.email_queue.create({
                data: {
                    payload: payload as any, // Cast to any for JSON compatibility
                    status: 'PENDING',
                },
            });
            this.log.log(`Email added to queue for ${payload.to}`);
        } catch (e) {
            this.log.error(`Failed to add email to queue: ${e}`);
            throw e;
        }
    }
}
