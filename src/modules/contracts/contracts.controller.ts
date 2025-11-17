import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractEventsQueryDto } from './dto/contract-events-query.dto';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Get()
  list(@Query('customerId') customerId?: string) {
    return this.contracts.list(customerId ? Number(customerId) : undefined);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.contracts.get(id);
  }

  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.contracts.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContractDto) {
    return this.contracts.update(id, dto);
  }

  @Get(':id/events')
  contractEvents(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ContractEventsQueryDto,
  ) {
    return this.contracts.getBillableEvents(id, query);
  }
}
