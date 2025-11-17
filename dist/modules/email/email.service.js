"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
// src/email/email.service.ts
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = EmailService_1 = class EmailService {
    constructor() {
        this.log = new common_1.Logger(EmailService_1.name);
        // Hard-coded Gmail SMTP credentials  ⚠️ rotate your app password if this is real
        this.gmailUser = 'barbqvillagerestaurant@gmail.com';
        this.gmailPass = 'roocdkfsirtcegcj'; // <- your Gmail App Password (no spaces)
        this.fromName = 'BBQ Village Mailer';
        this.transporter = nodemailer.createTransport({
            pool: true,
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: this.gmailUser,
                pass: this.gmailPass,
            },
            // throttling so Gmail doesn’t rate-limit you again
            rateDelta: 60_000, // 1 minute window
            rateLimit: 10, // 10 messages per minute
        });
    }
    isRetryable(err) {
        const rc = err?.responseCode;
        return rc >= 400 && rc < 500; // includes 450
    }
    async sendPdfEmail(params) {
        const from = `"${this.fromName}" <${this.gmailUser}>`;
        // Convert base64 → Buffer
        let pdfBuffer;
        try {
            pdfBuffer = Buffer.from(params.pdfBase64, 'base64');
        }
        catch {
            throw new common_1.InternalServerErrorException('Invalid pdfBase64 payload.');
        }
        try {
            const info = await this.transporter.sendMail({
                from,
                to: params.to,
                cc: params.cc,
                subject: params.subject,
                text: params.text,
                html: params.html,
                attachments: [
                    {
                        filename: params.pdfFilename || 'attachment.pdf',
                        content: pdfBuffer,
                        contentType: 'application/pdf',
                    },
                ],
                envelope: {
                    from: this.gmailUser,
                    to: Array.isArray(params.to) ? params.to : [params.to],
                },
            });
            this.log.log(`Email sent → ${JSON.stringify(info.accepted)}`);
            return {
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected,
            };
        }
        catch (err) {
            this.log.error(`SendMail failed: ${err?.response || err}`);
            if (this.isRetryable(err)) {
                throw new common_1.InternalServerErrorException(`Email temporarily deferred by Gmail (code ${err?.responseCode}). Try again later.`);
            }
            throw new common_1.InternalServerErrorException(`Failed to send mail: ${err?.message || err}`);
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
