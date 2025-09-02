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
exports.PricingUnitsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let PricingUnitsService = class PricingUnitsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(params) {
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
    async create(data) {
        try {
            return await this.prisma.pricing_unit.create({
                data: {
                    code: data.code.trim(),
                    label: data.label.trim(),
                    qty_label: data.qty_label.trim(),
                },
            });
        }
        catch (e) {
            throw new common_1.BadRequestException(e?.message ?? 'Failed to create pricing unit');
        }
    }
};
exports.PricingUnitsService = PricingUnitsService;
exports.PricingUnitsService = PricingUnitsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PricingUnitsService);
