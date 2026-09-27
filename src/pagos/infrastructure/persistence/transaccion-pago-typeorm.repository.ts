import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '@shared/result';
import { NotFoundError, PersistenceError } from '@shared/domain/domain-error';

import { TransaccionPagoRepositoryPort } from '../../application/ports/transaccion-pago-repository.port';
import { TransaccionPago } from '../../domain/transaccion-pago.entity';
import { TransaccionPagoOrmEntity } from './transaccion-pago.orm-entity';

@Injectable()
export class TransaccionPagoTypeOrmRepository implements TransaccionPagoRepositoryPort {
  constructor(
    @InjectRepository(TransaccionPagoOrmEntity)
    private readonly repo: Repository<TransaccionPagoOrmEntity>,
  ) {}

  async guardar(transaccion: TransaccionPago): Promise<Result<void, PersistenceError>> {
    try {
      await this.repo.save({
        id: transaccion.id,
        ordenId: transaccion.ordenId,
        referenciaPasarela: transaccion.referenciaPasarela,
        estado: transaccion.estado,
        ultimosCuatroDigitos: transaccion.ultimosCuatroDigitos,
        numeroCuotas: transaccion.numeroCuotas,
        respuestaCruda: transaccion.respuestaCruda ?? null,
      });
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new PersistenceError(`Error guardando la transacción: ${(error as Error).message}`));
    }
  }

  async buscarPorId(id: string): Promise<Result<TransaccionPago, NotFoundError | PersistenceError>> {
    let fila: TransaccionPagoOrmEntity | null;
    try {
      fila = await this.repo.findOne({ where: { id } });
    } catch (error) {
      return Result.fail(new PersistenceError(`Error consultando transacción: ${(error as Error).message}`));
    }

    if (!fila) {
      return Result.fail(new NotFoundError('TransaccionPago', id));
    }

    const transaccion = TransaccionPago.crear({
      id: fila.id,
      ordenId: fila.ordenId,
      referenciaPasarela: fila.referenciaPasarela,
      estado: fila.estado as TransaccionPago['estado'],
      ultimosCuatroDigitos: fila.ultimosCuatroDigitos,
      numeroCuotas: fila.numeroCuotas,
      respuestaCruda: fila.respuestaCruda ?? undefined,
    });

    return Result.ok(transaccion);
  }

  async buscarPorOrdenId(ordenId: string): Promise<Result<TransaccionPago, NotFoundError | PersistenceError>> {
    let fila: TransaccionPagoOrmEntity | null;
    try {
      fila = await this.repo.findOne({ where: { ordenId } });
    } catch (error) {
      return Result.fail(new PersistenceError(`Error consultando transacción por orden: ${(error as Error).message}`));
    }

    if (!fila) {
      return Result.fail(new NotFoundError('TransaccionPago', ordenId));
    }

    const transaccion = TransaccionPago.crear({
      id: fila.id,
      ordenId: fila.ordenId,
      referenciaPasarela: fila.referenciaPasarela,
      estado: fila.estado as TransaccionPago['estado'],
      ultimosCuatroDigitos: fila.ultimosCuatroDigitos,
      numeroCuotas: fila.numeroCuotas,
      respuestaCruda: fila.respuestaCruda ?? undefined,
    });

    return Result.ok(transaccion);
  }
}
