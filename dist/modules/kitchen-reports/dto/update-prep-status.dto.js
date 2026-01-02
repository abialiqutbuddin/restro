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
exports.UpdatePrepStatusDto = exports.KitchenPrepStatusEnum = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var KitchenPrepStatusEnum;
(function (KitchenPrepStatusEnum) {
    KitchenPrepStatusEnum["NOT_STARTED"] = "not_started";
    KitchenPrepStatusEnum["IN_PROGRESS"] = "in_progress";
    KitchenPrepStatusEnum["COMPLETED"] = "completed";
})(KitchenPrepStatusEnum || (exports.KitchenPrepStatusEnum = KitchenPrepStatusEnum = {}));
class UpdatePrepStatusDto {
}
exports.UpdatePrepStatusDto = UpdatePrepStatusDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePrepStatusDto.prototype, "eventId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePrepStatusDto.prototype, "menuItemId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePrepStatusDto.prototype, "sizeId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(KitchenPrepStatusEnum),
    __metadata("design:type", String)
], UpdatePrepStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePrepStatusDto.prototype, "notes", void 0);
