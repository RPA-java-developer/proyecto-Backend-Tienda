import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductoOrmEntity } from './infrastructure/persistence/producto.orm-entity';
import { ProductoTypeOrmRepository } from './infrastructure/producto-typeorm.repository';
import { PRODUCTO_REPOSITORY_PORT } from './application/ports/producto-repository.port';
import { ListarProductosUseCase } from './application/use-cases/listar-productos.use-case';
import { ProductoController } from './infrastructure/http/producto.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductoOrmEntity])],
  controllers: [ProductoController],
  providers: [{ provide: PRODUCTO_REPOSITORY_PORT, useClass: ProductoTypeOrmRepository }, ListarProductosUseCase],
  exports: [PRODUCTO_REPOSITORY_PORT],
})
export class ProductosModule {}
