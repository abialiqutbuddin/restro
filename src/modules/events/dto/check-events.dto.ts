// src/events/dto/check-events.dto.ts
import {
  IsArray,
  IsOptional,
  IsString,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GoogleEventLiteDto {
  @IsString()
  id!: string; // Google Calendar eventId

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class CheckEventsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[]; // Google Calendar eventIds

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoogleEventLiteDto)
  events?: GoogleEventLiteDto[];
}