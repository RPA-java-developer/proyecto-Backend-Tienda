import { Result } from '@shared/result';
import { NotFoundError, PersistenceError } from '@shared/domain/domain-error';
import { TransaccionPago } from '../../domain/transaccion-pago.entity';

export interface TransaccionPagoRepositoryPort {
  guardar(transaccion: TransaccionPago): Promise<Result<void, PersistenceError>>;

  /** Necesario para el caso de uso de consultar estado (ej. polling desde el frontend). */
  buscarPorId(id: string): Promise<Result<TransaccionPago, NotFoundError | PersistenceError>>;

  /** Necesario para el webhook: encontrar la transacción PENDING que se creó cuando Wompi respondió PENDING. */
  buscarPorOrdenId(ordenId: string): Promise<Result<TransaccionPago, NotFoundError | PersistenceError>>;
}

export const TRANSACCION_PAGO_REPOSITORY_PORT = Symbol('TRANSACCION_PAGO_REPOSITORY_PORT');
