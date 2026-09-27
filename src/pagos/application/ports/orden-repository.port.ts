import { Result } from '@shared/result';
import { NotFoundError, PersistenceError } from '@shared/domain/domain-error';
import { Orden } from '../../domain/orden.entity';

export interface OrdenRepositoryPort {
  guardar(orden: Orden): Promise<Result<void, PersistenceError>>;

  /** Necesario para el webhook de Wompi: encontrar la orden por su id (== reference enviado a Wompi). */
  buscarPorId(id: string): Promise<Result<Orden, NotFoundError | PersistenceError>>;
}

export const ORDEN_REPOSITORY_PORT = Symbol('ORDEN_REPOSITORY_PORT');
