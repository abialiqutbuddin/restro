import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsObject,
  IsArray,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  invoiceNumber!: string;   // <-- definite assignment assertion

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  status?: string = 'ISSUED';

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsObject()
  company!: Record<string, any>;

  @IsString()
  currencyCode!: string;

  @IsNumber()
  taxRate!: number;

  @IsOptional()
  @IsNumber()
  discount: number = 0;

  @IsOptional()
  @IsNumber()
  shipping: number = 0;

  @IsOptional()
  @IsBoolean()
  isTaxExempt: boolean = false;

  @IsOptional()
  @IsString()
  paymentInstr?: string;

  @IsNumber()
  subtotal!: number;

  @IsNumber()
  tax!: number;

  @IsNumber()
  total!: number;

  @IsObject()
  envelope!: Record<string, any>;

  @IsObject()
  eventLines!: Record<string, any>;

  @IsArray()
  items!: any[];
}