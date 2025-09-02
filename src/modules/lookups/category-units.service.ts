import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CategoryUnitsService {
  constructor(private prisma: PrismaService) {}

  list(params: { categoryId?: number; unitCode?: string; skip?: number; take?: number }) {
    const { categoryId, unitCode, skip = 0, take = 100 } = params;
    return this.prisma.category_unit.findMany({
      where: {
        ...(categoryId ? { category_id: BigInt(categoryId) } : {}),
        ...(unitCode ? { unit_code: unitCode } : {}),
      },
      include: {
        category: true,
        pricing_unit: true,
      },
      skip,
      take,
      orderBy: [{ category_id: 'asc' }, { unit_code: 'asc' }],
    });
  }

  async create(data: { categoryId: number; unitCode: string; hint?: string }) {
    try {
      return await this.prisma.category_unit.create({
        data: {
          category_id: BigInt(data.categoryId),
          unit_code: data.unitCode.trim(),
          hint: data.hint?.trim(),
        },
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Failed to map category/unit');
    }
  }
}