import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @MaxLength(100) name!: string;
  @IsString() @MaxLength(100) slug!: string;
  @IsOptional() @IsBoolean() active?: boolean;
}