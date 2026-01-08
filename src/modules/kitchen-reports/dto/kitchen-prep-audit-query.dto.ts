import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum AuditActorType {
  CLIENT = 'CLIENT',
  STAFF = 'STAFF',
  SYSTEM = 'SYSTEM',
}

export class KitchenPrepAuditQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  eventId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  menuItemId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sizeId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  changedById?: number;

  @IsOptional()
  @IsEnum(AuditActorType)
  changedByType?: AuditActorType;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 100;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number = 0;
}
