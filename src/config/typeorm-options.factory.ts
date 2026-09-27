import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UsuarioOrmEntity } from '../usuarios/infrastructure/persistence/usuario.orm-entity';
import { ProductoOrmEntity } from '../productos/infrastructure/persistence/producto.orm-entity';
import { OrdenOrmEntity } from '../pagos/infrastructure/persistence/orden.orm-entity';
import { TransaccionPagoOrmEntity } from '../pagos/infrastructure/persistence/transaccion-pago.orm-entity';

export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USERNAME', 'postgres'),
    password: config.get<string>('DB_PASSWORD', 'postgres'),
    database: config.get<string>('DB_DATABASE', 'tienda_backend'),
    entities: [UsuarioOrmEntity, ProductoOrmEntity, OrdenOrmEntity, TransaccionPagoOrmEntity],
    // El esquema se gestiona con db/sql/schema.sql (usuarios/productos son manuales),
    // por eso NUNCA usamos synchronize:true - evita que TypeORM altere tablas administradas a mano.
    synchronize: false,
    logging: config.get<string>('DB_LOGGING', 'false') === 'true',
  };
}
