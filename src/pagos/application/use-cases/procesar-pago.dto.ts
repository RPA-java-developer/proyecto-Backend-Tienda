export interface ProcesarPagoInput {
  usuarioId: string;
  productoId: string;
  cantidad: number;
  moneda: string; // p.ej. "COP"

  // Datos de tarjeta (se usan solo en memoria para tokenizar, nunca se persisten completos)
  numeroTarjeta: string;
  mesExpiracion: number;
  anioExpiracion: number;
  cvc: string;
  nombreEnTarjeta: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  numeroCuotas: number;
  aceptaTerminosYCondiciones: boolean;
}

export interface ProcesarPagoOutput {
  ordenId: string;
  transaccionId: string;
  estado: 'APROBADA' | 'RECHAZADA' | 'PENDIENTE';
  referenciaPasarela: string;
  montoTotalEnCentavos: number;
}
