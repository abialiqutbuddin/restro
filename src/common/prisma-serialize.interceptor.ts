// src/common/interceptors/prisma-serialize.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Optional: only if you want to special-case Prisma Decimal
// (in Prisma v6 Runtime)
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PrismaSerializeInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => sanitize(data)));
  }
}

/** Recursively convert BigInt/Decimal to JSON-safe values. */
function sanitize(value: any): any {
  if (value === null || value === undefined) return value;

  // BigInt -> string (safer than number to avoid precision loss)
  if (typeof value === 'bigint') return value.toString();

  // Prisma Decimal -> string (or Number(value) if you prefer)
  if (isPrismaDecimal(value)) return value.toString();

  if (Array.isArray(value)) return value.map(sanitize);

  if (isPlainObject(value)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitize(v);
    }
    return out;
  }

  return value;
}

function isPlainObject(v: any): v is Record<string, any> {
  return typeof v === 'object' && v !== null && v.constructor === Object;
}

function isPrismaDecimal(v: any): v is Decimal {
  // Works for Prisma Decimal in v6 runtime
  return typeof v === 'object' && v !== null && typeof v.toString === 'function' && v.constructor?.name === 'Decimal';
}