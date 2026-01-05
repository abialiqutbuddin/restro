import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { Role } from '@prisma/client';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    async findAll(
        @Query('skip') skip?: number,
        @Query('take') take?: number,
        @Query('role') role?: Role,
        @Query('is_active') isActive?: string,
    ) {
        return this.usersService.findAll({
            skip: skip ? Number(skip) : undefined,
            take: take ? Number(take) : undefined,
            role,
            is_active: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        });
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.usersService.findOne(BigInt(id));
    }

    @Post()
    async create(@Body() dto: CreateUserDto) {
        return this.usersService.create(dto);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return this.usersService.update(BigInt(id), dto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.usersService.remove(BigInt(id));
    }

    @Patch(':id/toggle-active')
    async toggleActive(@Param('id') id: string) {
        return this.usersService.toggleActive(BigInt(id));
    }

    @Post('bulk-delete')
    async bulkDelete(@Body('ids') ids: string[]) {
        return this.usersService.bulkDelete(ids);
    }

    @Patch('bulk-deactivate')
    async bulkDeactivate(@Body('ids') ids: string[]) {
        return this.usersService.bulkDeactivate(ids);
    }
}
