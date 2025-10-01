import { IsOptional, IsArray, IsString, IsInt, IsISO8601 } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class InvoiceQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // Accept ?eventIds=a&eventIds=b OR ?eventIds=a,b
    if (Array.isArray(value)) {
      return value
        .flatMap(v => String(v).split(','))
        .map(s => s.trim())
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  })
  eventIds?: string[];      // gcal ids come as strings

  @IsOptional() @Type(() => Number) @IsInt()
  customerId?: number;

  @IsOptional() @IsISO8601()
  start?: string;

  @IsOptional() @IsISO8601()
  end?: string;

  @IsOptional()
  includeEvents?: string;   // "true"/"false"
}