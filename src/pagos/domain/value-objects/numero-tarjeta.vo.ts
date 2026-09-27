import { Result } from '@shared/result';
import { ValidationError } from '@shared/domain/domain-error';

function pasaLuhn(numero: string): boolean {
  let suma = 0;
  let alternar = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let digito = parseInt(numero.charAt(i), 10);
    if (alternar) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
    alternar = !alternar;
  }
  return suma % 10 === 0;
}

export class NumeroTarjeta {
  private constructor(public readonly valor: string) {}

  static create(valor: string): Result<NumeroTarjeta, ValidationError> {
    const limpio = (valor ?? '').replace(/\s|-/g, '');
    if (!/^[0-9]{13,19}$/.test(limpio)) {
      return Result.fail(new ValidationError('El número de tarjeta debe tener entre 13 y 19 dígitos.', 'numeroTarjeta'));
    }
    if (!pasaLuhn(limpio)) {
      return Result.fail(new ValidationError('El número de tarjeta no es válido.', 'numeroTarjeta'));
    }
    return Result.ok(new NumeroTarjeta(limpio));
  }

  /** Últimos 4 dígitos, seguro de persistir/mostrar (nunca el número completo). */
  ultimosCuatro(): string {
    return this.valor.slice(-4);
  }
}
