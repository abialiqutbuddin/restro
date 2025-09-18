import { Module } from '@nestjs/common';
import { SquareService } from './square.service';
import { SquareController } from './square.controller';

@Module({
  controllers: [SquareController],
  providers: [SquareService],
})
export class SquareModule {}