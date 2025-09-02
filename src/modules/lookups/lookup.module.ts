import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

import { SizesController } from './sizes.controller';
import { SizesService } from './sizes.service';

import { PricingUnitsController } from './pricing-units.controller';
import { PricingUnitsService } from './pricing-units.service';

import { CategoryUnitsController } from './category-units.controller';
import { CategoryUnitsService } from './category-units.service';

@Module({
  controllers: [
    CategoriesController,
    SizesController,
    PricingUnitsController,
    CategoryUnitsController,
  ],
  providers: [
    PrismaService,
    CategoriesService,
    SizesService,
    PricingUnitsService,
    CategoryUnitsService,
  ],
  exports: [
    CategoriesService,
    SizesService,
    PricingUnitsService,
    CategoryUnitsService,
  ],
})
export class LookupsModule {}