/**
 * Enhanced Database Seed Script - Crova Premium E-commerce
 * Creates production-ready catalog with 25+ curated products
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const categories = [
    { name: 'Women', slug: 'women', description: 'Elegant fashion for the modern woman', image: '/uploads/categories/women.jpg' },
    { name: 'Men', slug: 'men', description: 'Refined style for the discerning gentleman', image: '/uploads/categories/men.jpg' },
    { name: 'Collections', slug: 'collections', description: 'Curated seasonal collections', image: '/uploads/categories/collections.jpg' },
    { name: 'Accessories', slug: 'accessories', description: 'The finishing touches that complete your look', image: '/uploads/categories/accessories.jpg' },
];

const products = [
    // ============ WOMEN'S COLLECTION ============
    {
        name: 'Pastel Dream Maxi Dress',
        slug: 'pastel-dream-maxi-dress',
        description: 'Float through summer in this ethereal maxi dress. Crafted from lightweight silk-blend fabric in soft lavender hues, featuring delicate ruffle details and a flowing silhouette that moves with you. Perfect for garden parties or sunset dinners.',
        price: 8999,
        comparePrice: 12999,
        categorySlug: 'women',
        isFeatured: true,
        variants: [
            { size: 'XS', color: 'Lavender', stock: 12 },
            { size: 'S', color: 'Lavender', stock: 18 },
            { size: 'M', color: 'Lavender', stock: 20 },
            { size: 'L', color: 'Lavender', stock: 15 },
        ],
        images: ['https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800']
    },
    {
        name: 'Silk Chiffon Blouse',
        slug: 'silk-chiffon-blouse',
        description: 'Elegance redefined. This sheer silk chiffon blouse features French seams, pearl buttons, and billowing sleeves that whisper sophistication. Pair with tailored trousers for the office or slip into denim for weekend brunch.',
        price: 4500,
        comparePrice: 6500,
        categorySlug: 'women',
        isFeatured: true,
        variants: [
            { size: 'XS', color: 'Cream', stock: 15 },
            { size: 'S', color: 'Cream', stock: 25 },
        ],
        images: ['https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800']
    },
    {
        name: 'Linen Wide-Leg Trousers',
        slug: 'linen-wide-leg-trousers',
        description: 'The perfect blend of comfort and elegance. These high-waisted linen trousers feature a flattering wide-leg cut, invisible side zip, and breathable fabric that keeps you cool all day.',
        price: 5200,
        comparePrice: 7500,
        categorySlug: 'women',
        isFeatured: false,
        variants: [
            { size: '28', color: 'Ivory', stock: 18 },
        ],
        images: ['https://images.unsplash.com/photo-1618354691438-25bc04584c23?w=800']
    },
    {
        name: 'Cashmere Wrap Cardigan',
        slug: 'cashmere-wrap-cardigan',
        description: 'Luxury you can feel. This ultra-soft cashmere cardigan wraps you in warmth without the weight. Features a self-tie belt and relaxed fit.',
        price: 12999,
        comparePrice: 18999,
        categorySlug: 'women',
        isFeatured: true,
        variants: [
            { size: 'M', color: 'Oatmeal', stock: 12 },
        ],
        images: ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800']
    },
    {
        name: 'Cotton Poplin Midi Skirt',
        slug: 'cotton-poplin-midi-skirt',
        description: 'Classic with a modern twist. This crisp cotton poplin skirt falls gracefully to mid-calf, featuring a concealed zip and subtle pleating.',
        price: 3800,
        comparePrice: 5200,
        categorySlug: 'women',
        isFeatured: false,
        variants: [
            { size: 'M', color: 'White', stock: 25 },
        ],
        images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800']
    },
    {
        name: 'Merino Wool Turtleneck',
        slug: 'merino-wool-turtleneck',
        description: 'Minimalist perfection. This fine-gauge merino wool turtleneck offers warmth without bulk. Features a sleek silhouette and ribbed cuffs.',
        price: 4200,
        comparePrice: 6000,
        categorySlug: 'women',
        isFeatured: false,
        variants: [
            { size: 'S', color: 'Black', stock: 28 },
        ],
        images: ['https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=800']
    },
    {
        name: 'Satin Slip Skirt',
        slug: 'satin-slip-skirt',
        description: 'Effortless glamour. This bias-cut satin skirt hugs your curves in all the right places. Features a hidden elastic waistband for comfort.',
        price: 3500,
        comparePrice: 5000,
        categorySlug: 'women',
        isFeatured: false,
        variants: [
            { size: 'S', color: 'Champagne', stock: 18 },
        ],
        images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800']
    },
    {
        name: 'Oversized Denim Jacket',
        slug: 'oversized-denim-jacket',
        description: 'Cool girl essential. This vintage-wash denim jacket features an oversized fit, dropped shoulders, and distressed details.',
        price: 4999,
        comparePrice: 6999,
        categorySlug: 'women',
        isFeatured: false,
        variants: [
            { size: 'M', color: 'Light Wash', stock: 20 },
        ],
        images: ['https://images.unsplash.com/photo-1544642899-f0d6e5f6ed6f?w=800']
    },
    {
        name: 'Ribbed Knit Dress',
        slug: 'ribbed-knit-dress',
        description: 'Chic and cozy. This midi-length knit dress features a figure-flattering ribbed texture, side slit, and mock neck.',
        price: 5500,
        comparePrice: 7500,
        categorySlug: 'women',
        isFeatured: true,
        variants: [
            { size: 'M', color: 'Olive', stock: 18 },
        ],
        images: ['https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800']
    },
    {
        name: 'Classic Trench Coat',
        slug: 'classic-trench-coat',
        description: 'Timeless outerwear. This double-breasted trench features water-resistant fabric, a removable belt, and storm flaps.',
        price: 10999,
        comparePrice: 15999,
        categorySlug: 'women',
        isFeatured: true,
        variants: [
            { size: 'M', color: 'Beige', stock: 12 },
        ],
        images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800']
    },

    // ============ MEN'S COLLECTION ============
    {
        name: 'Classic Linen Shirt',
        slug: 'classic-linen-shirt',
        description: 'The gentleman\'s essential. Crafted from premium European linen with mother-of-pearl buttons and a tailored fit.',
        price: 3500,
        comparePrice: 5000,
        categorySlug: 'men',
        isFeatured: true,
        variants: [
            { size: 'M', color: 'White', stock: 30 },
        ],
        images: ['https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=800']
    },
    {
        name: 'Tailored Chino Trousers',
        slug: 'tailored-chino-trousers',
        description: 'Sharp, sophisticated, versatile. These slim-fit chinos feature Italian stretch cotton, a mid-rise cut, and meticulous tailoring.',
        price: 4200,
        comparePrice: 6000,
        categorySlug: 'men',
        isFeatured: true,
        variants: [
            { size: '32', color: 'Beige', stock: 25 },
        ],
        images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800']
    },
    {
        name: 'Oxford Cotton Dress Shirt',
        slug: 'oxford-cotton-dress-shirt',
        description: 'Boardroom ready. This premium Oxford cotton shirt features a point collar, French placket, and impeccable construction.',
        price: 3200,
        comparePrice: 4800,
        categorySlug: 'men',
        isFeatured: false,
        variants: [
            { size: 'M', color: 'White', stock: 35 },
        ],
        images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800']
    },
    {
        name: 'Merino Wool Crew Sweater',
        slug: 'merino-wool-crew-sweater',
        description: 'Timeless comfort. This classic crew-neck sweater is knit from ultra-fine merino wool features ribbed cuffs.',
        price: 5800,
        comparePrice: 8200,
        categorySlug: 'men',
        isFeatured: true,
        variants: [
            { size: 'M', color: 'Navy', stock: 25 },
        ],
        images: ['https://images.unsplash.com/photo-1610652492500-ded49ceeb378?w=800']
    },
    {
        name: 'Stretch Denim Jeans',
        slug: 'stretch-denim-jeans',
        description: 'The perfect pair. These slim-fit jeans combine premium Japanese denim with just the right amount of stretch.',
        price: 4800,
        comparePrice: 6800,
        categorySlug: 'men',
        isFeatured: false,
        variants: [
            { size: '32', color: 'Dark Indigo', stock: 28 },
        ],
        images: ['https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=800']
    },
    {
        name: 'Lightweight Bomber Jacket',
        slug: 'lightweight-bomber-jacket',
        description: 'Modern classic. This lightweight bomber features water-resistant nylon, ribbed collar and cuffs, and a streamlined silhouette.',
        price: 8500,
        comparePrice: 12000,
        categorySlug: 'men',
        isFeatured: false,
        variants: [
            { size: 'M', color: 'Navy', stock: 18 },
        ],
        images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800']
    },
    {
        name: 'Slim Fit Polo Shirt',
        slug: 'slim-fit-polo-shirt',
        description: 'A wardrobe staple. This breathable cotton pique polo features a customized slim fit and ribbed collar.',
        price: 2499,
        comparePrice: 3499,
        categorySlug: 'men',
        isFeatured: false,
        variants: [
            { size: 'L', color: 'Navy', stock: 25 },
        ],
        images: ['https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800']
    },
    {
        name: 'Wool Blend Overcoat',
        slug: 'wool-blend-overcoat',
        description: 'Sophisticated warmth. This tailored overcoat is crafted from a premium wool blend. Features a notched lapel.',
        price: 15999,
        comparePrice: 20999,
        categorySlug: 'men',
        isFeatured: true,
        variants: [
            { size: 'L', color: 'Camel', stock: 12 },
        ],
        images: ['https://images.unsplash.com/photo-1544911845-1f34a3eb46b1?w=800']
    },
    {
        name: 'Casual Canvas Sneakers',
        slug: 'casual-canvas-sneakers',
        description: 'Comfort meets style. These low-top canvas sneakers feature a durable rubber sole and minimalist design.',
        price: 3999,
        comparePrice: 5999,
        categorySlug: 'men',
        isFeatured: false,
        variants: [
            { size: '42', color: 'White', stock: 30 },
        ],
        images: ['https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800']
    },
    {
        name: 'Performance Hoodie',
        slug: 'performance-hoodie',
        description: 'Athleisure refined. This tech-fleece hoodie offers moisture-wicking properties and a sleek silhouette.',
        price: 4500,
        comparePrice: 6500,
        categorySlug: 'men',
        isFeatured: false,
        variants: [
            { size: 'L', color: 'Grey', stock: 30 },
        ],
        images: ['https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800']
    },

    // Collections & Accessories with placeholder images replaced
    {
        name: 'Summer Floral Midi Dress',
        slug: 'summer-floral-midi-dress',
        description: 'From our exclusive Summer 2025 collection.',
        price: 12999,
        comparePrice: 17999,
        categorySlug: 'collections',
        isFeatured: true,
        variants: [{ size: 'M', color: 'Floral', stock: 10 }],
        images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800']
    },
    {
        name: 'Gold-Plated Hoop Earrings',
        slug: 'gold-plated-hoop-earrings',
        description: 'Minimalist elegance.',
        price: 1200,
        comparePrice: 1800,
        categorySlug: 'accessories',
        isFeatured: true,
        variants: [{ size: 'One Size', color: 'Gold', stock: 50 }],
        images: ['https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800']
    },
    {
        name: 'Leather Tote Bag',
        slug: 'leather-tote-bag',
        description: 'Your new everyday companion.',
        price: 8500,
        comparePrice: 12000,
        categorySlug: 'accessories',
        isFeatured: true,
        variants: [{ size: 'One Size', color: 'Tan', stock: 15 }],
        images: ['https://images.unsplash.com/photo-1590736969955-71cc94801759?w=800']
    }
];

async function main() {
    console.log('🌱 Starting Crova database seed...\n');

    // ============ CREATE ADMIN USER ============
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@crova.com' },
        update: {},
        create: {
            email: 'admin@crova.com',
            name: 'Crova Admin',
            password: adminPassword,
            role: 'ADMIN',
            isEmailVerified: true,
        },
    });
    console.log('✅ Admin user created:', admin.email);

    // ============ CREATE TEST USER ============
    const userPassword = await bcrypt.hash('user123', 12);
    const user = await prisma.user.upsert({
        where: { email: 'user@crova.com' },
        update: {},
        create: {
            email: 'user@crova.com',
            name: 'Test User',
            password: userPassword,
            role: 'USER',
            isEmailVerified: true,
            cart: { create: {} },
            wishlist: { create: {} },
        },
    });
    console.log('✅ Test user created:', user.email);

    // ============ CREATE CATEGORIES ============
    for (const cat of categories) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: cat,
            create: cat,
        });
    }
    console.log('✅ Categories created:', categories.length);

    // ============ CREATE PRODUCTS ============
    let productsCreated = 0;
    for (const prod of products) {
        const category = await prisma.category.findUnique({
            where: { slug: prod.categorySlug },
        });

        if (!category) {
            console.log(`⚠️  Category ${prod.categorySlug} not found for ${prod.name}`);
            continue;
        }

        const existingProduct = await prisma.product.findUnique({
            where: { slug: prod.slug },
        });

        if (existingProduct) {
            console.log(`🔄 Updating existing product: "${prod.name}"`);

            // Update basic info and replace images
            await prisma.product.update({
                where: { id: existingProduct.id },
                data: {
                    description: prod.description,
                    price: prod.price,
                    comparePrice: prod.comparePrice,
                    isFeatured: prod.isFeatured,
                    images: {
                        deleteMany: {}, // Remove old placeholder images
                        create: prod.images ? prod.images.map((img, idx) => ({
                            imagePath: img,
                            isPrimary: idx === 0,
                            position: idx
                        })) : []
                    }
                }
            });
            continue;
        }

        const product = await prisma.product.create({
            data: {
                name: prod.name,
                slug: prod.slug,
                description: prod.description,
                price: prod.price,
                comparePrice: prod.comparePrice,
                categoryId: category.id,
                isFeatured: prod.isFeatured || false,
                variants: {
                    create: prod.variants.map((v, idx) => ({
                        ...v,
                        sku: `${prod.slug}-${v.size}-${v.color}`.toUpperCase().replace(/\s/g, '-').substring(0, 50),
                    })),
                },
                images: {
                    create: prod.images ? prod.images.map((img, idx) => ({
                        imagePath: img,
                        isPrimary: idx === 0,
                        position: idx
                    })) : [
                        // Fallback only if no images provided (shouldn't happen with new seed data)
                        { imagePath: `https://framerusercontent.com/images/placeholder-${productsCreated % 10}.jpg`, isPrimary: true, position: 0 }
                    ],
                },
            },
        });
        productsCreated++;
        console.log(`✅ Product created: ${product.name} (${prod.variants.length} variants)`);
    }
    console.log(`\n📦 Total products created: ${productsCreated}`);

    // ============ CREATE BANNERS ============
    console.log(`\n📦 Total products created: ${productsCreated}`);

    // ============ CREATE COLLECTIONS ============
    const collections = [
        {
            title: "Pastel Dreams",
            description: "Soft hues, bold styles — embrace the pastel aesthetic with our latest drops.",
            image: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800",
            theme: "bg-[#fdf2f8]",
            textColor: "text-pink-900",
            slug: "pastel-dreams"
        },
        {
            title: "Summer 2025",
            description: "Effortless fashion for every mood — light, calm, and a little playful.",
            image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800",
            theme: "bg-[#ecfccb]",
            textColor: "text-lime-900",
            slug: "summer-2025"
        },
        {
            title: "Couple Collection",
            description: "Matching styles for you and your loved one. Perfect harmony in fashion.",
            image: "https://images.unsplash.com/photo-1621786032758-112aef8baace?w=800",
            theme: "bg-red-50",
            textColor: "text-red-900",
            slug: "couple-collection"
        }
    ];

    await prisma.collection.deleteMany({}); // Clear existing

    for (const col of collections) {
        const createdCol = await prisma.collection.create({
            data: col
        });

        // Assign Products
        let keywords = [];
        if (col.slug === 'pastel-dreams') keywords = ['pastel', 'lavender', 'pink', 'cream', 'oatmeal'];
        if (col.slug === 'summer-2025') keywords = ['summer', 'linen', 'floral', 'dress', 'shorts'];
        if (col.slug === 'couple-collection') keywords = ['shirt', 'hoodie', 'watch', 'sneakers', 'denim']; // Gender neutral items

        // Find products matching keywords
        const matchingProducts = await prisma.product.findMany({
            where: {
                OR: keywords.map(k => ({
                    OR: [
                        { name: { contains: k, mode: 'insensitive' } },
                        { description: { contains: k, mode: 'insensitive' } },
                        { slug: { contains: k, mode: 'insensitive' } }
                    ]
                }))
            }
        });

        // Connect products
        if (matchingProducts.length > 0) {
            await prisma.collection.update({
                where: { id: createdCol.id },
                data: {
                    products: {
                        connect: matchingProducts.map(p => ({ id: p.id }))
                    }
                }
            });
            console.log(`✨ Collection ${col.title}: Added ${matchingProducts.length} items`);
        }
    }
    console.log('✅ Collections created: 3');

    // ============ CREATE BANNERS ============
    await prisma.banner.deleteMany({}); // Clear existing banners
    await prisma.banner.createMany({
        data: [
            {
                title: 'Summer 2025 Collection',
                subtitle: 'New arrivals now available',
                imagePath: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800',
                link: '/collections/summer-2025',
                position: 0,
                isActive: true,
            },
            {
                title: 'Pastel Dreams',
                subtitle: 'Soft hues, timeless elegance',
                imagePath: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800',
                link: '/collections/pastel-dreams',
                position: 1,
                isActive: true,
            },
        ],
    });
    console.log('✅ Banners created: 2');

    // ============ CREATE SETTINGS ============
    await prisma.settings.upsert({
        where: { id: 'default' },
        update: {
            storeName: 'CROVA',
            contactEmail: 'contact@crova.com',
            shippingRate: 99,
            freeShippingThreshold: 2000,
        },
        create: {
            id: 'default',
            storeName: 'CROVA',
            contactEmail: 'contact@crova.com',
            shippingRate: 99,
            freeShippingThreshold: 2000,
        },
    });
    console.log('✅ Settings updated');

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('📧 Test Accounts:');
    console.log('   🔑 Admin: admin@crova.com / admin123');
    console.log('   👤 User:  user@crova.com / user123\n');
    console.log(`📊 Database Summary:`);
    console.log(`   • ${categories.length} Categories`);
    console.log(`   • ${productsCreated} Products`);
    console.log(`   • 2 Banners`);
    console.log(`   • 2 Users (1 Admin, 1 Test User)\n`);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
