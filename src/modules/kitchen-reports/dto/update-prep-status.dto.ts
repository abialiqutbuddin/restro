import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum KitchenPrepStatusEnum {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export class UpdatePrepStatusDto {
  @IsNumber()
  @Type(() => Number)
  eventId!: number;

  @IsNumber()
  @Type(() => Number)
  menuItemId!: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sizeId?: number;

  @IsEnum(KitchenPrepStatusEnum)
  status!: KitchenPrepStatusEnum;

  @IsOptional()
  @IsString()
  notes?: string;
}
