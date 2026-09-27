export interface ConsultarEstadoTransaccionOutput {
  transaccionId: string;
  ordenId: string;
  estado: 'APPROVED' | 'DECLINED' | 'ERROR' | 'PENDING' | 'VOIDED';
  referenciaPasarela: string;
}
