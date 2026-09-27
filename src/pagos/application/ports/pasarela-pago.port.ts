import { Result } from '@shared/result';
import { TarjetaCredito } from '../../domain/tarjeta-credito.entity';
import { PasarelaNoDisponibleError, PasarelaRechazoError } from '../../domain/pagos.errors';

export interface TokenAceptacion {
  acceptanceToken: string;
}

export interface TokenTarjeta {
  cardToken: string;
}

export interface DatosTransaccionPago {
  referencia: string; // referencia interna (usamos el id de la Orden)
  montoEnCentavos: number;
  moneda: string;
  numeroCuotas: number;
}

export interface ResultadoTransaccionPasarela {
  idTransaccionPasarela: string;
  estado: 'APPROVED' | 'DECLINED' | 'ERROR' | 'PENDING' | 'VOIDED';
  motivoRechazo?: string;
  respuestaCruda: Record<string, unknown>;
}

/**
 * Abstrae completamente a Wompi. El dominio/aplicación NUNCA sabe que
 * esto son 3 llamadas HTTP distintas con firma SHA-256; eso vive en
 * el adaptador concreto (infrastructure/wompi/wompi.adapter.ts).
 */
export interface PasarelaPagoPort {
  obtenerTokenAceptacion(): Promise<Result<TokenAceptacion, PasarelaNoDisponibleError>>;

  tokenizarTarjeta(tarjeta: TarjetaCredito): Promise<Result<TokenTarjeta, PasarelaRechazoError | PasarelaNoDisponibleError>>;

  crearTransaccion(
    datos: DatosTransaccionPago,
    tokenTarjeta: TokenTarjeta,
    tokenAceptacion: TokenAceptacion,
  ): Promise<Result<ResultadoTransaccionPasarela, PasarelaRechazoError | PasarelaNoDisponibleError>>;

  /**
   * Forma ACTIVA (pull) de conocer el estado, como complemento al webhook (push).
   * Útil cuando el webhook aún no llega, no está configurado, o se perdió.
   * Wompi: GET /v1/transactions/<ID_TRANSACCION>
   */
  consultarTransaccion(idTransaccionPasarela: string): Promise<Result<ResultadoTransaccionPasarela, PasarelaNoDisponibleError>>;
}

export const PASARELA_PAGO_PORT = Symbol('PASARELA_PAGO_PORT');
