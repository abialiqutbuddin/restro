import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(params: { skip?: number; take?: number; role?: Role; is_active?: boolean }) {
        const { skip = 0, take = 50, role, is_active } = params;

        const where: any = {};
        if (role) where.role = role;
        if (is_active !== undefined) where.is_active = is_active;

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

    async findOne(id: bigint) {
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
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return {
            ...user,
            id: user.id.toString(),
        };
    }

    async create(dto: CreateUserDto) {
        // Check if email already exists
        const existing = await this.prisma.users.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.users.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
                role: dto.role || Role.STAFF,
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

    async update(id: bigint, dto: UpdateUserDto) {
        // Check if user exists
        const existing = await this.prisma.users.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        // If email is being changed, check for conflicts
        if (dto.email && dto.email !== existing.email) {
            const emailExists = await this.prisma.users.findUnique({
                where: { email: dto.email },
            });
            if (emailExists) {
                throw new ConflictException('User with this email already exists');
            }
        }

        const updateData: any = {};
        if (dto.email) updateData.email = dto.email;
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.role) updateData.role = dto.role;
        if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
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

    async remove(id: bigint) {
        const existing = await this.prisma.users.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        await this.prisma.users.delete({
            where: { id },
        });

        return { success: true };
    }

    async toggleActive(id: bigint) {
        const existing = await this.prisma.users.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`User with ID ${id} not found`);
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


    async bulkDelete(ids: string[]) {
        return this.prisma.users.deleteMany({
            where: {
                id: { in: ids.map((id) => BigInt(id)) },
            },
        });
    }

    async bulkDeactivate(ids: string[]) {
        return this.prisma.users.updateMany({
            where: {
                id: { in: ids.map((id) => BigInt(id)) },
            },
            data: { is_active: false },
        });
    }
}
