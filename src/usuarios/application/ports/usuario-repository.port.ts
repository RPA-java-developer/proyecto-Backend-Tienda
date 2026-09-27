import { Result } from '@shared/result';
import { NotFoundError, PersistenceError } from '@shared/domain/domain-error';
import { Usuario } from '../../domain/usuario.entity';

/**
 * Solo lectura: Usuario se crea/administra vía scripts SQL directos
 * en la base de datos, por lo tanto este puerto no expone crear/actualizar.
 * El backend únicamente necesita CONSULTAR el usuario para procesar pagos.
 */
export interface UsuarioRepositoryPort {
  buscarPorId(id: string): Promise<Result<Usuario, NotFoundError | PersistenceError>>;
}

export const USUARIO_REPOSITORY_PORT = Symbol('USUARIO_REPOSITORY_PORT');
