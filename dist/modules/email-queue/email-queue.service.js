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
var EmailQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailQueueService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let EmailQueueService = EmailQueueService_1 = class EmailQueueService {
    constructor(prisma) {
        this.prisma = prisma;
        this.log = new common_1.Logger(EmailQueueService_1.name);
    }
    async addToQueue(payload) {
        try {
            await this.prisma.email_queue.create({
                data: {
                    payload: payload, // Cast to any for JSON compatibility
                    status: 'PENDING',
                },
            });
            this.log.log(`Email added to queue for ${payload.to}`);
        }
        catch (e) {
            this.log.error(`Failed to add email to queue: ${e}`);
            throw e;
        }
    }
};
exports.EmailQueueService = EmailQueueService;
exports.EmailQueueService = EmailQueueService = EmailQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmailQueueService);
