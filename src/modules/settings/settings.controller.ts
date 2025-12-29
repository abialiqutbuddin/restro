import { Body, Controller, Get, Patch } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
    constructor(private service: SettingsService) { }

    @Get('chaos')
    async getChaos() {
        return this.service.getChaosSettings();
    }

    @Patch('chaos')
    async updateChaos(@Body() body: { maxEvents: number; maxMenus: number }) {
        return this.service.updateChaosSettings(body.maxEvents, body.maxMenus);
    }
}
