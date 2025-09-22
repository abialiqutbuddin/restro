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
exports.CustomersService = void 0;
// src/features/customers/customers.service.ts
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let CustomersService = class CustomersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    // ---------- Search / List (server-side, paginated, min chars) ----------
    list(params) {
        const { q = '', skip = 0, take = 20, min = 3 } = params ?? {};
        const trimmed = q.trim();
        const safeTake = Math.min(Math.max(take, 1), 50);
        if (trimmed.length < min) {
            // return empty set when user hasn't typed enough
            return Promise.resolve([]);
        }
        // Case-insensitive for name, plain contains for nullable email/phone
        const where = {
            OR: [
                { name: { contains: trimmed } },
                { email: { contains: trimmed } },
                { phone: { contains: trimmed } },
            ],
        };
        return this.prisma.customers.findMany({
            where,
            orderBy: [{ name: 'asc' }, { id: 'desc' }],
            skip,
            take: safeTake,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
            },
        });
    }
    // ---------- CRUD ----------
    async get(id) {
        const row = await this.prisma.customers.findUnique({
            where: { id: BigInt(id) },
        });
        if (!row)
            throw new common_1.NotFoundException('Customer not found');
        return row;
    }
    create(dto) {
        return this.prisma.customers.create({
            data: {
                name: dto.name,
                email: dto.email ?? null,
                phone: dto.phone ?? null,
                default_venue: dto.defaultVenue ?? null,
                notes: dto.notes ?? null,
            },
        });
    }
    async update(id, dto) {
        await this.get(id);
        return this.prisma.customers.update({
            where: { id: BigInt(id) },
            data: {
                name: dto.name ?? undefined,
                email: dto.email ?? undefined,
                phone: dto.phone ?? undefined,
                default_venue: dto.defaultVenue ?? undefined,
                notes: dto.notes ?? undefined,
            },
        });
    }
    async remove(id) {
        await this.get(id);
        await this.prisma.customers.delete({ where: { id: BigInt(id) } });
        return { success: true };
    }
    // ---------- Relation builder for Events ----------
    async resolveForEvent(args) {
        const { customerId, newCustomer, tx } = args;
        const db = tx ?? this.prisma;
        if (customerId != null) {
            const idBig = BigInt(customerId);
            const exists = await db.customers.findUnique({ where: { id: idBig }, select: { id: true } });
            if (!exists)
                throw new common_1.NotFoundException(`Customer ${customerId} not found`);
            if (newCustomer) {
                const patch = {};
                if (newCustomer.name?.trim())
                    patch.name = newCustomer.name.trim();
                if (newCustomer.email !== undefined)
                    patch.email = newCustomer.email ?? null;
                if (newCustomer.phone !== undefined)
                    patch.phone = newCustomer.phone ?? null;
                if (Object.keys(patch).length) {
                    await db.customers.update({ where: { id: idBig }, data: patch, select: { id: true } });
                }
            }
            return { connect: { id: idBig } };
        }
        if (newCustomer && newCustomer.name?.trim()) {
            const row = await db.customers.create({
                data: {
                    name: newCustomer.name.trim(),
                    email: newCustomer.email ?? null,
                    phone: newCustomer.phone ?? null,
                },
                select: { id: true },
            });
            return { connect: { id: row.id } };
        }
        throw new common_1.BadRequestException('Provide either customerId or newCustomer');
    }
    // ---------- Legacy: get all (keep if you still need it somewhere) ----------
    async listAll() {
        return this.prisma.customers.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, email: true, phone: true },
        });
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
