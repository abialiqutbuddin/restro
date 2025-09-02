import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  list(params: { q?: string; active?: boolean; skip?: number; take?: number }) {
    const { q, active, skip = 0, take = 50 } = params;
    return this.prisma.category.findMany({
      where: {
        ...(typeof active === 'boolean' ? { active } : {}),
        ...(q?.trim()
          ? {
              OR: [
                { name: { contains: q.trim() } },
                { slug: { contains: q.trim() } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    });
  }

  async create(data: { name: string; slug: string; active?: boolean }) {
    try {
      return await this.prisma.category.create({
        data: {
          name: data.name.trim(),
          slug: data.slug.trim(),
          active: data.active ?? true,
        },
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Failed to create category');
    }
  }
}