// src/modules/events/dto/import-event.dto.ts
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/* ------------ Enums to constrain inputs ------------ */

export enum PricingUnitCode {
  PER_THAAL  = 'per_thaal',
  PER_SIZE   = 'per_size',
  PER_PERSON = 'per_person',
  PER_TRAY   = 'per_tray',
}

export enum PricingModeCode {
  PER_UNIT_MANUAL      = 'per_unit_manual',
  PER_UNIT_FROM_ITEMS  = 'per_unit_from_items',
}

export enum CurrencyCode {
  USD = 'USD',
  // add more if you actually support them
}

export enum EventStatus {
  INCOMPLETE = 'incomplete',
  COMPLETE   = 'complete',
  NEW        = 'new',
}

/* ------------ Items (menu item always exists) ------------ */

export class ImportItemDto {
  @IsInt()
  @Type(() => Number)
  itemId!: number;                // REQUIRED

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sizeId?: number;                // optional

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  qtyPerUnit?: number;            // default 1 in service if omitted

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  componentPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

/* ------------ Orders ------------ */

export class ImportOrderDto {
  @IsEnum(PricingUnitCode)
  unitCode!: PricingUnitCode;

  @IsEnum(PricingModeCode)
  pricingMode!: PricingModeCode;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  qty!: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  unitPrice!: number;

  @IsEnum(CurrencyCode)
  currency!: CurrencyCode;

  @IsOptional()
  @IsString()
  calcNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportItemDto)
  items: ImportItemDto[] = []; // default to empty array, never undefined
}

/* ------------ Catering blocks ------------ */

export class ImportCateringDto {
  @IsInt()
  @Type(() => Number)
  categoryId!: number;

  @IsOptional()
  @IsString()
  titleOverride?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportOrderDto)
  orders: ImportOrderDto[] = [];
}

/* ------------ Root event payload ------------ */

export class ImportEventDto {
  @IsOptional()
  @IsString()
  gcalEventId?: string;

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsDateString()
  eventDatetime!: string; // ISO 8601

  @IsOptional() 
  @IsString() 
  calendarText?: string;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDelivery?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  deliveryCharges?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  serviceCharges?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  headcountEst?: number;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus; // defaults to 'incomplete' in service if omitted

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportCateringDto)
  caterings: ImportCateringDto[] = [];
}