import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateMenuItemDto } from './create-menu-items.dto';
import { QueryMenuItemsDto } from './query-menu-items.dto';

@Injectable()
export class MenuItemsService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateMenuItemDto) {
        try {
            const row = await this.prisma.menu_items.create({
                data: {
                    name: dto.name.trim(),
                    description: dto.description ?? null,
                    active: dto.active ?? true,
                },
            });
            return row;
        } catch (e: any) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                // unique constraint (name)
                throw new BadRequestException('A menu item with this name already exists');
            }
            throw e;
        }
    }

    async findMany(query: QueryMenuItemsDto) {
        const where: Prisma.menu_itemsWhereInput = {};

        if (query.q && query.q.trim().length > 0) {
            // rely on DB collation for case-insensitive match
            where.name = { contains: query.q.trim() };
        }

        if (query.active === 'true' || query.active === 'false') {
            where.active = query.active === 'true';
        }

        const [items, total] = await this.prisma.$transaction([
            this.prisma.menu_items.findMany({
                where,
                orderBy: { name: 'asc' },
                skip: query.skip,
                take: query.take,
            }),
            this.prisma.menu_items.count({ where }),
        ]);

        return { total, skip: query.skip ?? 0, take: query.take ?? 20, items };
    }

    async findOne(id: bigint) {
        return this.prisma.menu_items.findUnique({ where: { id } });
    }
}