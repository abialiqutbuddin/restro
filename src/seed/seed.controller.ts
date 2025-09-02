// src/seed/seed.controller.ts
import { Controller, Post } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('seed')
export class SeedController {
  constructor(private prisma: PrismaService) {}

  @Post('basic')
  async basic() {
    // Pricing Units
    await this.prisma.pricing_unit.createMany({
      data: [
        { code: 'per_thaal',  label: 'Per Thaal',  qty_label: 'thaals' },
        { code: 'per_size',   label: 'Per Size',   qty_label: 'sizes' },
        { code: 'per_person', label: 'Per Person', qty_label: 'persons' },
        { code: 'per_tray',   label: 'Per Tray',   qty_label: 'trays' },
      ],
      skipDuplicates: true,
    });

    // Categories
    const cats = await Promise.all([
      this.prisma.category.upsert({
        where: { slug: 'thaal' },
        update: {},
        create: { name: 'Thaal', slug: 'thaal', active: true },
      }),
      this.prisma.category.upsert({
        where: { slug: 'thaali' },
        update: {},
        create: { name: 'Thaali', slug: 'thaali', active: true },
      }),
      this.prisma.category.upsert({
        where: { slug: 'live-bbq' },
        update: {},
        create: { name: 'Live BBQ', slug: 'live-bbq', active: true },
      }),
      this.prisma.category.upsert({
        where: { slug: 'party-tray' },
        update: {},
        create: { name: 'Party Tray', slug: 'party-tray', active: true },
      }),
      this.prisma.category.upsert({
        where: { slug: 'buffet' },
        update: {},
        create: { name: 'Buffet', slug: 'buffet', active: true },
      }),
    ]);

    // Sizes (common)
    await this.prisma.sizes.createMany({
      data: [
        { name: 'Small' },
        { name: 'Medium' },
        { name: 'Large' },
        { name: 'X Large' },
        { name: 'X Small' },
        { name: 'Full' },
        { name: 'Half' },
      ],
      skipDuplicates: true,
    });

    // Category-Unit mappings (examples)
    const bySlug = (s: string) => cats.find(c => c.slug === s)!;
    await this.prisma.category_unit.createMany({
      data: [
        { category_id: bySlug('thaal').id,     unit_code: 'per_thaal' },
        { category_id: bySlug('thaali').id,    unit_code: 'per_size',  hint: 'Small/Medium/Large' },
        { category_id: bySlug('live-bbq').id,  unit_code: 'per_person' },
        { category_id: bySlug('party-tray').id,unit_code: 'per_tray'   },
        { category_id: bySlug('buffet').id,    unit_code: 'per_person' },
      ],
      skipDuplicates: true,
    });

    return { ok: true };
  }
}