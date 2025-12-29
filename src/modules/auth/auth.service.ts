import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { SignupDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async signup(signupDto: SignupDto) {
        const { email, password, name } = signupDto;

        const existingUser = await this.prisma.users.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await this.prisma.users.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: Role.USER, // Default role
            },
        });

        return {
            message: 'User created successfully',
            user: {
                id: user.id.toString(),
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        const user = await this.prisma.users.findUnique({
            where: { email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = { sub: user.id.toString(), email: user.email, role: user.role };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id.toString(),
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }
}
