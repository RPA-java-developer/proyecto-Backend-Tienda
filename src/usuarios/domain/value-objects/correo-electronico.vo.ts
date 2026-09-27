import { Result } from '@shared/result';
import { ValidationError } from '@shared/domain/domain-error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CorreoElectronico {
  private constructor(public readonly valor: string) {}

  static create(valor: string): Result<CorreoElectronico, ValidationError> {
    if (!valor || valor.trim().length === 0) {
      return Result.fail(new ValidationError('El correo electrónico es obligatorio.', 'correoElectronico'));
    }
    if (!EMAIL_REGEX.test(valor)) {
      return Result.fail(new ValidationError('El correo electrónico no tiene un formato válido.', 'correoElectronico'));
    }
    return Result.ok(new CorreoElectronico(valor.toLowerCase().trim()));
  }
}
