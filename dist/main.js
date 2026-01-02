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
Object.defineProperty(exports, "__esModule", { value: true });
// src/main.ts
require("reflect-metadata");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const prisma_serialize_interceptor_1 = require("./common/prisma-serialize.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // Global API prefix
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new prisma_serialize_interceptor_1.PrismaSerializeInterceptor());
    // CORS for Flutter Web (dev) + room for prod via env
    // In dev you can allow any localhost port; in prod, set CORS_ORIGINS to a CSV.
    const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',')
        .map(s => s.trim())
        .filter(Boolean);
    app.enableCors({
        origin: corsOrigins.length > 0
            ? corsOrigins
            : true, // Allow all origins in dev (for Flutter mobile apps)
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        maxAge: 600,
    });
    // Validation
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port, '0.0.0.0', () => console.log(`Listening on ${port}`));
}
bootstrap();
