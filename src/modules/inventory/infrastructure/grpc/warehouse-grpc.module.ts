import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InventoryBackendConfig } from './inventory-backend.config.js';
import { WarehouseGrpcClient } from './warehouse-grpc.client.js';

@Module({
  imports: [ConfigModule],
  providers: [InventoryBackendConfig, WarehouseGrpcClient],
  exports: [InventoryBackendConfig, WarehouseGrpcClient],
})
export class WarehouseGrpcModule {}
