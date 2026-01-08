
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    // 1. Find an existing order event
    const event = await prisma.events.findFirst();
    if (!event) {
        console.log('No events found. Please create an event first.');
        return;
    }

    const orderId = event.id;
    console.log(`Using Order ID: ${orderId}`);

    // 2. Generate a token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 3. Create an EXPIRED link (expired yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const link = await prisma.order_magic_links.create({
        data: {
            order_id: orderId,
            token_hash: tokenHash,
            expires_at: yesterday,
            created_by_user_id: null, // System/Test
        },
    });
    console.log('\n--- Expired Link Created ---');
    console.log(`Order ID: ${orderId}`);
    console.log(`Token: ${token}`); // This is what enters the URL
    console.log(`Token Hash: ${tokenHash}`);
    console.log(`Expires At: ${link.expires_at}`);
    console.log(`Magic Link URL: http://localhost:50783/magic/${token}`);
    console.log('----------------------------\n');
}
main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
