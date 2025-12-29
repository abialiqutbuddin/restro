import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class SignupDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password!: string;

    @IsString()
    @IsOptional()
    name?: string;

    // Optional: For admin creating user, or initial seed. 
    // Normally signup should default to USER, but let's allow it for now or rely on default in service.
}

export class LoginDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;
}
