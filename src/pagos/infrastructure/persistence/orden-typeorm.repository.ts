import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '@shared/result';
import { NotFoundError, PersistenceError } from '@shared/domain/domain-error';

import { OrdenRepositoryPort } from '../../application/ports/orden-repository.port';
import { Orden, EstadoOrden } from '../../domain/orden.entity';
import { OrdenOrmEntity } from './orden.orm-entity';

@Injectable()
export class OrdenTypeOrmRepository implements OrdenRepositoryPort {
  constructor(
    @InjectRepository(OrdenOrmEntity)
    private readonly repo: Repository<OrdenOrmEntity>,
  ) {}

  async guardar(orden: Orden): Promise<Result<void, PersistenceError>> {
    try {
      await this.repo.save({
        id: orden.id,
        usuarioId: orden.usuarioId,
        productoId: orden.productoId,
        cantidad: orden.cantidad,
        montoTotalEnCentavos: String(orden.montoTotalEnCentavos),
        moneda: orden.moneda,
        estado: orden.estado,
      });
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new PersistenceError(`Error guardando la orden: ${(error as Error).message}`));
    }
  }

  async buscarPorId(id: string): Promise<Result<Orden, NotFoundError | PersistenceError>> {
    let fila: OrdenOrmEntity | null;
    try {
      fila = await this.repo.findOne({ where: { id } });
    } catch (error) {
      return Result.fail(new PersistenceError(`Error consultando la orden: ${(error as Error).message}`));
    }

    if (!fila) {
      return Result.fail(new NotFoundError('Orden', id));
    }

    const orden = Orden.reconstruir({
      id: fila.id,
      usuarioId: fila.usuarioId,
      productoId: fila.productoId,
      cantidad: fila.cantidad,
      montoTotalEnCentavos: Number(fila.montoTotalEnCentavos),
      moneda: fila.moneda,
      estado: fila.estado as EstadoOrden,
    });

    return Result.ok(orden);
  }
}
