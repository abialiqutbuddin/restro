import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PricingUnitsService {
  constructor(private prisma: PrismaService) {}

  list(params: { q?: string; skip?: number; take?: number }) {
    const { q, skip = 0, take = 100 } = params;
    return this.prisma.pricing_unit.findMany({
      where: q?.trim()
        ? {
            OR: [
              { code: { contains: q.trim() } },
              { label: { contains: q.trim() } },
              { qty_label: { contains: q.trim() } },
            ],
          }
        : undefined,
      orderBy: { code: 'asc' },
      skip,
      take,
    });
  }

  async create(data: { code: string; label: string; qty_label: string }) {
    try {
      return await this.prisma.pricing_unit.create({
        data: {
          code: data.code.trim(),
          label: data.label.trim(),
          qty_label: data.qty_label.trim(),
        },
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Failed to create pricing unit');
    }
  }
}