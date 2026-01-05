import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../../database/prisma.module';
import { EmailQueueService } from './email-queue.service';
import { EmailSchedulerService } from './email-scheduler.service';

@Module({
    imports: [
        PrismaModule,
        ScheduleModule.forRoot(),
        forwardRef(() => EmailModule),
    ],
    providers: [EmailQueueService, EmailSchedulerService],
    exports: [EmailQueueService],
})
export class EmailQueueModule { }
