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
exports.UpdatePaymentDto = exports.CreatePaymentDto = exports.PaymentStatusDto = exports.PaymentMethodDto = void 0;
// src/modules/payments/dto/payments.dto.ts
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var PaymentMethodDto;
(function (PaymentMethodDto) {
    PaymentMethodDto["cash"] = "cash";
    PaymentMethodDto["cheque"] = "cheque";
    PaymentMethodDto["credit"] = "credit";
    PaymentMethodDto["others"] = "others";
})(PaymentMethodDto || (exports.PaymentMethodDto = PaymentMethodDto = {}));
var PaymentStatusDto;
(function (PaymentStatusDto) {
    PaymentStatusDto["pending"] = "pending";
    PaymentStatusDto["succeeded"] = "succeeded";
    PaymentStatusDto["failed"] = "failed";
    PaymentStatusDto["refunded"] = "refunded";
})(PaymentStatusDto || (exports.PaymentStatusDto = PaymentStatusDto = {}));
class CreatePaymentDto {
}
exports.CreatePaymentDto = CreatePaymentDto;
__decorate([
    (0, class_validator_1.IsEnum)(PaymentMethodDto),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreatePaymentDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['USD', 'PKR', 'AED', 'EUR', 'GBP']),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "paidAt", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.method === PaymentMethodDto.credit),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "squareId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "notes", void 0);
class UpdatePaymentDto {
}
exports.UpdatePaymentDto = UpdatePaymentDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PaymentMethodDto),
    __metadata("design:type", String)
], UpdatePaymentDto.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], UpdatePaymentDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['USD', 'PKR', 'AED', 'EUR', 'GBP']),
    __metadata("design:type", String)
], UpdatePaymentDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdatePaymentDto.prototype, "paidAt", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)(o => o.method === PaymentMethodDto.credit),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePaymentDto.prototype, "squareId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePaymentDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PaymentStatusDto),
    __metadata("design:type", String)
], UpdatePaymentDto.prototype, "status", void 0);
