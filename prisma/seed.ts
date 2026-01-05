import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'superadmin@example.com';
    const password = 'SuperSecretPassword123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.users.upsert({
        where: { email },
        update: {},
        create: {
            email,
            password: hashedPassword,
            name: 'Super Admin',
            role: Role.SUPER_ADMIN,
            is_active: true,
        },
    });

    console.log({ user });

    // --- Pricing Units ---
    const pricingUnits = [
        { code: 'per_box', label: 'Per Box', qty_label: 'Boxes' },
        { code: 'per_item', label: 'Per Item', qty_label: 'Items' },
        { code: 'per_person', label: 'Per Person', qty_label: 'People' },
        { code: 'per_tray', label: 'Per Tray', qty_label: 'Trays' },
        { code: 'each', label: 'Each', qty_label: 'Units' },
    ];

    for (const pu of pricingUnits) {
        await prisma.pricing_unit.upsert({
            where: { code: pu.code },
            update: { label: pu.label, qty_label: pu.qty_label },
            create: { code: pu.code, label: pu.label, qty_label: pu.qty_label },
        });
    }

    // --- Categories & Category Units ---
    // Ensure "Item" category exists
    const itemCat = await prisma.category.upsert({
        where: { slug: 'item' },
        update: { name: 'Item' },
        create: { name: 'Item', slug: 'item' },
    });

    // Helper to add unit to category
    const addUnit = async (catSlug: string, unitCode: string, isDefault = false) => {
        const cat = await prisma.category.findUnique({ where: { slug: catSlug } });
        if (!cat) return;
        await prisma.category_unit.upsert({
            where: { category_id_unit_code: { category_id: cat.id, unit_code: unitCode } },
            update: {},
            create: { category_id: cat.id, unit_code: unitCode },
        });
    };

    await addUnit('item', 'per_item', true);
    await addUnit('item', 'each', false);

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
