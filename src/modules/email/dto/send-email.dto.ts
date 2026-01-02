// src/email/dto/send-email.dto.ts
import {
  IsArray,
  IsBase64,
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class SendEmailDto {
  @IsString()
  subject!: string;

  // to: string | string[]  -> normalize to string[]
  @Transform(({ value }) => {
    if (value == null || value === '') return [];
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsEmail({}, { each: true })
  to!: string[];

  // cc: string | string[] -> normalize to string[] (optional)
  @Transform(({ value }) => {
    if (value == null || value === '') return undefined; // remain optional
    return Array.isArray(value) ? value : [value];
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  html?: string;

  // Strip possible data URL prefix and validate base64
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/^data:application\/pdf;base64,/, '') : value
  )
  @IsOptional()
  @IsBase64()
  pdfBase64?: string;

  @IsOptional()
  @IsString()
  pdfFilename?: string; // default: attachment.pdf
}