import { createHash } from 'crypto';

/**
 * Wompi exige un hash SHA-256 sobre:
 * referencia + monto_en_centavos + moneda + secreto_de_integridad
 * (concatenados directamente, sin separadores) para poder crear la transacción.
 * @see https://docs.wompi.co/docs/en/firma-de-integridad
 */
export function calcularFirmaIntegridad(params: {
  referencia: string;
  montoEnCentavos: number;
  moneda: string;
  secretoIntegridad: string;
}): string {
  const cadena = `${params.referencia}${params.montoEnCentavos}${params.moneda}${params.secretoIntegridad}`;
  return createHash('sha256').update(cadena).digest('hex');
}
