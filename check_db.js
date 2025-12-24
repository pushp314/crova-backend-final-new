const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
    try {
        const count = await prisma.product.count();
        console.log(`Total Products: ${count}`);

        const activeCount = await prisma.product.count({ where: { isActive: true } });
        console.log(`Active Products: ${activeCount}`);

        const products = await prisma.product.findMany({ take: 5 });
        console.log('Sample Products:', products);
    } catch (error) {
        console.error('Error checking products:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProducts();
