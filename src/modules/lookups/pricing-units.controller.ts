import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PricingUnitsService } from './pricing-units.service';
import { CreatePricingUnitDto } from './dto/create-pricing-unit.dto';

@Controller('pricing-units')
export class PricingUnitsController {
  constructor(private svc: PricingUnitsService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.svc.list({
      q,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 100,
    });
  }

  @Post()
  create(@Body() dto: CreatePricingUnitDto) {
    return this.svc.create(dto);
  }
}