"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const client_1 = require("@prisma/client");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(params) {
        const { skip = 0, take = 50, role, is_active } = params;
        const where = {};
        if (role)
            where.role = role;
        if (is_active !== undefined)
            where.is_active = is_active;
        const [users, total] = await Promise.all([
            this.prisma.users.findMany({
                where,
                skip,
                take,
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    is_active: true,
                    created_at: true,
                    updated_at: true,
                },
            }),
            this.prisma.users.count({ where }),
        ]);
        return {
            items: users.map(u => ({
                ...u,
                id: u.id.toString(),
            })),
            total,
        };
    }
    async findOne(id) {
        const user = await this.prisma.users.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                is_active: true,
                created_at: true,
                updated_at: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return {
            ...user,
            id: user.id.toString(),
        };
    }
    async create(dto) {
        // Check if email already exists
        const existing = await this.prisma.users.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.users.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
                role: dto.role || client_1.Role.STAFF,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                is_active: true,
                created_at: true,
            },
        });
        return {
            ...user,
            id: user.id.toString(),
        };
    }
    async update(id, dto) {
        // Check if user exists
        const existing = await this.prisma.users.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        // If email is being changed, check for conflicts
        if (dto.email && dto.email !== existing.email) {
            const emailExists = await this.prisma.users.findUnique({
                where: { email: dto.email },
            });
            if (emailExists) {
                throw new common_1.ConflictException('User with this email already exists');
            }
        }
        const updateData = {};
        if (dto.email)
            updateData.email = dto.email;
        if (dto.name !== undefined)
            updateData.name = dto.name;
        if (dto.role)
            updateData.role = dto.role;
        if (dto.is_active !== undefined)
            updateData.is_active = dto.is_active;
        if (dto.password) {
            updateData.password = await bcrypt.hash(dto.password, 10);
        }
        const user = await this.prisma.users.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                is_active: true,
                created_at: true,
                updated_at: true,
            },
        });
        return {
            ...user,
            id: user.id.toString(),
        };
    }
    async remove(id) {
        const existing = await this.prisma.users.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        await this.prisma.users.delete({
            where: { id },
        });
        return { success: true };
    }
    async toggleActive(id) {
        const existing = await this.prisma.users.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        const user = await this.prisma.users.update({
            where: { id },
            data: { is_active: !existing.is_active },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                is_active: true,
            },
        });
        return {
            ...user,
            id: user.id.toString(),
        };
    }
    async bulkDelete(ids) {
        return this.prisma.users.deleteMany({
            where: {
                id: { in: ids.map((id) => BigInt(id)) },
            },
        });
    }
    async bulkDeactivate(ids) {
        return this.prisma.users.updateMany({
            where: {
                id: { in: ids.map((id) => BigInt(id)) },
            },
            data: { is_active: false },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
