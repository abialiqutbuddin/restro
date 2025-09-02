import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSizeDto {
  @IsString() @MaxLength(80) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}