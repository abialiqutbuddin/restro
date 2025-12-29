import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'supersecret',
        });
    }

    async validate(payload: any) {
        // Payload contains sub (user id), email, role
        // We can return more info if needed, checking db again ensures user still exists/active
        return { userId: payload.sub, email: payload.email, role: payload.role };
    }
}
