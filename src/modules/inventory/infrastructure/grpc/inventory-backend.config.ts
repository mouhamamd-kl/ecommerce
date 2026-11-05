import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InventoryBackendConfig {
  readonly driver: 'typeorm' | 'grpc';
  readonly url: string;
  readonly timeoutMs: number;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const driver = config.get<string>('INVENTORY_DRIVER', 'typeorm');
    if (driver !== 'typeorm' && driver !== 'grpc') {
      throw new Error('INVENTORY_DRIVER must be typeorm or grpc.');
    }
    this.driver = driver;
    this.url = config.get<string>('WAREHOUSE_GRPC_URL', 'localhost:50051');
    this.timeoutMs = Number(config.get('WAREHOUSE_GRPC_TIMEOUT_MS', 3000));
    if (
      !this.url.trim() ||
      !Number.isSafeInteger(this.timeoutMs) ||
      this.timeoutMs <= 0
    ) {
      throw new Error(
        'Warehouse gRPC requires a URL and a positive integer timeout.',
      );
    }
  }
}
