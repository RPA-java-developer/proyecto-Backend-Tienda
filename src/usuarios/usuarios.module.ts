import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsuarioOrmEntity } from './infrastructure/persistence/usuario.orm-entity';
import { UsuarioTypeOrmRepository } from './infrastructure/usuario-typeorm.repository';
import { USUARIO_REPOSITORY_PORT } from './application/ports/usuario-repository.port';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioOrmEntity])],
  providers: [{ provide: USUARIO_REPOSITORY_PORT, useClass: UsuarioTypeOrmRepository }],
  exports: [USUARIO_REPOSITORY_PORT],
})
export class UsuariosModule {}
