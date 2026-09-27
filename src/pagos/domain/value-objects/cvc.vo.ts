import { Result } from '@shared/result';
import { ValidationError } from '@shared/domain/domain-error';

export class Cvc {
  private constructor(public readonly valor: string) {}

  static create(valor: string): Result<Cvc, ValidationError> {
    if (!/^[0-9]{3,4}$/.test(valor ?? '')) {
      return Result.fail(new ValidationError('El CVC debe tener 3 o 4 dígitos.', 'cvc'));
    }
    return Result.ok(new Cvc(valor));
  }
}
