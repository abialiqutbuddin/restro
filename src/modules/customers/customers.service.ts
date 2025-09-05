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

type BuildRelArgs = {
    /** If provided, will connect to this existing customer (error if missing). */
    customerId?: number | null;
    /** If provided (and no id), will create or dedupe-connect by email/phone. */
    newCustomer?: NewCustomer | null;
    /** Optional transaction client when called inside $transaction */
    tx?: TxLike;
};

type CustomerRelation =
    | { connect: { id: bigint } }
    | { create: { name: string; email?: string | null; phone?: string | null } }
    | {
        connectOrCreate: {
            where: Prisma.customersWhereUniqueInput;
            create: { name: string; email?: string | null; phone?: string | null };
        };
    };

@Injectable()
export class CustomersService {
    constructor(private prisma: PrismaService) { }

    // ---------- List / Read / Write ----------

    list(params?: { q?: string; skip?: number; take?: number }) {
        const { q, skip = 0, take = 50 } = params ?? {};

        // Build a properly typed where clause (without `mode`)
        const where: Prisma.customersWhereInput | undefined = q
            ? {
                OR: [
                    { name: { contains: q } },
                    { email: { contains: q } },   // StringNullableFilter is fine without `mode`
                    { phone: { contains: q } },   // StringNullableFilter is fine without `mode`
                ],
            }
            : undefined;

        return this.prisma.customers.findMany({
            where,
            orderBy: { id: 'desc' },
            skip,
            take,
        });
    }

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

    /**
 * Resolve a customer relation for events:
 * - If customerId: optionally patch (name/phone/email) then connect by id
 * - Else if newCustomer: always create a new row and connect
 */
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

    // Optional patch if caller provided fields
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

    //GET ALL CUSTOMER LIST
    async listAll() {
        return this.prisma.customers.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
            },
        });
    }

}