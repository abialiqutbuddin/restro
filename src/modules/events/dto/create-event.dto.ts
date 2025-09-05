import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NewCustomerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateEventDto {
  // --- customer: either pick existing OR create new ---
  @ValidateIf(o => !o.newCustomer)
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ValidateIf(o => !o.customerId)
  @IsOptional()
  @ValidateNested()
  @Type(() => NewCustomerDto)
  newCustomer?: NewCustomerDto;

  // Optional: keep these legacy fields if you still allow direct inline customer
  // data (will be ignored when newCustomer/customerId is provided)
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() customerPhone?: string;
  @IsOptional() @IsEmail()  customerEmail?: string;

  // --- event fields ---
  @IsDateString()
  eventDate!: string;

  @IsOptional() @IsString() venue?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() calendarText?: string;

  @IsOptional() @IsBoolean() isDelivery?: boolean;

  @IsOptional() @IsNumber() @Type(() => Number) @Min(0)
  deliveryFee?: number;

  @IsOptional() @IsNumber() @Type(() => Number) @Min(0)
  serviceFee?: number;

  @IsOptional() @IsInt() @Type(() => Number)
  headcountEst?: number;

  @IsOptional() @IsString()
  status?: string;

  @IsOptional() @IsString()
  gcalEventId?: string;
}