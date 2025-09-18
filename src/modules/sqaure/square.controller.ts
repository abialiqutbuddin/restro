import { Controller, Get } from '@nestjs/common';
import { SquareService } from './square.service';

@Controller('square')
export class SquareController {
  constructor(private readonly squareService: SquareService) {}

  @Get('customers')
  async getCustomers() {
    return this.squareService.fetchAllCustomers();
  }
}