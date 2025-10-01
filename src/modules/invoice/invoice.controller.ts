// src/invoices/invoices.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { InvoicesService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';


@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  async create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Get()
  async findAll() {
    return this.invoicesService.findAll();
  }

      @Get('last-number')
  async getLastInvoiceNumber() {
    return this.invoicesService.getLastInvoiceNumber();
  }
  

  @Get(':invoiceNumber')
  async findOne(@Param('invoiceNumber') invoiceNumber: string) {
    return this.invoicesService.findOne(invoiceNumber);
  }

}