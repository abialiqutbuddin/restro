// src/email/email.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly log = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  // Hard-coded Gmail SMTP credentials  ⚠️ rotate your app password if this is real
  private readonly gmailUser = 'barbqvillagerestaurant@gmail.com';
  private readonly gmailPass = 'roocdkfsirtcegcj'; // <- your Gmail App Password (no spaces)
  private readonly fromName = 'BBQ Village Mailer';

  constructor() {
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
      rateLimit: 10,     // 10 messages per minute
    });
  }

  private isRetryable(err: any) {
    const rc = err?.responseCode;
    return rc >= 400 && rc < 500; // includes 450
  }

  async sendPdfEmail(params: {
    subject: string;
    to: string[] | string;
    cc?: string[] | string;
    text?: string;
    html?: string;
    pdfBase64?: string;
    pdfFilename?: string;
  }) {
    const from = `"${this.fromName}" <${this.gmailUser}>`;

    const attachments: any[] = [];
    if (params.pdfBase64) {
      try {
        const pdfBuffer = Buffer.from(params.pdfBase64, 'base64');
        attachments.push({
          filename: params.pdfFilename || 'attachment.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
      } catch {
        this.log.warn('Invalid pdfBase64 payload, sending email without attachment.');
      }
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to: params.to,
        cc: params.cc,
        subject: params.subject,
        text: params.text,
        html: params.html,
        attachments,
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
    } catch (err: any) {
      this.log.error(`SendMail failed: ${err?.response || err}`);
      if (this.isRetryable(err)) {
        throw new InternalServerErrorException(
          `Email temporarily deferred by Gmail (code ${err?.responseCode}). Try again later.`,
        );
      }
      throw new InternalServerErrorException(`Failed to send mail: ${err?.message || err}`);
    }
  }
}