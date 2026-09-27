export type EstadoTransaccion = 'APPROVED' | 'DECLINED' | 'ERROR' | 'PENDING' | 'VOIDED';

export interface TransaccionPagoProps {
  id: string;
  ordenId: string;
  referenciaPasarela: string; // id de la transacción en Wompi
  estado: EstadoTransaccion;
  ultimosCuatroDigitos: string; // nunca el número completo
  numeroCuotas: number;
  respuestaCruda?: Record<string, unknown>; // payload de Wompi, para auditoría
}

/**
 * Entidad simple (no requiere validaciones ROP complejas porque se
 * construye a partir de una respuesta YA confiable de la pasarela,
 * después de que el caso de uso validó todo lo demás).
 */
export class TransaccionPago {
  private constructor(private readonly props: TransaccionPagoProps) {}

  static crear(props: TransaccionPagoProps): TransaccionPago {
    return new TransaccionPago(props);
  }

  get id(): string {
    return this.props.id;
  }
  get ordenId(): string {
    return this.props.ordenId;
  }
  get estado(): EstadoTransaccion {
    return this.props.estado;
  }
  get referenciaPasarela(): string {
    return this.props.referenciaPasarela;
  }
  get ultimosCuatroDigitos(): string {
    return this.props.ultimosCuatroDigitos;
  }
  get numeroCuotas(): number {
    return this.props.numeroCuotas;
  }
  get respuestaCruda(): Record<string, unknown> | undefined {
    return this.props.respuestaCruda;
  }
}
