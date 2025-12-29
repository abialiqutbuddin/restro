// src/modules/events/dto/import-events.dto.ts
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber,
  IsOptional, IsString, Min, ValidateNested, ValidateIf, registerDecorator,
  ValidationArguments, ValidationOptions
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventBillingStatus } from '@prisma/client';

/* ---- enums ---- */
export enum PricingUnitCode {
  PER_THAAL = 'per_thaal',
  PER_SIZE = 'per_size',
  PER_PERSON = 'per_person',
  PER_TRAY = 'per_tray',
  PER_BOX = 'per_box',
  PER_ITEM = 'per_item',
}
export enum PricingModeCode {
  PER_UNIT_MANUAL = 'per_unit_manual',
  PER_UNIT_FROM_ITEMS = 'per_unit_from_items',
}
export enum CurrencyCode { USD = 'USD' }
export enum EventStatus { INCOMPLETE = 'incomplete', COMPLETE = 'complete', NEW = 'new', PENDING = 'pending' }

/* ---- leaf DTOs ---- */
export class ImportItemDto {
  @IsInt() @Type(() => Number) itemId!: number;
  @IsOptional() @IsInt() @Type(() => Number) sizeId?: number;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) qtyPerUnit?: number;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) componentPrice?: number;
  @IsOptional() @IsString() notes?: string;
}

export class ImportOrderDto {
  @IsEnum(PricingUnitCode) unitCode!: PricingUnitCode;
  @IsEnum(PricingModeCode) pricingMode!: PricingModeCode;
  @IsNumber() @Type(() => Number) @Min(0) qty!: number;
  @IsNumber() @Type(() => Number) @Min(0) unitPrice!: number;
  @IsEnum(CurrencyCode) currency!: CurrencyCode;
  @IsOptional() @IsString() calcNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportItemDto)
  items: ImportItemDto[] = [];
}

export class ImportCateringDto {
  @IsInt() @Type(() => Number) categoryId!: number;
  @IsOptional() @IsString() titleOverride?: string;
  @IsOptional() @IsString() instructions?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportOrderDto)
  orders: ImportOrderDto[] = [];
}

/* ---- nested customer ---- */
export class ImportNewCustomerDto {
  @IsString() name!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
}

/* ---- class-level validator: exactly one of customerId / newCustomer ---- */
// function AtMostOneCustomer(options?: ValidationOptions) {
//   return function (object: object, propertyName: string) {
//     registerDecorator({
//       name: 'AtMostOneCustomer',
//       target: object.constructor,
//       propertyName,
//       constraints: [],
//       options,
//       validator: {
//         validate(_: any, args: ValidationArguments) {
//           const o = args.object as any;
//           const hasId  = typeof o.customerId === 'number';
//           const hasNew = !!o.newCustomer && typeof o.newCustomer.name === 'string';
//           // allow none, or exactly one; forbid both
//           return !(hasId && hasNew);
//         },
//         defaultMessage() {
//           return 'Provide at most one of customerId or newCustomer';
//         },
//       },
//     });
//   };
// }

/* ---- ROOT DTO ---- */
export class ImportEventDto {
  @IsOptional() @IsString() gcalEventId?: string;

  // NEW: either existing customer id OR a new customer payload
  @IsOptional() @IsInt() @Type(() => Number)
  customerId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImportNewCustomerDto)
  newCustomer?: ImportNewCustomerDto;

  _customerGuard!: string;

  @IsString()
  eventDatetime!: string;

  @IsOptional() @IsString() calendarText?: string;
  @IsOptional() @IsString() venue?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsBoolean() @Type(() => Boolean) isDelivery?: boolean;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) deliveryCharges?: number;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) serviceCharges?: number;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) discount?: number;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) salesTaxPct?: number; // e.g. 10.5
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) salesTaxAmount?: number; // calculated
  @IsOptional() @IsInt() @Type(() => Number) headcountEst?: number;
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  newOrder?: boolean;

  @IsOptional()
  @IsEnum(EventBillingStatus)
  billingStatus?: EventBillingStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportCateringDto)
  caterings: ImportCateringDto[] = [];
}
