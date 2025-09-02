"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuItemsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../database/prisma.service");
let MenuItemsService = class MenuItemsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        try {
            const row = await this.prisma.menu_items.create({
                data: {
                    name: dto.name.trim(),
                    description: dto.description ?? null,
                    active: dto.active ?? true,
                },
            });
            return row;
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                // unique constraint (name)
                throw new common_1.BadRequestException('A menu item with this name already exists');
            }
            throw e;
        }
    }
    async findMany(query) {
        const where = {};
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
    async findOne(id) {
        return this.prisma.menu_items.findUnique({ where: { id } });
    }
};
exports.MenuItemsService = MenuItemsService;
exports.MenuItemsService = MenuItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MenuItemsService);
