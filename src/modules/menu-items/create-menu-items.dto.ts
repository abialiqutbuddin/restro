import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean; // default true
}