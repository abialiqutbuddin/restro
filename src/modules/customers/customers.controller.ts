import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customers.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly svc: CustomersService) {}

  // Put this BEFORE any :id route so "all" doesn't get parsed as an id
  @Get('all')
  getAll() {
    return this.svc.listAll();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.get(id);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.svc.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}