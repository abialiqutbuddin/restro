import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SizesService } from './sizes.service';
import { CreateSizeDto } from './dto/create-size.dto';

@Controller('sizes')
export class SizesController {
  constructor(private svc: SizesService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('active') active?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.svc.list({
      q,
      active: active === undefined ? undefined : active === 'true',
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 100,
    });
  }

  @Post()
  create(@Body() dto: CreateSizeDto) {
    return this.svc.create(dto);
  }
}