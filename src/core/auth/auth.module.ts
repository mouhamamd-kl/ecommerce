import { Module } from '@nestjs/common';
import { CustomerAuthModule } from './customer/customer-auth.module.js';
import { AdminAuthModule } from './admin/admin-auth.module.js';

@Module({
  imports: [CustomerAuthModule, AdminAuthModule],
})
export class AuthModule {}