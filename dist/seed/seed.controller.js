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
exports.SeedController = void 0;
// src/seed/seed.controller.ts
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let SeedController = class SeedController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async basic() {
        // Pricing Units
        await this.prisma.pricing_unit.createMany({
            data: [
                { code: 'per_thaal', label: 'Per Thaal', qty_label: 'thaals' },
                { code: 'per_size', label: 'Per Size', qty_label: 'sizes' },
                { code: 'per_person', label: 'Per Person', qty_label: 'persons' },
                { code: 'per_tray', label: 'Per Tray', qty_label: 'trays' },
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
        const bySlug = (s) => cats.find(c => c.slug === s);
        await this.prisma.category_unit.createMany({
            data: [
                { category_id: bySlug('thaal').id, unit_code: 'per_thaal' },
                { category_id: bySlug('thaali').id, unit_code: 'per_size', hint: 'Small/Medium/Large' },
                { category_id: bySlug('live-bbq').id, unit_code: 'per_person' },
                { category_id: bySlug('party-tray').id, unit_code: 'per_tray' },
                { category_id: bySlug('buffet').id, unit_code: 'per_person' },
            ],
            skipDuplicates: true,
        });
        return { ok: true };
    }
};
exports.SeedController = SeedController;
__decorate([
    (0, common_1.Post)('basic'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "basic", null);
exports.SeedController = SeedController = __decorate([
    (0, common_1.Controller)('seed'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SeedController);
