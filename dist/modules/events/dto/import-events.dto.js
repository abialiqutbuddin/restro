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
exports.ImportEventDto = exports.ImportNewCustomerDto = exports.ImportCateringDto = exports.ImportOrderDto = exports.ImportItemDto = exports.EventStatus = exports.CurrencyCode = exports.PricingModeCode = exports.PricingUnitCode = void 0;
// src/modules/events/dto/import-events.dto.ts
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
/* ---- enums ---- */
var PricingUnitCode;
(function (PricingUnitCode) {
    PricingUnitCode["PER_THAAL"] = "per_thaal";
    PricingUnitCode["PER_SIZE"] = "per_size";
    PricingUnitCode["PER_PERSON"] = "per_person";
    PricingUnitCode["PER_TRAY"] = "per_tray";
    PricingUnitCode["PER_BOX"] = "per_box";
    PricingUnitCode["PER_ITEM"] = "per_item";
})(PricingUnitCode || (exports.PricingUnitCode = PricingUnitCode = {}));
var PricingModeCode;
(function (PricingModeCode) {
    PricingModeCode["PER_UNIT_MANUAL"] = "per_unit_manual";
    PricingModeCode["PER_UNIT_FROM_ITEMS"] = "per_unit_from_items";
})(PricingModeCode || (exports.PricingModeCode = PricingModeCode = {}));
var CurrencyCode;
(function (CurrencyCode) {
    CurrencyCode["USD"] = "USD";
})(CurrencyCode || (exports.CurrencyCode = CurrencyCode = {}));
var EventStatus;
(function (EventStatus) {
    EventStatus["INCOMPLETE"] = "incomplete";
    EventStatus["COMPLETE"] = "complete";
    EventStatus["NEW"] = "new";
    EventStatus["PENDING"] = "pending";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
/* ---- leaf DTOs ---- */
class ImportItemDto {
}
exports.ImportItemDto = ImportItemDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ImportItemDto.prototype, "itemId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ImportItemDto.prototype, "sizeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ImportItemDto.prototype, "qtyPerUnit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ImportItemDto.prototype, "componentPrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportItemDto.prototype, "notes", void 0);
class ImportOrderDto {
    constructor() {
        this.items = [];
    }
}
exports.ImportOrderDto = ImportOrderDto;
__decorate([
    (0, class_validator_1.IsEnum)(PricingUnitCode),
    __metadata("design:type", String)
], ImportOrderDto.prototype, "unitCode", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(PricingModeCode),
    __metadata("design:type", String)
], ImportOrderDto.prototype, "pricingMode", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ImportOrderDto.prototype, "qty", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ImportOrderDto.prototype, "unitPrice", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(CurrencyCode),
    __metadata("design:type", String)
], ImportOrderDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportOrderDto.prototype, "calcNotes", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ImportItemDto),
    __metadata("design:type", Array)
], ImportOrderDto.prototype, "items", void 0);
class ImportCateringDto {
    constructor() {
        this.orders = [];
    }
}
exports.ImportCateringDto = ImportCateringDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ImportCateringDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportCateringDto.prototype, "titleOverride", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportCateringDto.prototype, "instructions", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ImportOrderDto),
    __metadata("design:type", Array)
], ImportCateringDto.prototype, "orders", void 0);
/* ---- nested customer ---- */
class ImportNewCustomerDto {
}
exports.ImportNewCustomerDto = ImportNewCustomerDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportNewCustomerDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportNewCustomerDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportNewCustomerDto.prototype, "email", void 0);
/* ---- class-level validator: exactly one of customerId / newCustomer ---- */
// function AtMostOneCustomer(options?: ValidationOptions) {
//   return function (object: object, propertyName: string) {
//     registerDecorator({
//       name: 'AtMostOneCustomer',
//       target: object.constructor,
//       propertyName,
//       constraints: [],
//       options,
//       validator: {
//         validate(_: any, args: ValidationArguments) {
//           const o = args.object as any;
//           const hasId  = typeof o.customerId === 'number';
//           const hasNew = !!o.newCustomer && typeof o.newCustomer.name === 'string';
//           // allow none, or exactly one; forbid both
//           return !(hasId && hasNew);
//         },
//         defaultMessage() {
//           return 'Provide at most one of customerId or newCustomer';
//         },
//       },
//     });
//   };
// }
/* ---- ROOT DTO ---- */
class ImportEventDto {
    constructor() {
        this.caterings = [];
    }
}
exports.ImportEventDto = ImportEventDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportEventDto.prototype, "gcalEventId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ImportEventDto.prototype, "customerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ImportNewCustomerDto),
    __metadata("design:type", ImportNewCustomerDto)
], ImportEventDto.prototype, "newCustomer", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportEventDto.prototype, "eventDatetime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportEventDto.prototype, "calendarText", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportEventDto.prototype, "venue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportEventDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Type)(() => Boolean),
    __metadata("design:type", Boolean)
], ImportEventDto.prototype, "isDelivery", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ImportEventDto.prototype, "deliveryCharges", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ImportEventDto.prototype, "serviceCharges", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ImportEventDto.prototype, "discount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ImportEventDto.prototype, "headcountEst", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(EventStatus),
    __metadata("design:type", String)
], ImportEventDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Type)(() => Boolean),
    __metadata("design:type", Boolean)
], ImportEventDto.prototype, "newOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.EventBillingType),
    __metadata("design:type", String)
], ImportEventDto.prototype, "billingType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.EventBillingStatus),
    __metadata("design:type", String)
], ImportEventDto.prototype, "billingStatus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ImportEventDto.prototype, "contractId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ImportCateringDto),
    __metadata("design:type", Array)
], ImportEventDto.prototype, "caterings", void 0);
