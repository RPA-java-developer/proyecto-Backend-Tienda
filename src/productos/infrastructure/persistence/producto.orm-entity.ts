import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('productos')
export class ProductoOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column('int')
  stock: number;

  @Column({ name: 'precio_en_centavos', type: 'bigint' })
  precioEnCentavos: string; // TypeORM mapea bigint como string por precisión; se convierte a number al usar.
}
