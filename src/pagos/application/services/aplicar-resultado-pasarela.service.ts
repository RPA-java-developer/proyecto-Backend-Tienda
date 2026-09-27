import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@shared/result';
import { PersistenceError } from '@shared/domain/domain-error';

import { Orden } from '../../domain/orden.entity';
import { TransaccionPago } from '../../domain/transaccion-pago.entity';
import { ResultadoTransaccionPasarela } from '../ports/pasarela-pago.port';

import { ORDEN_REPOSITORY_PORT, OrdenRepositoryPort } from '../ports/orden-repository.port';
import { TRANSACCION_PAGO_REPOSITORY_PORT, TransaccionPagoRepositoryPort } from '../ports/transaccion-pago-repository.port';
import { PRODUCTO_REPOSITORY_PORT, ProductoRepositoryPort } from '../../../productos/application/ports/producto-repository.port';

const LOG = '[AplicarResultadoPasarela]';

/**
 * Usado por 2 caminos distintos que llegan al MISMO efecto de negocio:
 *  - ProcesarWebhookWompiUseCase (Wompi nos avisa - push)
 *  - ConsultarEstadoTransaccionUseCase (nosotros le preguntamos a Wompi - pull)
 * Centralizar esto evita que ambos caminos apliquen el stock/estado de forma distinta.
 */
@Injectable()
export class AplicarResultadoPasarelaService {
  constructor(
    @Inject(ORDEN_REPOSITORY_PORT) private readonly ordenes: OrdenRepositoryPort,
    @Inject(TRANSACCION_PAGO_REPOSITORY_PORT) private readonly transacciones: TransaccionPagoRepositoryPort,
    @Inject(PRODUCTO_REPOSITORY_PORT) private readonly productos: ProductoRepositoryPort,
  ) {}

  async aplicar(
    orden: Orden,
    transaccionExistente: TransaccionPago,
    resultado: ResultadoTransaccionPasarela,
  ): Promise<Result<void, PersistenceError>> {
    // Idempotencia: si la orden ya llegó a un estado definitivo, no se vuelve a aplicar
    // (protege contra webhooks duplicados Y contra una consulta activa que llega justo
    // después de que el webhook ya resolvió lo mismo).
    if (orden.estado !== 'PENDIENTE') {
      console.log(`${LOG} Orden ${orden.id} ya está en estado "${orden.estado}" - no se vuelve a aplicar (idempotencia).`);
      return Result.ok(undefined);
    }

    const transaccionActualizada = TransaccionPago.crear({
      id: transaccionExistente.id,
      ordenId: transaccionExistente.ordenId,
      referenciaPasarela: transaccionExistente.referenciaPasarela,
      estado: resultado.estado,
      ultimosCuatroDigitos: transaccionExistente.ultimosCuatroDigitos,
      numeroCuotas: transaccionExistente.numeroCuotas,
      respuestaCruda: resultado.respuestaCruda,
    });

    if (resultado.estado === 'APPROVED') {
      console.log(`${LOG} Aplicando APROBACIÓN a orden ${orden.id}...`);
      const productoResult = await this.productos.buscarPorId(orden.productoId);
      if (productoResult.isFailure) {
        console.error(`${LOG} FALLÓ - no se encontró el producto ${orden.productoId}`);
        return Result.fail(new PersistenceError(productoResult.getError().message));
      }
      const producto = productoResult.getValue();

      const reservaResult = producto.reservarStock(orden.cantidad);
      if (reservaResult.isFailure) {
        // El dinero ya fue cobrado; esto queda para revisión operativa manual.
        console.error(`${LOG} ALERTA - pago aprobado sin stock disponible para "${producto.nombre}". Requiere revisión manual.`);
      } else {
        const guardarProducto = await this.productos.guardar(producto);
        if (guardarProducto.isFailure) {
          console.error(`${LOG} FALLÓ al actualizar stock - ${guardarProducto.getError().message}`);
          return Result.fail(guardarProducto.getError());
        }
        console.log(`${LOG} Stock de "${producto.nombre}" actualizado a ${producto.stock}`);
      }

      orden.marcarAprobada();
    } else if (resultado.estado === 'DECLINED' || resultado.estado === 'ERROR' || resultado.estado === 'VOIDED') {
      console.log(`${LOG} Aplicando RECHAZO a orden ${orden.id} (estado=${resultado.estado})...`);
      orden.marcarRechazada();
    } else {
      console.log(`${LOG} Estado "${resultado.estado}" no es definitivo. No se modifica la orden todavía.`);
      // Igual persistimos la transacción para dejar rastro de la última consulta,
      // aunque la orden siga PENDIENTE.
      const guardarTransaccionSinCambio = await this.transacciones.guardar(transaccionActualizada);
      if (guardarTransaccionSinCambio.isFailure) {
        return Result.fail(guardarTransaccionSinCambio.getError());
      }
      return Result.ok(undefined);
    }

    const guardarOrden = await this.ordenes.guardar(orden);
    if (guardarOrden.isFailure) {
      console.error(`${LOG} FALLÓ al guardar la orden - ${guardarOrden.getError().message}`);
      return Result.fail(guardarOrden.getError());
    }

    const guardarTransaccion = await this.transacciones.guardar(transaccionActualizada);
    if (guardarTransaccion.isFailure) {
      console.error(`${LOG} FALLÓ al guardar la transacción - ${guardarTransaccion.getError().message}`);
      return Result.fail(guardarTransaccion.getError());
    }

    console.log(`${LOG} Fin | ordenId=${orden.id} estadoFinal=${orden.estado}`);
    return Result.ok(undefined);
  }
}
