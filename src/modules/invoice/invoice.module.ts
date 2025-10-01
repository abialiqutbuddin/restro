// src/invoices/invoices.module.ts
import { Module } from '@nestjs/common';
import { InvoicesController } from './invoice.controller';
import { PrismaService } from '../../database/prisma.service';
import { InvoicesService } from './invoice.service';


@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, PrismaService],
})
export class InvoicesModule {}