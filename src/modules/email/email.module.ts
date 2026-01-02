import { Module, forwardRef } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { PrismaService } from '../../database/prisma.service';
import { EmailQueueModule } from '../email-queue/email-queue.module';

@Module({
  imports: [forwardRef(() => EmailQueueModule)],
  controllers: [EmailController],
  providers: [EmailService, PrismaService],
  exports: [EmailService],
})
export class EmailModule { }