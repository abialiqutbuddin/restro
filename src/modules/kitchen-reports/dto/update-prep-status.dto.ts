import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum KitchenPrepStatusEnum {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum AuditActorType {
  CLIENT = 'CLIENT',
  STAFF = 'STAFF',
  SYSTEM = 'SYSTEM',
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

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  changedById?: number;

  @IsOptional()
  @IsString()
  changedByName?: string;

  @IsOptional()
  @IsEnum(AuditActorType)
  changedByType?: AuditActorType = AuditActorType.STAFF;
}
