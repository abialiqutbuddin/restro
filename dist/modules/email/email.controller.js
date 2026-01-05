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
exports.EmailController = void 0;
const common_1 = require("@nestjs/common");
const email_queue_service_1 = require("../email-queue/email-queue.service");
const send_email_dto_1 = require("./dto/send-email.dto");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
let EmailController = class EmailController {
    constructor(emailQueue) {
        this.emailQueue = emailQueue;
    }
    async send(body) {
        const dto = (0, class_transformer_1.plainToInstance)(send_email_dto_1.SendEmailDto, body);
        await (0, class_validator_1.validateOrReject)(dto);
        const to = Array.isArray(dto.to) ? dto.to : dto.to ? [dto.to] : [];
        const cc = Array.isArray(dto.cc) ? dto.cc : dto.cc ? [dto.cc] : undefined;
        await this.emailQueue.addToQueue({
            subject: dto.subject,
            to,
            cc,
            text: dto.text,
            html: dto.html,
            pdfBase64: dto.pdfBase64,
            pdfFilename: dto.pdfFilename,
        });
        return { ok: true, queued: true };
    }
};
exports.EmailController = EmailController;
__decorate([
    (0, common_1.Post)('send'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "send", null);
exports.EmailController = EmailController = __decorate([
    (0, common_1.Controller)('email'),
    __metadata("design:paramtypes", [email_queue_service_1.EmailQueueService])
], EmailController);
