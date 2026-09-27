import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('ordenes')
export class OrdenOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @Column({ name: 'producto_id', type: 'uuid' })
  productoId: string;

  @Column('int')
  cantidad: number;

  @Column({ name: 'monto_total_en_centavos', type: 'bigint' })
  montoTotalEnCentavos: string;

  @Column()
  moneda: string;

  @Column()
  estado: string;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
