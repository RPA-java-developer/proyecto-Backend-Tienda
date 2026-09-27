import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from '@shared/result';
import { NotFoundError, PersistenceError } from '@shared/domain/domain-error';

import { UsuarioRepositoryPort } from '../application/ports/usuario-repository.port';
import { Usuario } from '../domain/usuario.entity';
import { UsuarioOrmEntity } from './persistence/usuario.orm-entity';

@Injectable()
export class UsuarioTypeOrmRepository implements UsuarioRepositoryPort {
  constructor(
    @InjectRepository(UsuarioOrmEntity)
    private readonly repo: Repository<UsuarioOrmEntity>,
  ) {}

  async buscarPorId(id: string): Promise<Result<Usuario, NotFoundError | PersistenceError>> {
    let fila: UsuarioOrmEntity | null;
    try {
      fila = await this.repo.findOne({ where: { id } });
    } catch (error) {
      return Result.fail(new PersistenceError(`Error consultando usuario: ${(error as Error).message}`));
    }

    if (!fila) {
      return Result.fail(new NotFoundError('Usuario', id));
    }

    const usuarioResult = Usuario.create({
      id: fila.id,
      nombreCompleto: fila.nombreCompleto,
      correoElectronico: fila.correoElectronico,
      telefono: fila.telefono,
      tipoDocumento: fila.tipoDocumento,
      numeroDocumento: fila.numeroDocumento,
    });

    // Si esto falla, significa que hay datos inválidos insertados por SQL directo.
    if (usuarioResult.isFailure) {
      return Result.fail(new PersistenceError(`Datos de usuario inconsistentes en BD: ${usuarioResult.getError().message}`));
    }

    return Result.ok(usuarioResult.getValue());
  }
}
