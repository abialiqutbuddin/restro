import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SizesService {
  constructor(private prisma: PrismaService) {}

  list(params: { q?: string; active?: boolean; skip?: number; take?: number }) {
    const { q, active, skip = 0, take = 100 } = params;
    return this.prisma.sizes.findMany({
      where: {
        ...(typeof active === 'boolean' ? { active } : {}),
        ...(q?.trim()
          ? { name: { contains: q.trim() } }
          : {}),
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    });
  }

  async create(data: { name: string; description?: string; active?: boolean }) {
    try {
      return await this.prisma.sizes.create({
        data: {
          name: data.name.trim(),
          description: data.description?.trim(),
          active: data.active ?? true,
        },
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Failed to create size');
    }
  }
}