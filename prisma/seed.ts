import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // --- Super Admin User ---
    const email = 'superadmin@example.com';
    // const password = 'SuperSecretPassword123!';
    // const hashedPassword = await bcrypt.hash(password, 10);

    // We only create if not exists to avoid overwriting password in dev if changed
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (!existingUser) {
        const password = 'SuperSecretPassword123!';
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.users.create({
            data: {
                email,
                password: hashedPassword,
                name: 'Super Admin',
                role: Role.SUPER_ADMIN,
                is_active: true,
            },
        });
        console.log('Super Admin created');
    } else {
        console.log('Super Admin already exists');
    }

    // --- Pricing Units ---
    // Data from screenshot: pricing_unit
    const pricingUnits = [
        { code: 'each', label: 'Each', qty_label: 'Units' },
        { code: 'per_box', label: 'Per Box', qty_label: 'Boxes' },
        { code: 'per_item', label: 'Per Item', qty_label: 'Items' },
        { code: 'per_person', label: 'Per Person', qty_label: 'People' },
        { code: 'per_size', label: 'Per Size', qty_label: 'sizes' },
        { code: 'per_thaal', label: 'Per Thaal', qty_label: 'thaals' },
        { code: 'per_tray', label: 'Per Tray', qty_label: 'Trays' },
    ];

    console.log('Seeding Pricing Units...');
    for (const pu of pricingUnits) {
        await prisma.pricing_unit.upsert({
            where: { code: pu.code },
            update: { label: pu.label, qty_label: pu.qty_label },
            create: { code: pu.code, label: pu.label, qty_label: pu.qty_label },
        });
    }

    // --- Sizes ---
    // Data from screenshot: sizes
    const sizes = [
        'Small',
        'Medium',
        'Large',
        'X Large',
        'X Small',
        'Full',
        'Half',
    ];

    console.log('Seeding Sizes...');
    for (const sizeName of sizes) {
        await prisma.sizes.upsert({
            where: { name: sizeName },
            update: {}, // Don't overwrite if exists
            create: { name: sizeName, description: null, active: true },
        });
    }

    // --- Categories ---
    // Data from screenshot: category
    const categories = [
        { name: 'Live BBQ', slug: 'live-bbq' },
        { name: 'Party Tray', slug: 'party-tray' },
        { name: 'Thaal', slug: 'thaal' },
        { name: 'Thaali', slug: 'thaali' },
        { name: 'Buffet', slug: 'buffet' },
        { name: 'Party Box', slug: 'party-box' },
        { name: 'Item', slug: 'item' },
        { name: 'Per Item', slug: 'per_item' },
    ];

    console.log('Seeding Categories...');
    for (const cat of categories) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: { name: cat.name },
            create: { name: cat.name, slug: cat.slug, active: true },
        });
    }

    // --- Category Units Associations ---
    // Data from screenshot: category_unit
    // We Map slug -> unit_code(s) to make it readable in code
    const categoryUnitMappings = [
        { catSlug: 'live-bbq', unitCode: 'per_person', hint: null },
        { catSlug: 'party-tray', unitCode: 'per_tray', hint: null },
        { catSlug: 'thaal', unitCode: 'per_thaal', hint: null },
        { catSlug: 'thaali', unitCode: 'per_size', hint: 'Small/Medium/Large' },
        { catSlug: 'buffet', unitCode: 'per_person', hint: null },
        { catSlug: 'party-box', unitCode: 'per_box', hint: null },
        { catSlug: 'item', unitCode: 'each', hint: null },
        { catSlug: 'item', unitCode: 'per_item', hint: null },
        // NOTE: The screenshot shows 'Per Item' category (id 19) but doesn't show units for it in the category_unit table screenshot (which only shows up to id 7 'each'/'per_item' for cat id 7).
        // If there are more, they weren't in the snippet. Assuming these are the primary ones.
    ];

    console.log('Seeding Category Units...');
    for (const mapping of categoryUnitMappings) {
        const cat = await prisma.category.findUnique({ where: { slug: mapping.catSlug } });
        if (cat) {
            await prisma.category_unit.upsert({
                where: {
                    category_id_unit_code: {
                        category_id: cat.id,
                        unit_code: mapping.unitCode,
                    },
                },
                update: { hint: mapping.hint },
                create: {
                    category_id: cat.id,
                    unit_code: mapping.unitCode,
                    hint: mapping.hint,
                },
            });
        } else {
            console.warn(`Category not found for association: ${mapping.catSlug}`);
        }
    }

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
