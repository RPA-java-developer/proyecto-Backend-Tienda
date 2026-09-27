import { Result } from '@shared/result';
import { ValidationError } from '@shared/domain/domain-error';
import { NumeroTarjeta } from './value-objects/numero-tarjeta.vo';
import { FechaExpiracion } from './value-objects/fecha-expiracion.vo';
import { Cvc } from './value-objects/cvc.vo';

export interface CrearTarjetaCreditoProps {
  numeroTarjeta: string;
  mesExpiracion: number;
  anioExpiracion: number;
  cvc: string;
  nombreEnTarjeta: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  numeroCuotas: number;
  aceptaTerminosYCondiciones: boolean;
}

/**
 * TarjetaCredito NO tiene id persistente ni repositorio propio:
 * es un objeto de dominio que vive solo durante el caso de uso
 * ProcesarPago. Se usa para tokenizar contra Wompi; nunca se guarda
 * en PostgreSQL con sus datos completos (número/CVC).
 */
export class TarjetaCredito {
  private constructor(
    public readonly numero: NumeroTarjeta,
    public readonly expiracion: FechaExpiracion,
    public readonly cvc: Cvc,
    public readonly nombreEnTarjeta: string,
    public readonly tipoIdentificacion: string,
    public readonly numeroIdentificacion: string,
    public readonly numeroCuotas: number,
  ) {}

  static create(props: CrearTarjetaCreditoProps): Result<TarjetaCredito, ValidationError> {
    if (!props.aceptaTerminosYCondiciones) {
      return Result.fail(new ValidationError('Debe aceptar los términos y condiciones para continuar.', 'aceptaTerminosYCondiciones'));
    }
    if (!props.nombreEnTarjeta || props.nombreEnTarjeta.trim().length < 3) {
      return Result.fail(new ValidationError('El nombre en la tarjeta es obligatorio.', 'nombreEnTarjeta'));
    }
    if (!props.tipoIdentificacion || props.tipoIdentificacion.trim().length === 0) {
      return Result.fail(new ValidationError('El tipo de identificación es obligatorio.', 'tipoIdentificacion'));
    }
    if (!props.numeroIdentificacion || props.numeroIdentificacion.trim().length === 0) {
      return Result.fail(new ValidationError('El número de identificación es obligatorio.', 'numeroIdentificacion'));
    }
    if (!Number.isInteger(props.numeroCuotas) || props.numeroCuotas < 1 || props.numeroCuotas > 36) {
      return Result.fail(new ValidationError('El número de cuotas debe estar entre 1 y 36.', 'numeroCuotas'));
    }

    const numeroResult = NumeroTarjeta.create(props.numeroTarjeta);
    if (numeroResult.isFailure) return Result.fail(numeroResult.getError());

    const expiracionResult = FechaExpiracion.create(props.mesExpiracion, props.anioExpiracion);
    if (expiracionResult.isFailure) return Result.fail(expiracionResult.getError());

    const cvcResult = Cvc.create(props.cvc);
    if (cvcResult.isFailure) return Result.fail(cvcResult.getError());

    return Result.ok(
      new TarjetaCredito(
        numeroResult.getValue(),
        expiracionResult.getValue(),
        cvcResult.getValue(),
        props.nombreEnTarjeta.trim(),
        props.tipoIdentificacion.trim(),
        props.numeroIdentificacion.trim(),
        props.numeroCuotas,
      ),
    );
  }
}
