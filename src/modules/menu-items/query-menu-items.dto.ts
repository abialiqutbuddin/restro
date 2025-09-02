import { Type } from 'class-transformer';
import { IsBooleanString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryMenuItemsDto {
  /** Search by name (case-insensitive contains) */
  @IsOptional()
  @IsString()
  q?: string;

  /** Filter active = true/false */
  @IsOptional()
  @IsBooleanString()
  active?: string; // "true" | "false"

  /** Pagination */
  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(1) @Max(100)
  take?: number = 20;
}