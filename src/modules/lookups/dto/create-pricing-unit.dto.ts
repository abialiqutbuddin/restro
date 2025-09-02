import { IsString, MaxLength } from 'class-validator';

export class CreatePricingUnitDto {
  @IsString() @MaxLength(50)  code!: string;        // e.g. per_thaal
  @IsString() @MaxLength(100) label!: string;       // Thaals, Persons...
  @IsString() @MaxLength(50)  qty_label!: string;   // thaals | persons | trays
}