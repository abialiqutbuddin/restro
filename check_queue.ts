
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const emails = await prisma.email_queue.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
    });

    console.log('--- Email Queue (Latest 5) ---');
    emails.forEach(e => {
        console.log(`ID: ${e.id} | Status: ${e.status} | To: ${(e.payload as any).to} | Err: ${e.error || 'None'}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
