import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CreateMenuItemDto } from './create-menu-items.dto';
import { QueryMenuItemsDto } from './query-menu-items.dto';
import { MenuItemsService } from './menu-items.service';

@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly svc: MenuItemsService) {}

  /**
   * POST /api/menu-items
   * Body: { name, description?, active? }
   */
  @Post()
  create(@Body() dto: CreateMenuItemDto) {
    return this.svc.create(dto);
  }

  /**
   * GET /api/menu-items?q=...&active=true&skip=0&take=20
   */
  @Get()
  findMany(@Query() q: QueryMenuItemsDto) {
    return this.svc.findMany(q);
  }

  /**
   * GET /api/menu-items/:id
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) idNum: number) {
    // Prisma expects bigint for your schema's BigInt PK; convert safely
    const id = BigInt(idNum);
    return this.svc.findOne(id);
  }
}