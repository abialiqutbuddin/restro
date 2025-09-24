import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { IsArray, IsDateString, IsEmail, IsNumber, IsOptional, IsString, ArrayNotEmpty, ValidateNested } from 'class-validator';
import { EventsService } from './events.service';
import { ImportEventDto } from './import-events.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { Type } from 'class-transformer'; // <-- important

class GoogleEventLiteDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  description?: string; // <-- drop "| null"
}

class CheckEventsDto {
  @IsArray() @ArrayNotEmpty()
  ids!: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoogleEventLiteDto)
  events?: GoogleEventLiteDto[];
}


@Controller('events')
export class EventsController {
  constructor(private readonly svc: EventsService) { }

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.svc.create(dto);
  }

  @Post('import')
  import(@Body() dto: ImportEventDto) {
    return this.svc.importEventTree(dto);
  }

  /** POST /api/events/check  → { "<id>": { exists: boolean, status?: string } } */
@Post('check')
check(@Body() dto: CheckEventsDto) {
  const map = Object.fromEntries(
    (dto.events ?? []).map(e => [
      e.id,
      e.description == null ? {} : { description: e.description } // omit when null
    ])
  ) as Record<string, { description?: string }>;

  return this.svc.checkByGcalIds(dto.ids, map);
}

  /** Optional convenience: GET /api/events/by-gcal/:id */
  @Get('by-gcal/:id')
  getByGcal(@Param('id') id: string) {
    return this.svc.getByGcalId(id);
  }

  /** GET /api/events/:id → single row (no deep relations) */
  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getById(id);
  }

  /** GET /api/events/:id/tree → full nested tree */
  @Get(':id/tree')
  getTreeById(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getTreeById(id);
  }

  @Get(':id/view')
  getEventView(@Param('id') id: string) {
    return this.svc.getEventView(id);
  }

  @Delete('by-gcal/:gcalId')
  async deleteByGcal(@Param('gcalId') gcalId: string) {
    return this.svc.deleteByGcalId(gcalId);
  }

}