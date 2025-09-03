import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { IsArray, IsDateString, IsEmail, IsNumber, IsOptional, IsString, ArrayNotEmpty } from 'class-validator';
import { EventsService } from './events.service';
import { ImportEventDto } from './import-events.dto';

class CreateEventDto {
  @IsString() customerName!: string;
  @IsDateString() eventDate!: string;

  @IsOptional() @IsString() customerPhone?: string;
  @IsOptional() @IsEmail() customerEmail?: string;
  @IsOptional() @IsString() venue?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() calendarText?: string;

  @IsOptional() @IsNumber() deliveryFee?: number;
  @IsOptional() @IsNumber() serviceFee?: number;

  @IsOptional() @IsNumber() headcountEst?: number;
  @IsOptional() isDelivery?: boolean;

  @IsOptional() @IsString() status?: string;         
  @IsOptional() @IsString() gcalEventId?: string;
}

class CheckEventsDto {
  @IsArray() @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];
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
    return this.svc.checkByGcalIds(dto.ids);
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
  
}