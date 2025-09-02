import { Module } from '@nestjs/common';
import { GcalController } from './gcal.controller';
import { GcalService } from './gcal.service';

@Module({
  controllers: [GcalController],
  providers: [GcalService],
  exports: [GcalService],
})
export class GcalModule {}