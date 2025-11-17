import { IsBoolean, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { EventBillingStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class ContractEventsQueryDto {
  @IsOptional()
  @IsEnum(EventBillingStatus)
  billingStatus?: EventBillingStatus;

  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeInvoice?: boolean;
}
