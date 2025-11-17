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
exports.ContractsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../database/prisma.service");
let ContractsService = class ContractsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(customerId) {
        return this.prisma.contracts.findMany({
            where: customerId != null ? { customer_id: BigInt(customerId) } : undefined,
            orderBy: { created_at: 'desc' },
            include: { customer: true },
        });
    }
    async get(id) {
        return this.ensureContract(id);
    }
    async create(dto) {
        const customerId = BigInt(dto.customerId);
        await this.ensureCustomer(customerId);
        return this.prisma.contracts.create({
            data: {
                customer_id: customerId,
                name: dto.name,
                code: dto.code,
                billing_cycle: dto.billingCycle ?? 'monthly',
                start_date: new Date(dto.startDate),
                end_date: dto.endDate ? new Date(dto.endDate) : null,
                is_active: dto.isActive ?? true,
                notes: dto.notes ?? null,
            },
            include: { customer: true },
        });
    }
    async update(id, dto) {
        await this.ensureContract(id);
        return this.prisma.contracts.update({
            where: { id: BigInt(id) },
            data: {
                name: dto.name ?? undefined,
                code: dto.code ?? undefined,
                billing_cycle: dto.billingCycle ?? undefined,
                start_date: dto.startDate ? new Date(dto.startDate) : undefined,
                end_date: dto.endDate ? new Date(dto.endDate) : undefined,
                is_active: dto.isActive ?? undefined,
                notes: dto.notes ?? undefined,
            },
            include: { customer: true },
        });
    }
    async getBillableEvents(contractId, query) {
        await this.ensureContract(contractId);
        const where = {
            contract_id: BigInt(contractId),
            billing_type: client_1.EventBillingType.contract,
        };
        if (query.billingStatus) {
            where.billing_status = query.billingStatus;
        }
        if (query.start || query.end) {
            where.event_datetime = {};
            if (query.start)
                where.event_datetime.gte = new Date(query.start);
            if (query.end)
                where.event_datetime.lt = new Date(query.end);
        }
        const include = {
            customer: true,
            contract: true,
        };
        if (query.includeInvoice) {
            include.invoiceEvents = {
                include: { invoice: true },
            };
        }
        return this.prisma.events.findMany({
            where,
            orderBy: { event_datetime: 'asc' },
            include,
        });
    }
    async ensureCustomer(id) {
        const customer = await this.prisma.customers.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!customer) {
            throw new common_1.BadRequestException(`Customer ${id.toString()} not found`);
        }
    }
    async ensureContract(id) {
        const contract = await this.prisma.contracts.findUnique({
            where: { id: BigInt(id) },
            include: { customer: true },
        });
        if (!contract)
            throw new common_1.NotFoundException(`Contract ${id} not found`);
        return contract;
    }
};
exports.ContractsService = ContractsService;
exports.ContractsService = ContractsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContractsService);
