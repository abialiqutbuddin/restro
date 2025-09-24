// src/modules/gcal/dto/create-gcal-event.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class CreateGcalEventDto {
  @IsString() summary!: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;

  // Accept either "YYYY-MM-DD" (all-day) or ISO string
  @IsString() start!: string;
  @IsString() end!: string;

  @IsOptional() @IsString() timeZone?: string;   // e.g. "America/Chicago"
  @IsOptional() @IsString() calendarId?: string; // default: "primary"
}