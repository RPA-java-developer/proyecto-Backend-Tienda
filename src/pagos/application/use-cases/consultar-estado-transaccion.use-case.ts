import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@shared/result';
import { NotFoundError, PersistenceError } from '@shared/domain/domain-error';

import { TRANSACCION_PAGO_REPOSITORY_PORT, TransaccionPagoRepositoryPort } from '../ports/transaccion-pago-repository.port';
import { ORDEN_REPOSITORY_PORT, OrdenRepositoryPort } from '../ports/orden-repository.port';
import { PASARELA_PAGO_PORT, PasarelaPagoPort } from '../ports/pasarela-pago.port';
import { AplicarResultadoPasarelaService } from '../services/aplicar-resultado-pasarela.service';
import { ConsultarEstadoTransaccionOutput } from './consultar-estado-transaccion.dto';

const LOG = '[ConsultarEstadoTransaccion]';

@Injectable()
export class ConsultarEstadoTransaccionUseCase {
  constructor(
    @Inject(TRANSACCION_PAGO_REPOSITORY_PORT) private readonly transacciones: TransaccionPagoRepositoryPort,
    @Inject(ORDEN_REPOSITORY_PORT) private readonly ordenes: OrdenRepositoryPort,
    @Inject(PASARELA_PAGO_PORT) private readonly pasarela: PasarelaPagoPort,
    private readonly aplicarResultado: AplicarResultadoPasarelaService,
  ) {}

  async ejecutar(transaccionId: string): Promise<Result<ConsultarEstadoTransaccionOutput, NotFoundError | PersistenceError>> {
    console.log(`${LOG} Consultando transacción ${transaccionId}...`);

    const resultado = await this.transacciones.buscarPorId(transaccionId);
    if (resultado.isFailure) {
      console.error(`${LOG} FALLÓ - ${resultado.getError().code}: ${resultado.getError().message}`);
      return Result.fail(resultado.getError());
    }
    let transaccion = resultado.getValue();

    // Si en NUESTRA base sigue PENDING, le preguntamos DIRECTO a Wompi (pull)
    // en vez de esperar pasivamente a que llegue el webhook (push).
    if (transaccion.estado === 'PENDING') {
      console.log(`${LOG} Estado local es PENDING - consultando directamente a Wompi (${transaccion.referenciaPasarela})...`);

      const consultaWompi = await this.pasarela.consultarTransaccion(transaccion.referenciaPasarela);
      if (consultaWompi.isSuccess) {
        const resultadoWompi = consultaWompi.getValue();

        if (resultadoWompi.estado !== 'PENDING') {
          const ordenResult = await this.ordenes.buscarPorId(transaccion.ordenId);
          if (ordenResult.isSuccess) {
            await this.aplicarResultado.aplicar(ordenResult.getValue(), transaccion, resultadoWompi);
            // Releemos para devolver el estado ya actualizado.
            const releida = await this.transacciones.buscarPorId(transaccionId);
            if (releida.isSuccess) {
              transaccion = releida.getValue();
            }
          }
        } else {
          console.log(`${LOG} Wompi también reporta PENDING - sin cambios.`);
        }
      } else {
        // Si Wompi no responde, no es un error fatal: simplemente devolvemos
        // lo último que sabemos (PENDING) desde nuestra base.
        console.warn(`${LOG} No se pudo consultar a Wompi (${consultaWompi.getError().message}); se devuelve el último estado conocido.`);
      }
    }

    console.log(`${LOG} OK - estado=${transaccion.estado}`);

    return Result.ok({
      transaccionId: transaccion.id,
      ordenId: transaccion.ordenId,
      estado: transaccion.estado,
      referenciaPasarela: transaccion.referenciaPasarela,
    });
  }
}
