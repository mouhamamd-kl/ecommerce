import { NestFactory } from '@nestjs/core';
import { input, password } from '@inquirer/prompts';

import { AppModule } from '../app.module.js';
import { AdminsService } from '../modules/users/admins.service.js';
import { Role } from '../modules/users/roles.js';

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn'],
    });

    try {
        const adminsService = app.get(AdminsService);

        const email = (
            await input({
                message: 'Admin email:',
                validate: (value) =>
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ||
                    'Enter a valid email address.',
            })
        ).trim().toLowerCase();

        const adminPassword = await password({
            message: 'Admin password:',
            mask: '*',
            validate: (value) =>
                value.length >= 8 || 'Password must be at least 8 characters.',
        });

        const confirmation = await password({
            message: 'Confirm password:',
            mask: '*',
        });

        if (adminPassword !== confirmation) {
            throw new Error('Passwords do not match.');
        }

        await adminsService.create({
            email,
            password: adminPassword,
            role: Role.admin
        });

        console.log(`Admin created successfully: ${email}`);
    } catch (error) {
        console.error(
            'Admin creation failed:',
            error instanceof Error ? error.message : error,
        );

        process.exitCode = 1;
    } finally {
        await app.close();
    }
}

main();