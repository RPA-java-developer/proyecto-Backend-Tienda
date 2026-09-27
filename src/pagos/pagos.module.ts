import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsuariosModule } from '../usuarios/usuarios.module';
import { ProductosModule } from '../productos/productos.module';

import { OrdenOrmEntity } from './infrastructure/persistence/orden.orm-entity';
import { TransaccionPagoOrmEntity } from './infrastructure/persistence/transaccion-pago.orm-entity';
import { OrdenTypeOrmRepository } from './infrastructure/persistence/orden-typeorm.repository';
import { TransaccionPagoTypeOrmRepository } from './infrastructure/persistence/transaccion-pago-typeorm.repository';

import { ORDEN_REPOSITORY_PORT } from './application/ports/orden-repository.port';
import { TRANSACCION_PAGO_REPOSITORY_PORT } from './application/ports/transaccion-pago-repository.port';
import { PASARELA_PAGO_PORT } from './application/ports/pasarela-pago.port';

import { WompiAdapter } from './infrastructure/wompi/wompi.adapter';
import { WOMPI_CONFIG, buildWompiConfig } from './infrastructure/wompi/wompi.config';

import { ProcesarPagoUseCase } from './application/use-cases/procesar-pago.use-case';
import { ConsultarEstadoTransaccionUseCase } from './application/use-cases/consultar-estado-transaccion.use-case';
import { ProcesarWebhookWompiUseCase } from './application/use-cases/procesar-webhook-wompi.use-case';
import { AplicarResultadoPasarelaService } from './application/services/aplicar-resultado-pasarela.service';
import { PagoController } from './infrastructure/http/pago.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrdenOrmEntity, TransaccionPagoOrmEntity]), UsuariosModule, ProductosModule],
  controllers: [PagoController],
  providers: [
    { provide: ORDEN_REPOSITORY_PORT, useClass: OrdenTypeOrmRepository },
    { provide: TRANSACCION_PAGO_REPOSITORY_PORT, useClass: TransaccionPagoTypeOrmRepository },
    { provide: WOMPI_CONFIG, useFactory: buildWompiConfig },
    { provide: PASARELA_PAGO_PORT, useClass: WompiAdapter },
    AplicarResultadoPasarelaService,
    ProcesarPagoUseCase,
    ConsultarEstadoTransaccionUseCase,
    ProcesarWebhookWompiUseCase,
  ],
})
export class PagosModule {}
