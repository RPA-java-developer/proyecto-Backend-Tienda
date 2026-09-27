import { DomainError } from '@shared/domain/domain-error';

export class PasarelaRechazoError extends DomainError {
  readonly code = 'PASARELA_RECHAZO';
  constructor(motivo: string) {
    super(`El pago fue rechazado por la pasarela: ${motivo}`);
  }
}

export class PasarelaNoDisponibleError extends DomainError {
  readonly code = 'PASARELA_NO_DISPONIBLE';
  constructor(detalle?: string) {
    super(`La pasarela de pago no está disponible en este momento.${detalle ? ' ' + detalle : ''}`);
  }
}

export class StockInsuficienteError extends DomainError {
  readonly code = 'STOCK_INSUFICIENTE';
  constructor(nombreProducto: string) {
    super(`No hay stock suficiente de "${nombreProducto}" para procesar la orden.`);
  }
}
