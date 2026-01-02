import { Module } from '@nestjs/common';
import { KitchenReportsController } from './kitchen-reports.controller';
import { KitchenReportsService } from './kitchen-reports.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KitchenReportsController],
  providers: [KitchenReportsService],
  exports: [KitchenReportsService],
})
export class KitchenReportsModule {}
