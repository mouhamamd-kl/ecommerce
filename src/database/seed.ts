

import 'reflect-metadata';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { DataSource, type EntityManager } from 'typeorm';
import { User } from '../modules/users/entities/user.entity.js';
import { Category } from '../modules/categories/entities/category.entity.js';
import { Product } from '../modules/products/entities/product.entity.js';
import { ProductPhoto } from '../modules/products/entities/product-photo.entity.js';
import { Inventory } from '../modules/inventory/entities/inventory.entity.js';
import {
    InventoryMovement,
    InventoryMovementType,
} from '../modules/inventory/entities/inventory-movement.entity.js';
import { Cart } from '../modules/cart/entities/cart.entity.js';
import { CartItem } from '../modules/cart/entities/cart-item.entity.js';
import { Order } from '../modules/orders/entities/order.entity.js';
import { OrderItem } from '../modules/orders/entities/order-item.entity.js';
import { OrderStatus, PaymentStatus, PaymentMethod } from '../modules/orders/order-status.js';
import { Notification } from '../modules/notifications/entities/notification.entity.js';
import {
    NotificationRecipientType,
    NotificationRecipientTypeValue,
    NotificationType,
    NotificationTypeValue,
} from '../modules/notifications/entities/enums/notification.enum.js';

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'admin',
    database: process.env.DB_DATABASE ?? 'ecommerce',

    entities: [
        User,
        Category,
        Product,
        ProductPhoto,
        Inventory,
        InventoryMovement,
        Cart,
        CartItem,
        Order,
        OrderItem,
        Notification,
    ],

    // Development only: create/update tables from the entity definitions.
    // Use migrations instead of synchronization in production.
    synchronize: process.env.SEED_SYNC_SCHEMA === 'true',
});

const ADMIN_EMAIL = 'admin@example.com';
const CUSTOMER_ONE_EMAIL = 'alice@example.com';
const CUSTOMER_TWO_EMAIL = 'bob@example.com';

const INITIAL_STOCK = 30;

const categoryData = [
    'Electronics',
    'Clothing',
    'Home & Kitchen',
    'Books',
];

const productData = [
    {
        name: 'Wireless Headphones',
        price: 59.99,
        categoryNames: ['Electronics'],
        photoUrl:
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    },
    {
        name: 'Smart Watch',
        price: 89.99,
        categoryNames: ['Electronics'],
        photoUrl:
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    },
    {
        name: 'Classic T-Shirt',
        price: 19.99,
        categoryNames: ['Clothing'],
        photoUrl:
            'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
    },
    {
        name: 'Coffee Maker',
        price: 44.99,
        categoryNames: ['Home & Kitchen'],
        photoUrl:
            'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085',
    },
    {
        name: 'Everyday Backpack',
        price: 34.99,
        categoryNames: ['Clothing'],
        photoUrl:
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62',
    },
    {
        name: 'Programming Fundamentals',
        price: 29.99,
        categoryNames: ['Books'],
        photoUrl:
            'https://images.unsplash.com/photo-1512820790803-83ca734da794',
    },
];

