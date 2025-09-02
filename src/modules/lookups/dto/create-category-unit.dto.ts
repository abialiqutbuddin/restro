import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryUnitDto {
  @IsNumber() categoryId!: number; // BigInt id of category
  @IsString() @MaxLength(50) unitCode!: string; // pricing_unit.code
  @IsOptional() @IsString() @MaxLength(255) hint?: string;
}