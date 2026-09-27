import { Result } from '@shared/result';
import { NotFoundError, PersistenceError } from '@shared/domain/domain-error';
import { Producto } from '../../domain/producto.entity';

/**
 * Producto también se crea vía SQL directo. El backend sí necesita
 * ACTUALIZAR el stock (efecto del pago aprobado), por eso este puerto
 * expone buscarPorId + guardar (solo para persistir el nuevo stock).
 */
export interface ProductoRepositoryPort {
  buscarPorId(id: string): Promise<Result<Producto, NotFoundError | PersistenceError>>;
  guardar(producto: Producto): Promise<Result<void, PersistenceError>>;

  /** Necesario para el storefront del frontend React (listado de productos). */
  listarTodos(): Promise<Result<Producto[], PersistenceError>>;
}

export const PRODUCTO_REPOSITORY_PORT = Symbol('PRODUCTO_REPOSITORY_PORT');
