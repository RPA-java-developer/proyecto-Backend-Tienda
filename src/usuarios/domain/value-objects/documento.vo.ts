import { Result } from '@shared/result';
import { ValidationError } from '@shared/domain/domain-error';

export enum TipoDocumento {
  CC = 'CC', // Cédula de ciudadanía
  CE = 'CE', // Cédula de extranjería
  TI = 'TI', // Tarjeta de identidad
  PA = 'PA', // Pasaporte
  NIT = 'NIT',
}

export class Documento {
  private constructor(
    public readonly tipo: TipoDocumento,
    public readonly numero: string,
  ) {}

  static create(tipo: string, numero: string): Result<Documento, ValidationError> {
    if (!Object.values(TipoDocumento).includes(tipo as TipoDocumento)) {
      return Result.fail(new ValidationError(`Tipo de documento "${tipo}" no es válido.`, 'tipoDocumento'));
    }
    if (!numero || !/^[0-9A-Za-z-]{4,20}$/.test(numero)) {
      return Result.fail(new ValidationError('El número de documento no es válido.', 'numeroDocumento'));
    }
    return Result.ok(new Documento(tipo as TipoDocumento, numero.trim()));
  }
}