async function ensureUser(
    manager: EntityManager,
    data: {
        email: string;
        password: string;
        role: 'admin' | 'customer';
    },
): Promise<User> {
    const repo = manager.getRepository(User);

    let user = await repo.findOne({
        where: { email: data.email },
    });

    if (user) {
        if (user.role !== data.role) {
            throw new Error(
                `Existing user ${data.email} has role "${user.role}", expected "${data.role}".`,
            );
        }

        // Preserve existing passwords.
        return user;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    user = repo.create({
        email: data.email,
        password: passwordHash,
        role: data.role,
    });

    return repo.save(user);
}

async function ensureCategory(
    manager: EntityManager,
    name: string,
): Promise<Category> {
    const repo = manager.getRepository(Category);

    let category = await repo.findOne({ where: { name } });

    if (!category) {
        category = repo.create({
            name,
            isActive: true,
        });

        category = await repo.save(category);
    }

    return category;
}

async function ensureProduct(
    manager: EntityManager,
    item: (typeof productData)[number],
    categories: Category[],
): Promise<Product> {
    const productRepo = manager.getRepository(Product);

    let product = await productRepo.findOne({
        where: { name: item.name },
        relations: { categories: true },
    });

    if (!product) {
        product = productRepo.create({
            name: item.name,
            price: item.price,
            isActive: true,
            categories,
        });
    } else {
        // Update the seeded product's category links, but don't overwrite
        // a price that may have been edited manually.
        product.categories = categories;
    }

    product = await productRepo.save(product);

    const photoRepo = manager.getRepository(ProductPhoto);

    const existingPhoto = await photoRepo.findOne({
        where: {
            productId: product.id,
            url: item.photoUrl,
        },
    });

    if (!existingPhoto) {
        const hasPrimary = await photoRepo.findOne({
            where: {
                productId: product.id,
                isPrimary: true,
            },
        });

        await photoRepo.save(
            photoRepo.create({
                productId: product.id,
                url: item.photoUrl,
                isPrimary: !hasPrimary,
                sortOrder: 0,
            }),
        );
    }

    return product;
}

async function ensureInventory(
    manager: EntityManager,
    product: Product,
): Promise<Inventory> {
    const inventoryRepo = manager.getRepository(Inventory);

    let inventory = await inventoryRepo.findOne({
        where: { productId: product.id },
    });

    if (inventory) {
        return inventory;
    }

    inventory = inventoryRepo.create({
        productId: product.id,
        quantityOnHand: INITIAL_STOCK,
        quantityReserved: 0,
        lowStockThreshold: 5,
    });

    inventory = await inventoryRepo.save(inventory);

    await manager.getRepository(InventoryMovement).save(
        manager.getRepository(InventoryMovement).create({
            inventoryId: inventory.id,
            type: InventoryMovementType.stockAdded,
            quantity: INITIAL_STOCK,
            quantityBefore: 0,
            quantityAfter: INITIAL_STOCK,
            reason: 'Initial stock created by development seeder',
            referenceOrderId: null,
        }),
    );

    return inventory;
}

async function ensureCart(
    manager: EntityManager,
    user: User,
    products: Product[],
): Promise<void> {
    const cartRepo = manager.getRepository(Cart);
    const itemRepo = manager.getRepository(CartItem);

    let cart = await cartRepo.findOne({
        where: { userId: user.id },
    });

    if (!cart) {
        cart = await cartRepo.save(
            cartRepo.create({ userId: user.id }),
        );
    }

    // Only seed a cart if it has no items. Do not overwrite a real cart.
    const existingCount = await itemRepo.count({
        where: { cartId: cart.id },
    });

    if (existingCount > 0) {
        return;
    }

    for (const [index, product] of products.slice(0, 2).entries()) {
        if (!product.isActive) continue;

        await itemRepo.save(
            itemRepo.create({
                cartId: cart.id,
                productId: product.id,
                quantity: index + 1,
            }),
        );
    }
}

async function ensureSampleOrder(
    manager: EntityManager,
    customer: User,
    products: Product[],
): Promise<Order | null> {
    const orderRepo = manager.getRepository(Order);
    const itemRepo = manager.getRepository(OrderItem);
    const inventoryRepo = manager.getRepository(Inventory);
    const movementRepo = manager.getRepository(InventoryMovement);

    const marker = 'seed:sample-order-001';

    const existingOrder = await orderRepo.findOne({
        where: {
            userId: customer.id,
            adminNote: marker,
        },
    });

    if (existingOrder) {
        return existingOrder;
    }

    const selectedProducts = products.slice(0, 2);

    if (
        selectedProducts.length === 0 ||
        selectedProducts.some((product) => !product.isActive)
    ) {
        return null;
    }

    // Lock inventory rows so the reservation is not based on stale stock.
    const inventories: Inventory[] = [];

    for (const product of selectedProducts) {
        const inventory = await inventoryRepo
            .createQueryBuilder('inventory')
            .setLock('pessimistic_write')
            .where('inventory.productId = :productId', {
                productId: product.id,
            })
            .getOne();

        if (!inventory) {
            return null;
        }

        if (
            inventory.quantityOnHand - inventory.quantityReserved < 1
        ) {
            console.warn(
                `Skipping sample order: insufficient stock for ${product.name}.`,
            );
            return null;
        }

        inventories.push(inventory);
    }

    const total = selectedProducts.reduce(
        (sum, product) => sum + Number(product.price),
        0,
    );

    const order = await orderRepo.save(
        orderRepo.create({
            userId: customer.id,
            status: OrderStatus.pending,
            paymentStatus: PaymentStatus.pending,
            paymentMethod: PaymentMethod.cashOnDelivery,
            total: Number(total.toFixed(2)),
            shippingAddress: '123 Sample Street, Sample City',
            adminNote: marker,
        }),
    );

    for (let index = 0; index < selectedProducts.length; index++) {
        const product = selectedProducts[index];
        const inventory = inventories[index];

        await itemRepo.save(
            itemRepo.create({
                orderId: order.id,
                productId: product.id,
                productName: product.name,
                unitPrice: Number(product.price),
                quantity: 1,
                subtotal: Number(Number(product.price).toFixed(2)),
            }),
        );

        const before = inventory.quantityReserved;
        inventory.quantityReserved += 1;

        await inventoryRepo.save(inventory);

        await movementRepo.save(
            movementRepo.create({
                inventoryId: inventory.id,
                type: InventoryMovementType.reserved,
                quantity: 1,
                quantityBefore: before,
                quantityAfter: inventory.quantityReserved,
                reason: 'Stock reserved for seeded sample order',
                referenceOrderId: order.id,
            }),
        );
    }

    return order;
}


async function ensureNotification(
    manager: EntityManager,
    data: {
        recipientType: NotificationRecipientTypeValue;
        recipientId: number | null;
        type: NotificationTypeValue;
        title: string;
        message: string;
        relatedOrderId: number | null;
    },
): Promise<void> {
    const repo = manager.getRepository(Notification);

    const query = repo
        .createQueryBuilder('notification')
        .where('notification.recipientType = :recipientType', {
            recipientType: data.recipientType,
        })
        .andWhere('notification.type = :type', { type: data.type })
        .andWhere('notification.title = :title', { title: data.title })
        .andWhere('notification.message = :message', {
            message: data.message,
        });

    if (data.recipientId === null) {
        query.andWhere('notification.recipientId IS NULL');
    } else {
        query.andWhere('notification.recipientId = :recipientId', {
            recipientId: data.recipientId,
        });
    }

    if (data.relatedOrderId === null) {
        query.andWhere('notification.relatedOrderId IS NULL');
    } else {
        query.andWhere('notification.relatedOrderId = :relatedOrderId', {
            relatedOrderId: data.relatedOrderId,
        });
    }

    if (await query.getOne()) {
        return;
    }

    await repo.save(
        repo.create({
            ...data,
            isRead: false,
            readAt: null,
        }),
    );
}

async function seed(manager: EntityManager): Promise<void> {
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;

    if (!adminPassword || !customerPassword) {
        throw new Error(
            'Set SEED_ADMIN_PASSWORD and SEED_CUSTOMER_PASSWORD before running the seeder.',
        );
    }

    console.log('Seeding users...');

    const admin = await ensureUser(manager, {
        email: ADMIN_EMAIL,
        password: adminPassword,
        role: 'admin',
    });

    const customerOne = await ensureUser(manager, {
        email: CUSTOMER_ONE_EMAIL,
        password: customerPassword,
        role: 'customer',
    });

    const customerTwo = await ensureUser(manager, {
        email: CUSTOMER_TWO_EMAIL,
        password: customerPassword,
        role: 'customer',
    });

    console.log('Seeding categories...');

    const categories = new Map<string, Category>();

    for (const name of categoryData) {
        categories.set(name, await ensureCategory(manager, name));
    }

    console.log('Seeding products and photos...');

    const products: Product[] = [];

    for (const item of productData) {
        const productCategories = item.categoryNames.map((name) => {
            const category = categories.get(name);

            if (!category) {
                throw new Error(`Category not found: ${name}`);
            }

            return category;
        });

        products.push(
            await ensureProduct(manager, item, productCategories),
        );
    }

    console.log('Seeding inventory...');

    for (const product of products) {
        await ensureInventory(manager, product);
    }

    console.log('Seeding carts...');

    await ensureCart(manager, customerTwo, products.slice(2));

    console.log('Seeding a sample order...');

    const order = await ensureSampleOrder(
        manager,
        customerOne,
        products,
    );

    console.log('Seeding notifications...');

    await ensureNotification(manager, {
        recipientType: NotificationRecipientType.customer,
        recipientId: customerOne.id,
        type: NotificationType.system,
        title: 'Welcome to the store',
        message: 'Your customer account is ready to use.',
        relatedOrderId: null,
    });

    await ensureNotification(manager, {
        recipientType: NotificationRecipientType.customer,
        recipientId: customerTwo.id,
        type: NotificationType.system,
        title: 'Welcome to the store',
        message: 'Your customer account is ready to use.',
        relatedOrderId: null,
    });

    if (order) {
        await ensureNotification(manager, {
            recipientType: NotificationRecipientType.customer,
            recipientId: customerOne.id,
            type: NotificationType.orderCreated,
            title: 'Sample order created',
            message: `Your sample order #${order.id} has been created.`,
            relatedOrderId: order.id,
        });
    }

    await ensureNotification(manager, {
        recipientType: NotificationRecipientType.admin,
        recipientId: null,
        type: NotificationType.system,
        title: 'Development seed completed',
        message: 'Sample ecommerce data is available.',
        relatedOrderId: null,
    });

    console.log('Seed data completed.');
    console.log(`Admin: ${ADMIN_EMAIL}`);
    console.log(`Customer 1: ${CUSTOMER_ONE_EMAIL}`);
    console.log(`Customer 2: ${CUSTOMER_TWO_EMAIL}`);
}

async function main(): Promise<void> {
    await dataSource.initialize();

    try {
        await dataSource.transaction(async (manager) => {
            await seed(manager);
        });
    } finally {
        await dataSource.destroy();
    }
}

main().catch((error: unknown) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
});
