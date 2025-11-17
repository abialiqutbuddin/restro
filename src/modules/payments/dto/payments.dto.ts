// src/modules/payments/dto/payments.dto.ts
import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, ValidateIf, Min, IsIn, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethodDto { cash='cash', check='check', credit='credit', others='others' }
export enum PaymentStatusDto { pending='pending', succeeded='succeeded', failed='failed', refunded='refunded' }

export class PaymentCustomerDto {
  @IsOptional() @IsString()
  id?: string;

  @IsOptional() @IsString()
  name?: string;

  @IsNotEmpty() @IsString()
  email!: string;

  @IsNotEmpty() @IsString()
  phone!: string;
}

export class CreatePaymentDto {
  @IsEnum(PaymentMethodDto) method!: PaymentMethodDto;

  @IsNumber() @Type(() => Number) @Min(0.01)
  amount!: number;

  @IsString() @IsIn(['USD','PKR','AED','EUR','GBP'])
  currency!: string;

  @IsOptional() @IsDateString()
  paidAt?: string; // ISO

  @ValidateIf(o => o.method === PaymentMethodDto.credit)
  @IsString()
  squareId?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsNumber() discount?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentCustomerDto)
  customer?: PaymentCustomerDto;

}

export class UpdatePaymentDto {
  @IsOptional() @IsEnum(PaymentMethodDto) method?: PaymentMethodDto;

  @IsOptional() @IsNumber() @Type(() => Number) @Min(0.01)
  amount?: number;

  @IsOptional() @IsString() @IsIn(['USD','PKR','AED','EUR','GBP'])
  currency?: string;

  @IsOptional() @IsDateString()
  paidAt?: string;

  @ValidateIf(o => o.method === PaymentMethodDto.credit)
  @IsString()
  squareId?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsEnum(PaymentStatusDto)
  status?: PaymentStatusDto;

  @IsOptional() @IsNumber() discount?: number;

}