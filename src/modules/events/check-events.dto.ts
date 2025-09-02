// src/events/dto/check-events.dto.ts
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class CheckEventsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[]; // Google Calendar eventIds
}