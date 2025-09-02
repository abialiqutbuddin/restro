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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingUnitsController = void 0;
const common_1 = require("@nestjs/common");
const pricing_units_service_1 = require("./pricing-units.service");
const create_pricing_unit_dto_1 = require("./dto/create-pricing-unit.dto");
let PricingUnitsController = class PricingUnitsController {
    constructor(svc) {
        this.svc = svc;
    }
    list(q, skip, take) {
        return this.svc.list({
            q,
            skip: skip ? Number(skip) : 0,
            take: take ? Number(take) : 100,
        });
    }
    create(dto) {
        return this.svc.create(dto);
    }
};
exports.PricingUnitsController = PricingUnitsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('skip')),
    __param(2, (0, common_1.Query)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], PricingUnitsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_pricing_unit_dto_1.CreatePricingUnitDto]),
    __metadata("design:returntype", void 0)
], PricingUnitsController.prototype, "create", null);
exports.PricingUnitsController = PricingUnitsController = __decorate([
    (0, common_1.Controller)('pricing-units'),
    __metadata("design:paramtypes", [pricing_units_service_1.PricingUnitsService])
], PricingUnitsController);
