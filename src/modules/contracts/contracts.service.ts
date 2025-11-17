import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventBillingType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractEventsQueryDto } from './dto/contract-events-query.dto';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  list(customerId?: number) {
    return this.prisma.contracts.findMany({
      where: customerId != null ? { customer_id: BigInt(customerId) } : undefined,
      orderBy: { created_at: 'desc' },
      include: { customer: true },
    });
  }

  async get(id: number) {
    return this.ensureContract(id);
  }

  async create(dto: CreateContractDto) {
    const customerId = BigInt(dto.customerId);
    await this.ensureCustomer(customerId);

    return this.prisma.contracts.create({
      data: {
        customer_id: customerId,
        name: dto.name,
        code: dto.code,
        billing_cycle: dto.billingCycle ?? 'monthly',
        start_date: new Date(dto.startDate),
        end_date: dto.endDate ? new Date(dto.endDate) : null,
        is_active: dto.isActive ?? true,
        notes: dto.notes ?? null,
      },
      include: { customer: true },
    });
  }

  async update(id: number, dto: UpdateContractDto) {
    await this.ensureContract(id);
    return this.prisma.contracts.update({
      where: { id: BigInt(id) },
      data: {
        name: dto.name ?? undefined,
        code: dto.code ?? undefined,
        billing_cycle: dto.billingCycle ?? undefined,
        start_date: dto.startDate ? new Date(dto.startDate) : undefined,
        end_date: dto.endDate ? new Date(dto.endDate) : undefined,
        is_active: dto.isActive ?? undefined,
        notes: dto.notes ?? undefined,
      },
      include: { customer: true },
    });
  }

  async getBillableEvents(contractId: number, query: ContractEventsQueryDto) {
    await this.ensureContract(contractId);

    const where: Prisma.eventsWhereInput = {
      contract_id: BigInt(contractId),
      billing_type: EventBillingType.contract,
    };

    if (query.billingStatus) {
      where.billing_status = query.billingStatus;
    }

    if (query.start || query.end) {
      where.event_datetime = {};
      if (query.start) where.event_datetime.gte = new Date(query.start);
      if (query.end) where.event_datetime.lt = new Date(query.end);
    }

    const include: Prisma.eventsInclude = {
      customer: true,
      contract: true,
    };

    if (query.includeInvoice) {
      include.invoiceEvents = {
        include: { invoice: true },
      };
    }

    return this.prisma.events.findMany({
      where,
      orderBy: { event_datetime: 'asc' },
      include,
    });
  }

  private async ensureCustomer(id: bigint) {
    const customer = await this.prisma.customers.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!customer) {
      throw new BadRequestException(`Customer ${id.toString()} not found`);
    }
  }

  private async ensureContract(id: number) {
    const contract = await this.prisma.contracts.findUnique({
      where: { id: BigInt(id) },
      include: { customer: true },
    });
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);
    return contract;
  }
}
