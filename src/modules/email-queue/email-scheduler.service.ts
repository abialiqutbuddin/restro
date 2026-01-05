
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';
import { EmailPayload } from './email-queue.service';

@Injectable()
export class EmailSchedulerService {
    private readonly log = new Logger(EmailSchedulerService.name);
    private isProcessing = false;

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
    ) { }

    // Process queue every 10 seconds
    @Cron(CronExpression.EVERY_10_SECONDS)
    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // 1. Fetch pending emails (limit 5 to avoid overloading)
            const emails = await this.prisma.email_queue.findMany({
                where: { status: 'PENDING' },
                take: 5,
                orderBy: { created_at: 'asc' },
            });

            if (emails.length === 0) {
                this.isProcessing = false;
                return;
            }

            this.log.log(`Processing ${emails.length} emails from queue...`);

            // 2. Mark as PROCESSING (optional, but good for visibility if we had concurrent workers)
            // For simplicity in single instance, we just loop and process.
            // Ideally lock them, but with single cron instance and `isProcessing` flag, it's safe.

            for (const email of emails) {
                await this.processEmail(email);
            }
        } catch (e) {
            this.log.error(`Queue processing error: ${e}`);
        } finally {
            this.isProcessing = false;
        }
    }

    private async processEmail(emailRecord: any) {
        const payload = emailRecord.payload as EmailPayload;

        try {
            // Mark as PROCESSING
            await this.prisma.email_queue.update({
                where: { id: emailRecord.id },
                data: { status: 'PROCESSING', attempts: { increment: 1 } },
            });

            // Send via existing service
            await this.emailService.sendPdfEmail({
                to: payload.to,
                subject: payload.subject,
                html: payload.html,
                text: payload.text,
                cc: payload.cc,
                pdfBase64: payload.pdfBase64 || '', // Handle optional
                pdfFilename: payload.pdfFilename,
            });

            // Mark SENT
            await this.prisma.email_queue.update({
                where: { id: emailRecord.id },
                data: { status: 'SENT', sent_at: new Date() },
            });
            this.log.log(`Email ${emailRecord.id} sent successfully.`);

        } catch (e) {
            this.log.error(`Failed to send email ${emailRecord.id}: ${e}`);

            const attempts = emailRecord.attempts + 1;
            const status = attempts >= 3 ? 'FAILED' : 'PENDING'; // Retry up to 3 times

            await this.prisma.email_queue.update({
                where: { id: emailRecord.id },
                data: {
                    status,
                    error: String(e),
                    // If retrying, maybe add a backoff timestamp? For now, next cron picks it up.
                },
            });
        }
    }
}
