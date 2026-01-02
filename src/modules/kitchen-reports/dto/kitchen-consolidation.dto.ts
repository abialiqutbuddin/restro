import { IsOptional, IsDateString, IsString, IsBoolean, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class KitchenConsolidationQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  date?: string; // Single date option

  @IsOptional()
  @IsString()
  eventType?: string; // Filter by event type (wedding, corporate, etc.)

  @IsOptional()
  @IsString()
  timeWindow?: string; // e.g., "morning", "afternoon", "evening"

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeClientName?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  showEventBreakdown?: boolean; // Optional event breakdown in output

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(id => id.trim());
    }
    return value;
  })
  eventIds?: string[]; // Filter by specific event IDs
}
