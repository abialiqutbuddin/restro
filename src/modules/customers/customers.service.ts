// src/features/customers/customers.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customers.dto';

type TxLike = Prisma.TransactionClient | PrismaClient;

type NewCustomer = {
  name: string;
  email?: string | null;
  phone?: string | null;
};

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // ---------- Search / List (server-side, paginated, min chars) ----------
  list(params?: { q?: string; skip?: number; take?: number; min?: number }) {
    const { q = '', skip = 0, take = 20, min = 3 } = params ?? {};

    const trimmed = q.trim();
    const safeTake = Math.min(Math.max(take, 1), 50);

    if (trimmed.length < min) {
      // return empty set when user hasn't typed enough
      return Promise.resolve([] as Array<{
        id: bigint; name: string; email: string | null; phone: string | null;
      }>);
    }

    // Case-insensitive for name, plain contains for nullable email/phone
    const where: Prisma.customersWhereInput = {
      OR: [
        { name:  { contains: trimmed } },
        { email: { contains: trimmed } },
        { phone: { contains: trimmed } },
      ],
    };

    return this.prisma.customers.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'desc' }],
      skip,
      take: safeTake,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });
  }

  // ---------- CRUD ----------
  async get(id: number) {
    const row = await this.prisma.customers.findUnique({
      where: { id: BigInt(id) },
    });
    if (!row) throw new NotFoundException('Customer not found');
    return row;
  }

  create(dto: CreateCustomerDto) {
    return this.prisma.customers.create({
      data: {
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        default_venue: dto.defaultVenue ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.get(id);
    return this.prisma.customers.update({
      where: { id: BigInt(id) },
      data: {
        name: dto.name ?? undefined,
        email: dto.email ?? undefined,
        phone: dto.phone ?? undefined,
        default_venue: dto.defaultVenue ?? undefined,
        notes: dto.notes ?? undefined,
      },
    });
  }

  async remove(id: number) {
    await this.get(id);
    await this.prisma.customers.delete({ where: { id: BigInt(id) } });
    return { success: true };
  }

  // ---------- Relation builder for Events ----------
  async resolveForEvent(args: {
    customerId?: number | null;
    newCustomer?: { name: string; email?: string | null; phone?: string | null } | null;
    tx?: TxLike;
  }): Promise<{ connect: { id: bigint } }> {
    const { customerId, newCustomer, tx } = args;
    const db: TxLike = (tx as TxLike) ?? this.prisma;

    if (customerId != null) {
      const idBig = BigInt(customerId);
      const exists = await db.customers.findUnique({ where: { id: idBig }, select: { id: true } });
      if (!exists) throw new NotFoundException(`Customer ${customerId} not found`);

      if (newCustomer) {
        const patch: any = {};
        if (newCustomer.name?.trim()) patch.name = newCustomer.name.trim();
        if (newCustomer.email !== undefined) patch.email = newCustomer.email ?? null;
        if (newCustomer.phone !== undefined) patch.phone = newCustomer.phone ?? null;

        if (Object.keys(patch).length) {
          await db.customers.update({ where: { id: idBig }, data: patch, select: { id: true } });
        }
      }
      return { connect: { id: idBig } };
    }

    if (newCustomer && newCustomer.name?.trim()) {
      const row = await db.customers.create({
        data: {
          name: newCustomer.name.trim(),
          email: newCustomer.email ?? null,
          phone: newCustomer.phone ?? null,
        },
        select: { id: true },
      });
      return { connect: { id: row.id } };
    }

    throw new BadRequestException('Provide either customerId or newCustomer');
  }

  // ---------- Legacy: get all (keep if you still need it somewhere) ----------
  async listAll() {
    return this.prisma.customers.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, phone: true },
    });
  }
}