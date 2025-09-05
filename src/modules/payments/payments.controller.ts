// src/modules/payments/payments.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payments.dto';

@Controller('events/by-gcal/:gcalId/payments')
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Get()
  list(@Param('gcalId') gcalId: string) {
    return this.svc.list(gcalId);
  }

  @Post()
  create(@Param('gcalId') gcalId: string, @Body() dto: CreatePaymentDto) {
    return this.svc.create(gcalId, dto);
  }

  @Put(':paymentId')
  update(
    @Param('gcalId') gcalId: string,
    @Param('paymentId') paymentId: string, // keep as string, cast in service
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.svc.update(gcalId, Number(paymentId), dto);
  }

  @Delete(':paymentId')
  remove(
    @Param('gcalId') gcalId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.svc.remove(gcalId, Number(paymentId));
  }

  @Get('summary')
  summary(@Param('gcalId') gcalId: string) {
    return this.svc.summary(gcalId);
  }
}