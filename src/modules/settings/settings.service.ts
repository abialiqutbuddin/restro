import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async getChaosSettings() {
        const keys = ['chaos_max_events', 'chaos_max_menus'];
        const configs = await this.prisma.appConfig.findMany({
            where: { key: { in: keys } },
        });

        const map = new Map(configs.map((c) => [c.key, c.value]));

        return {
            maxEvents: parseInt(map.get('chaos_max_events') || '10', 10),
            maxMenus: parseInt(map.get('chaos_max_menus') || '5', 10),
        };
    }

    async updateChaosSettings(maxEvents: number, maxMenus: number) {
        await this.prisma.$transaction([
            this.prisma.appConfig.upsert({
                where: { key: 'chaos_max_events' },
                update: { value: maxEvents.toString() },
                create: { key: 'chaos_max_events', value: maxEvents.toString() },
            }),
            this.prisma.appConfig.upsert({
                where: { key: 'chaos_max_menus' },
                update: { value: maxMenus.toString() },
                create: { key: 'chaos_max_menus', value: maxMenus.toString() },
            }),
        ]);
        return this.getChaosSettings();
    }
}
