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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let SettingsService = class SettingsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getChaosSettings() {
        const keys = ['chaos_max_events', 'chaos_max_menus'];
        const configs = await this.prisma.appconfig.findMany({
            where: { key: { in: keys } },
        });
        const map = new Map(configs.map((c) => [c.key, c.value]));
        return {
            maxEvents: parseInt(map.get('chaos_max_events') || '10', 10),
            maxMenus: parseInt(map.get('chaos_max_menus') || '5', 10),
        };
    }
    async updateChaosSettings(maxEvents, maxMenus) {
        await this.prisma.$transaction([
            this.prisma.appconfig.upsert({
                where: { key: 'chaos_max_events' },
                update: { value: maxEvents.toString() },
                create: { key: 'chaos_max_events', value: maxEvents.toString() },
            }),
            this.prisma.appconfig.upsert({
                where: { key: 'chaos_max_menus' },
                update: { value: maxMenus.toString() },
                create: { key: 'chaos_max_menus', value: maxMenus.toString() },
            }),
        ]);
        return this.getChaosSettings();
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
