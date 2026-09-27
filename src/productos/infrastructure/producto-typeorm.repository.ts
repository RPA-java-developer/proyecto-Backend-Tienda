import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '@shared/result';
import { NotFoundError, PersistenceError } from '@shared/domain/domain-error';

import { ProductoRepositoryPort } from '../application/ports/producto-repository.port';
import { Producto } from '../domain/producto.entity';
import { ProductoOrmEntity } from './persistence/producto.orm-entity';

@Injectable()
export class ProductoTypeOrmRepository implements ProductoRepositoryPort {
  constructor(
    @InjectRepository(ProductoOrmEntity)
    private readonly repo: Repository<ProductoOrmEntity>,
  ) {}

  async buscarPorId(id: string): Promise<Result<Producto, NotFoundError | PersistenceError>> {
    let fila: ProductoOrmEntity | null;
    try {
      fila = await this.repo.findOne({ where: { id } });
    } catch (error) {
      return Result.fail(new PersistenceError(`Error consultando producto: ${(error as Error).message}`));
    }

    if (!fila) {
      return Result.fail(new NotFoundError('Producto', id));
    }

    const productoResult = Producto.create({
      id: fila.id,
      nombre: fila.nombre,
      descripcion: fila.descripcion,
      stock: fila.stock,
      precioEnCentavos: Number(fila.precioEnCentavos),
    });

    if (productoResult.isFailure) {
      return Result.fail(new PersistenceError(`Datos de producto inconsistentes en BD: ${productoResult.getError().message}`));
    }

    return Result.ok(productoResult.getValue());
  }

  /** Solo actualiza el stock (efecto de un pago aprobado). No crea productos nuevos. */
  async guardar(producto: Producto): Promise<Result<void, PersistenceError>> {
    try {
      await this.repo.update({ id: producto.id }, { stock: producto.stock });
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new PersistenceError(`Error actualizando stock del producto: ${(error as Error).message}`));
    }
  }

  async listarTodos(): Promise<Result<Producto[], PersistenceError>> {
    let filas: ProductoOrmEntity[];
    try {
      filas = await this.repo.find({ order: { nombre: 'ASC' } });
    } catch (error) {
      return Result.fail(new PersistenceError(`Error listando productos: ${(error as Error).message}`));
    }

    const productos: Producto[] = [];
    for (const fila of filas) {
      const productoResult = Producto.create({
        id: fila.id,
        nombre: fila.nombre,
        descripcion: fila.descripcion,
        stock: fila.stock,
        precioEnCentavos: Number(fila.precioEnCentavos),
      });
      // Si una fila individual está corrupta, se omite en vez de tumbar el listado completo.
      if (productoResult.isSuccess) {
        productos.push(productoResult.getValue());
      }
    }

    return Result.ok(productos);
  }
}
