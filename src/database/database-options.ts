import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function databaseOptions(config: ConfigService): TypeOrmModuleOptions {
  const primary = {
    host: config.get<string>('DB_HOST', 'localhost'),
    port: Number(config.get('DB_PORT', 5432)),
    username: config.get<string>('DB_USERNAME', 'postgres'),
    password: config.get<string>('DB_PASSWORD', ''),
    database: config.get<string>('DB_DATABASE', 'ecommerce'),
  };
  return {
    type: 'postgres', autoLoadEntities: true, synchronize: false,
    extra: { max: 10, connectionTimeoutMillis: 1000, statement_timeout: 10000 },
    ...(config.get('DB_READ_REPLICA_ENABLED', 'false') === 'true' ? {
      replication: {
        defaultMode: 'master', master: primary,
        slaves: [{ ...primary, host: config.get('DB_REPLICA_HOST', 'localhost'), port: Number(config.get('DB_REPLICA_PORT', 5435)) }],
      },
    } : primary),
  };
}
