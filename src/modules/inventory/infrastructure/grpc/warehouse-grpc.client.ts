import {
  BadGatewayException,
  Inject,
  Injectable,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  ClientGrpcProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { fileURLToPath } from 'node:url';
import { firstValueFrom } from 'rxjs';
import { InventoryBackendConfig } from './inventory-backend.config.js';
import type {
  WarehouseRpc,
  WarehouseService,
} from './warehouse-grpc.contract.js';

export const WAREHOUSE_PROTO_PATH = fileURLToPath(
  new URL('../../../../proto/warehouse/v1/warehouse.proto', import.meta.url),
);

@Injectable()
export class WarehouseGrpcClient implements OnModuleDestroy {
  private proxy?: ClientGrpcProxy;
  private service?: WarehouseService;

  constructor(
    @Inject(InventoryBackendConfig)
    private readonly config: InventoryBackendConfig,
  ) {}

  async call<K extends keyof WarehouseRpc>(
    method: K,
    request: WarehouseRpc[K]['request'],
  ): Promise<WarehouseRpc[K]['response']> {
    if (!this.service) {
      this.proxy = ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: {
          package: 'warehouse.v1',
          protoPath: WAREHOUSE_PROTO_PATH,
          url: this.config.url,
          loader: { longs: Number, defaults: true, arrays: true },
          channelOptions: { 'grpc.enable_retries': 0 },
        },
      });
      this.service =
        this.proxy.getService<WarehouseService>('WarehouseService');
    }

    const response = await firstValueFrom(
      this.service[method](request, new Metadata(), {
        deadline: Date.now() + this.config.timeoutMs,
      }),
    );
    this.validateNumbers(response);
    return response;
  }

  onModuleDestroy(): void {
    this.proxy?.close();
  }

  private validateNumbers(value: unknown): void {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new BadGatewayException(
        'Warehouse returned an integer outside JavaScript safe range.',
      );
    }
    if (value && typeof value === 'object') {
      for (const entry of Object.values(value)) this.validateNumbers(entry);
    }
  }
}
