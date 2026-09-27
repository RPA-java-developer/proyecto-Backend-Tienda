import { createHash } from 'crypto';

/**
 * Extrae un valor anidado de un objeto usando una ruta con puntos,
 * ej: obtenerValorPorRuta({transaction:{id:'x'}}, 'transaction.id') -> 'x'
 * Es necesario porque Wompi indica dinámicamente, en `signature.properties`,
 * qué campos del payload se usaron para construir el checksum.
 */
function obtenerValorPorRuta(objeto: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((actual, parte) => {
    if (actual && typeof actual === 'object') {
      return (actual as Record<string, unknown>)[parte];
    }
    return undefined;
  }, objeto);
}

/**
 * Recalcula el checksum de un evento de Wompi y lo compara con el recibido.
 * Algoritmo (documentado por Wompi):
 *   SHA256( valores_de_signature.properties_concatenados_en_orden + timestamp + WOMPI_EVENTS_SECRET )
 */
export function validarFirmaEvento(params: {
  data: unknown;
  properties: string[];
  timestamp: number;
  checksumRecibido: string;
  eventsSecret: string;
}): boolean {
  const valoresConcatenados = params.properties
    .map((propiedad) => String(obtenerValorPorRuta(params.data, propiedad) ?? ''))
    .join('');

  const cadena = `${valoresConcatenados}${params.timestamp}${params.eventsSecret}`;
  const checksumCalculado = createHash('sha256').update(cadena).digest('hex');

  return checksumCalculado.toLowerCase() === params.checksumRecibido.toLowerCase();
}
