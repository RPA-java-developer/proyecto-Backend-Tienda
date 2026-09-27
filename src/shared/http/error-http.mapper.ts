import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@shared/domain/domain-error';

const MAPA_CODIGO_A_HTTP: Record<string, HttpStatus> = {
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  STOCK_INSUFICIENTE: HttpStatus.CONFLICT,
  PASARELA_RECHAZO: HttpStatus.PAYMENT_REQUIRED, // 402
  PASARELA_NO_DISPONIBLE: HttpStatus.BAD_GATEWAY, // 502
  PERSISTENCE_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
};

export function mapearErrorDominioAHttp(error: DomainError): { status: HttpStatus; body: Record<string, unknown> } {
  return {
    status: MAPA_CODIGO_A_HTTP[error.code] ?? HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      status: 'ERROR',
      code: error.code,
      message: error.message,
    },
  };
}
