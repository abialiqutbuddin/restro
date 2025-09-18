import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SquareService {
  private readonly baseUrl = 'https://connect.squareupsandbox.com/v2';
  private readonly token = process.env.SQUARE_TOKEN; // set in .env

  async fetchAllCustomers() {
    const customers: { name: string; email: string; phone: string }[] = [];
    let cursor: string | undefined;

    do {
      const url = cursor
        ? `${this.baseUrl}/customers?cursor=${cursor}`
        : `${this.baseUrl}/customers`;

      const { data } = await axios.get(url, {
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
}