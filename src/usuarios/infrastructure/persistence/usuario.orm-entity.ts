import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('usuarios')
export class UsuarioOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'nombre_completo' })
  nombreCompleto: string;

  @Column({ name: 'correo_electronico' })
  correoElectronico: string;

  @Column()
  telefono: string;

  @Column({ name: 'tipo_documento' })
  tipoDocumento: string;

  @Column({ name: 'numero_documento' })
  numeroDocumento: string;
}
