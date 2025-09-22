import { IsEmail, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCustomerDto {
  @IsString() name!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() defaultVenue?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() defaultVenue?: string;
  @IsOptional() @IsString() notes?: string;
}

export class SearchCustomersDto {
  @IsString()
  @IsOptional()
  q?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @IsOptional()
  skip?: number = 0;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  take?: number = 20;

  // client can override; we default to 3
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  min?: number = 3;
}