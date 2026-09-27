import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('transacciones_pago')
export class TransaccionPagoOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'orden_id', type: 'uuid' })
  ordenId: string;

  @Column({ name: 'referencia_pasarela' })
  referenciaPasarela: string;

  @Column()
  estado: string;

  @Column({ name: 'ultimos_cuatro_digitos' })
  ultimosCuatroDigitos: string;

  @Column({ name: 'numero_cuotas', type: 'int' })
  numeroCuotas: number;

  @Column({ name: 'respuesta_cruda', type: 'jsonb', nullable: true })
  respuestaCruda: Record<string, unknown> | null;
}
