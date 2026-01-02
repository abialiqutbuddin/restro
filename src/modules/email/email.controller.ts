import { Body, Controller, Post } from '@nestjs/common';
import { EmailQueueService } from '../email-queue/email-queue.service';
import { SendEmailDto } from './dto/send-email.dto';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

@Controller('email')
export class EmailController {
  constructor(private readonly emailQueue: EmailQueueService) { }

  @Post('send')
  async send(@Body() body: any) {
    const dto = plainToInstance(SendEmailDto, body);
    await validateOrReject(dto);

    const to = Array.isArray(dto.to) ? dto.to : dto.to ? [dto.to] : [];
    const cc = Array.isArray(dto.cc) ? dto.cc : dto.cc ? [dto.cc] : undefined;

    await this.emailQueue.addToQueue({
      subject: dto.subject,
      to,
      cc,
      text: dto.text,
      html: dto.html,
      pdfBase64: dto.pdfBase64,
      pdfFilename: dto.pdfFilename,
    });

    return { ok: true, queued: true };
  }
}