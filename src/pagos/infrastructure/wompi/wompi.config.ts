export interface WompiConfig {
  baseUrl: string;
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  eventsSecret: string;
}

export function buildWompiConfig(): WompiConfig {
  return {
    baseUrl: process.env.WOMPI_BASE_URL ?? 'https://sandbox.wompi.co/v1',
    publicKey: process.env.WOMPI_PUBLIC_KEY ?? '',
    privateKey: process.env.WOMPI_PRIVATE_KEY ?? '',
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET ?? '',
    eventsSecret: process.env.WOMPI_EVENTS_SECRET ?? '',
  };
}

export const WOMPI_CONFIG = Symbol('WOMPI_CONFIG');
