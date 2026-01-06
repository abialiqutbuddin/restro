"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../database/prisma.service");
const email_service_1 = require("../email/email.service");
let EmailSchedulerService = EmailSchedulerService_1 = class EmailSchedulerService {
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.log = new common_1.Logger(EmailSchedulerService_1.name);
        this.isProcessing = false;
    }
    // Process queue every 10 seconds
    async processQueue() {
        if (this.isProcessing)
            return;
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
        }
        catch (e) {
            this.log.error(`Queue processing error: ${e}`);
        }
        finally {
            this.isProcessing = false;
        }
    }
    async processEmail(emailRecord) {
        const payload = emailRecord.payload;
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
        }
        catch (e) {
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
};
exports.EmailSchedulerService = EmailSchedulerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailSchedulerService.prototype, "processQueue", null);
exports.EmailSchedulerService = EmailSchedulerService = EmailSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], EmailSchedulerService);
