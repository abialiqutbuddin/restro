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
exports.SquareController = void 0;
const common_1 = require("@nestjs/common");
const square_service_1 = require("./square.service");
let SquareController = class SquareController {
    constructor(squareService) {
        this.squareService = squareService;
    }
    async getCustomers() {
        return this.squareService.fetchAllCustomers();
    }
};
exports.SquareController = SquareController;
__decorate([
    (0, common_1.Get)('customers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SquareController.prototype, "getCustomers", null);
exports.SquareController = SquareController = __decorate([
    (0, common_1.Controller)('square'),
    __metadata("design:paramtypes", [square_service_1.SquareService])
], SquareController);
