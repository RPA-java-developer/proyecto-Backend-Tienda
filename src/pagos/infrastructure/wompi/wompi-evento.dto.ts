export interface WompiEventoTransaccion {
  id: string;
  status: 'APPROVED' | 'DECLINED' | 'ERROR' | 'PENDING' | 'VOIDED';
  reference: string; // == nuestro orden.id, porque así lo enviamos al crear la transacción
  amount_in_cents: number;
}

export interface WompiEventoPayload {
  event: string; // 'transaction.updated', etc.
  data: {
    transaction?: WompiEventoTransaccion;
    [key: string]: unknown;
  };
  environment: 'test' | 'prod';
  signature: {
    properties: string[];
    checksum: string;
  };
  timestamp: number;
  sent_at: string;
}
