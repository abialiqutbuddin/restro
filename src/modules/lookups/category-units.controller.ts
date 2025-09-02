import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CategoryUnitsService } from './category-units.service';
import { CreateCategoryUnitDto } from './dto/create-category-unit.dto';

@Controller('category-units')
export class CategoryUnitsController {
  constructor(private svc: CategoryUnitsService) {}

  @Get()
  list(
    @Query('categoryId') categoryId?: string,
    @Query('unitCode') unitCode?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.svc.list({
      categoryId: categoryId ? Number(categoryId) : undefined,
      unitCode,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 100,
    });
  }

  @Post()
  create(@Body() dto: CreateCategoryUnitDto) {
    return this.svc.create(dto);
  }
}