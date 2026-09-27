import { Result } from '@shared/result';
import { ValidationError } from '@shared/domain/domain-error';
import { CorreoElectronico } from './value-objects/correo-electronico.vo';
import { Documento } from './value-objects/documento.vo';

export interface CrearUsuarioProps {
  id: string;
  nombreCompleto: string;
  correoElectronico: string;
  telefono: string;
  tipoDocumento: string;
  numeroDocumento: string;
}

const TELEFONO_REGEX = /^\+?[0-9]{7,15}$/;

export class Usuario {
  private constructor(
    public readonly id: string,
    public readonly nombreCompleto: string,
    public readonly correoElectronico: CorreoElectronico,
    public readonly telefono: string,
    public readonly documento: Documento,
  ) {}

  /**
   * Factory ROP: valida TODOS los campos y combina los resultados.
   * Si algo falla, se retorna el primer error; si todo es válido,
   * se construye la entidad (invariante: un Usuario nunca existe
   * en un estado inválido).
   */
  static create(props: CrearUsuarioProps): Result<Usuario, ValidationError> {
    if (!props.nombreCompleto || props.nombreCompleto.trim().length < 3) {
      return Result.fail(new ValidationError('El nombre completo debe tener al menos 3 caracteres.', 'nombreCompleto'));
    }
    if (!TELEFONO_REGEX.test(props.telefono)) {
      return Result.fail(new ValidationError('El teléfono no tiene un formato válido.', 'telefono'));
    }

    const correoResult = CorreoElectronico.create(props.correoElectronico);
    if (correoResult.isFailure) {
      return Result.fail(correoResult.getError());
    }

    const documentoResult = Documento.create(props.tipoDocumento, props.numeroDocumento);
    if (documentoResult.isFailure) {
      return Result.fail(documentoResult.getError());
    }

    return Result.ok(
      new Usuario(
        props.id,
        props.nombreCompleto.trim(),
        correoResult.getValue(),
        props.telefono.trim(),
        documentoResult.getValue(),
      ),
    );
  }
}
