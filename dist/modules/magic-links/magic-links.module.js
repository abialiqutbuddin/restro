"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MagicLinksModule = void 0;
const common_1 = require("@nestjs/common");
const magic_links_controller_1 = require("./magic-links.controller");
const magic_links_service_1 = require("./magic-links.service");
const prisma_module_1 = require("../../database/prisma.module");
const events_module_1 = require("../events/events.module");
let MagicLinksModule = class MagicLinksModule {
};
exports.MagicLinksModule = MagicLinksModule;
exports.MagicLinksModule = MagicLinksModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, events_module_1.EventsModule],
        controllers: [magic_links_controller_1.MagicLinksController],
        providers: [magic_links_service_1.MagicLinksService],
        exports: [magic_links_service_1.MagicLinksService],
    })
], MagicLinksModule);
