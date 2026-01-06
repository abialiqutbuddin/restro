"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailQueueModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const email_module_1 = require("../email/email.module");
const prisma_module_1 = require("../../database/prisma.module");
const email_queue_service_1 = require("./email-queue.service");
const email_scheduler_service_1 = require("./email-scheduler.service");
let EmailQueueModule = class EmailQueueModule {
};
exports.EmailQueueModule = EmailQueueModule;
exports.EmailQueueModule = EmailQueueModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            schedule_1.ScheduleModule.forRoot(),
            (0, common_1.forwardRef)(() => email_module_1.EmailModule),
        ],
        providers: [email_queue_service_1.EmailQueueService, email_scheduler_service_1.EmailSchedulerService],
        exports: [email_queue_service_1.EmailQueueService],
    })
], EmailQueueModule);
