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
exports.CategoryUnitsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let CategoryUnitsService = class CategoryUnitsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(params) {
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
    async create(data) {
        try {
            return await this.prisma.category_unit.create({
                data: {
                    category_id: BigInt(data.categoryId),
                    unit_code: data.unitCode.trim(),
                    hint: data.hint?.trim(),
                },
            });
        }
        catch (e) {
            throw new common_1.BadRequestException(e?.message ?? 'Failed to map category/unit');
        }
    }
};
exports.CategoryUnitsService = CategoryUnitsService;
exports.CategoryUnitsService = CategoryUnitsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoryUnitsService);
