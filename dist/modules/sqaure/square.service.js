"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SquareService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let SquareService = class SquareService {
    constructor() {
        this.baseUrl = 'https://connect.squareupsandbox.com/v2';
        this.token = process.env.SQUARE_TOKEN; // set in .env
    }
    async fetchAllCustomers() {
        const customers = [];
        let cursor;
        do {
            const url = cursor
                ? `${this.baseUrl}/customers?cursor=${cursor}`
                : `${this.baseUrl}/customers`;
            const { data } = await axios_1.default.get(url, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Square-Version': '2025-01-23',
                    'Content-Type': 'application/json',
                },
            });
            if (data.customers) {
                for (const c of data.customers) {
                    customers.push({
                        name: [c.given_name, c.family_name].filter(Boolean).join(' '),
                        email: c.email_address ?? '',
                        phone: c.phone_number ?? '',
                    });
                }
            }
            cursor = data.cursor;
        } while (cursor);
        return customers;
    }
};
exports.SquareService = SquareService;
exports.SquareService = SquareService = __decorate([
    (0, common_1.Injectable)()
], SquareService);
