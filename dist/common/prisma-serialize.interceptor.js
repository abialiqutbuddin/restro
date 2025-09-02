"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaSerializeInterceptor = void 0;
// src/common/interceptors/prisma-serialize.interceptor.ts
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let PrismaSerializeInterceptor = class PrismaSerializeInterceptor {
    intercept(_ctx, next) {
        return next.handle().pipe((0, operators_1.map)((data) => sanitize(data)));
    }
};
exports.PrismaSerializeInterceptor = PrismaSerializeInterceptor;
exports.PrismaSerializeInterceptor = PrismaSerializeInterceptor = __decorate([
    (0, common_1.Injectable)()
], PrismaSerializeInterceptor);
/** Recursively convert BigInt/Decimal to JSON-safe values. */
function sanitize(value) {
    if (value === null || value === undefined)
        return value;
    // BigInt -> string (safer than number to avoid precision loss)
    if (typeof value === 'bigint')
        return value.toString();
    // Prisma Decimal -> string (or Number(value) if you prefer)
    if (isPrismaDecimal(value))
        return value.toString();
    if (Array.isArray(value))
        return value.map(sanitize);
    if (isPlainObject(value)) {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = sanitize(v);
        }
        return out;
    }
    return value;
}
function isPlainObject(v) {
    return typeof v === 'object' && v !== null && v.constructor === Object;
}
function isPrismaDecimal(v) {
    // Works for Prisma Decimal in v6 runtime
    return typeof v === 'object' && v !== null && typeof v.toString === 'function' && v.constructor?.name === 'Decimal';
}
