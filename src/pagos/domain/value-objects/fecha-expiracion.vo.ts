import { Result } from '@shared/result';
import { ValidationError } from '@shared/domain/domain-error';

export class FechaExpiracion {
  private constructor(
    public readonly mes: number,
    public readonly anio: number,
  ) {}

  static create(mes: number, anio: number): Result<FechaExpiracion, ValidationError> {
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      return Result.fail(new ValidationError('El mes de expiración debe estar entre 1 y 12.', 'mesExpiracion'));
    }
    // Se acepta año en 2 o 4 dígitos, se normaliza a 4.
    const anioNormalizado = anio < 100 ? 2000 + anio : anio;

    const ahora = new Date();
    const anioActual = ahora.getFullYear();
    const mesActual = ahora.getMonth() + 1;

    const yaExpiro = anioNormalizado < anioActual || (anioNormalizado === anioActual && mes < mesActual);
    if (yaExpiro) {
      return Result.fail(new ValidationError('La tarjeta ya está expirada.', 'fechaExpiracion'));
    }

    return Result.ok(new FechaExpiracion(mes, anioNormalizado));
  }
}
