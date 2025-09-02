"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LookupsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const categories_controller_1 = require("./categories.controller");
const categories_service_1 = require("./categories.service");
const sizes_controller_1 = require("./sizes.controller");
const sizes_service_1 = require("./sizes.service");
const pricing_units_controller_1 = require("./pricing-units.controller");
const pricing_units_service_1 = require("./pricing-units.service");
const category_units_controller_1 = require("./category-units.controller");
const category_units_service_1 = require("./category-units.service");
let LookupsModule = class LookupsModule {
};
exports.LookupsModule = LookupsModule;
exports.LookupsModule = LookupsModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            categories_controller_1.CategoriesController,
            sizes_controller_1.SizesController,
            pricing_units_controller_1.PricingUnitsController,
            category_units_controller_1.CategoryUnitsController,
        ],
        providers: [
            prisma_service_1.PrismaService,
            categories_service_1.CategoriesService,
            sizes_service_1.SizesService,
            pricing_units_service_1.PricingUnitsService,
            category_units_service_1.CategoryUnitsService,
        ],
        exports: [
            categories_service_1.CategoriesService,
            sizes_service_1.SizesService,
            pricing_units_service_1.PricingUnitsService,
            category_units_service_1.CategoryUnitsService,
        ],
    })
], LookupsModule);
