import { Result } from '@shared/result';
import { ValidationError } from '@shared/domain/domain-error';

export type EstadoOrden = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'FALLIDA';

export interface CrearOrdenProps {
  id: string;
  usuarioId: string;
  productoId: string;
  cantidad: number;
  montoTotalEnCentavos: number;
  moneda: string;
}

export class Orden {
  private constructor(
    public readonly id: string,
    public readonly usuarioId: string,
    public readonly productoId: string,
    public readonly cantidad: number,
    public readonly montoTotalEnCentavos: number,
    public readonly moneda: string,
    private _estado: EstadoOrden,
  ) {}

  get estado(): EstadoOrden {
    return this._estado;
  }

  static create(props: CrearOrdenProps): Result<Orden, ValidationError> {
    if (props.cantidad <= 0) {
      return Result.fail(new ValidationError('La cantidad debe ser mayor a cero.', 'cantidad'));
    }
    if (props.montoTotalEnCentavos <= 0) {
      return Result.fail(new ValidationError('El monto total debe ser mayor a cero.', 'montoTotalEnCentavos'));
    }
    return Result.ok(
      new Orden(props.id, props.usuarioId, props.productoId, props.cantidad, props.montoTotalEnCentavos, props.moneda, 'PENDIENTE'),
    );
  }

  /** Reconstruye la orden desde persistencia, respetando el estado guardado (no siempre PENDIENTE). */
  static reconstruir(props: CrearOrdenProps & { estado: EstadoOrden }): Orden {
    return new Orden(props.id, props.usuarioId, props.productoId, props.cantidad, props.montoTotalEnCentavos, props.moneda, props.estado);
  }

  marcarAprobada(): void {
    this._estado = 'APROBADA';
  }

  marcarRechazada(): void {
    this._estado = 'RECHAZADA';
  }

  marcarFallida(): void {
    this._estado = 'FALLIDA';
  }
}
