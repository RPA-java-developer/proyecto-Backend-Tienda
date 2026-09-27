import { Result } from '@shared/result';
import { ValidationError, ConflictError } from '@shared/domain/domain-error';

export interface CrearProductoProps {
  id: string;
  nombre: string;
  descripcion: string;
  stock: number;
  precioEnCentavos: number;
}

export class Producto {
  private constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly descripcion: string,
    private _stock: number,
    public readonly precioEnCentavos: number,
  ) {}

  get stock(): number {
    return this._stock;
  }

  static create(props: CrearProductoProps): Result<Producto, ValidationError> {
    if (!props.nombre || props.nombre.trim().length < 2) {
      return Result.fail(new ValidationError('El nombre del producto es obligatorio.', 'nombre'));
    }
    if (props.stock === undefined || props.stock === null || props.stock < 0) {
      return Result.fail(new ValidationError('El stock no puede ser negativo.', 'stock'));
    }
    if (props.precioEnCentavos === undefined || props.precioEnCentavos === null || props.precioEnCentavos <= 0) {
      return Result.fail(new ValidationError('El precio debe ser mayor a cero.', 'precioEnCentavos'));
    }
    return Result.ok(
      new Producto(props.id, props.nombre.trim(), props.descripcion?.trim() ?? '', props.stock, props.precioEnCentavos),
    );
  }

  /** Regla de negocio: no se puede reservar más stock del disponible. */
  reservarStock(cantidad: number): Result<Producto, ConflictError> {
    if (cantidad <= 0) {
      return Result.fail(new ConflictError('La cantidad a reservar debe ser mayor a cero.'));
    }
    if (this._stock < cantidad) {
      return Result.fail(new ConflictError(`Stock insuficiente para "${this.nombre}". Disponible: ${this._stock}.`));
    }
    this._stock -= cantidad;
    return Result.ok(this);
  }

  /** Monto a cobrar para una cantidad dada. El backend es la única fuente de verdad del precio. */
  calcularMontoEnCentavos(cantidad: number): number {
    return this.precioEnCentavos * cantidad;
  }
}
