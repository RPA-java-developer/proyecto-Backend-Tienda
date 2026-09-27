import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@shared/result';
import { NotFoundError, PersistenceError, ValidationError } from '@shared/domain/domain-error';

import { ORDEN_REPOSITORY_PORT, OrdenRepositoryPort } from '../ports/orden-repository.port';
import { TRANSACCION_PAGO_REPOSITORY_PORT, TransaccionPagoRepositoryPort } from '../ports/transaccion-pago-repository.port';
import { AplicarResultadoPasarelaService } from '../services/aplicar-resultado-pasarela.service';

import { WompiEventoPayload } from '../../infrastructure/wompi/wompi-evento.dto';
import { validarFirmaEvento } from '../../infrastructure/wompi/wompi-webhook-signature.util';
import { WOMPI_CONFIG, WompiConfig } from '../../infrastructure/wompi/wompi.config';

const LOG = '[WebhookWompi]';

export type ProcesarWebhookError = ValidationError | NotFoundError | PersistenceError;

@Injectable()
export class ProcesarWebhookWompiUseCase {
  constructor(
    @Inject(ORDEN_REPOSITORY_PORT) private readonly ordenes: OrdenRepositoryPort,
    @Inject(TRANSACCION_PAGO_REPOSITORY_PORT) private readonly transacciones: TransaccionPagoRepositoryPort,
    @Inject(WOMPI_CONFIG) private readonly wompiConfig: WompiConfig,
    private readonly aplicarResultado: AplicarResultadoPasarelaService,
  ) {}

  async ejecutar(payload: WompiEventoPayload): Promise<Result<void, ProcesarWebhookError>> {
    console.log(`${LOG} Evento recibido: ${payload.event}`);

    // --- Paso 1: validar que el evento realmente venga de Wompi ---
    const firmaValida = validarFirmaEvento({
      data: payload.data,
      properties: payload.signature.properties,
      timestamp: payload.timestamp,
      checksumRecibido: payload.signature.checksum,
      eventsSecret: this.wompiConfig.eventsSecret,
    });
    if (!firmaValida) {
      console.error(`${LOG} FALLÓ - firma inválida, el evento podría ser falso. Se descarta.`);
      return Result.fail(new ValidationError('La firma del evento de Wompi no es válida.'));
    }
    console.log(`${LOG} Firma válida`);

    // --- Paso 2: solo nos interesa transaction.updated; otros eventos se reconocen sin acción ---
    if (payload.event !== 'transaction.updated' || !payload.data.transaction) {
      console.log(`${LOG} Evento "${payload.event}" ignorado (no es transaction.updated).`);
      return Result.ok(undefined);
    }
    const transaccionWompi = payload.data.transaction;
    console.log(
      `${LOG} transaction.updated | idWompi=${transaccionWompi.id} reference=${transaccionWompi.reference} status=${transaccionWompi.status}`,
    );

    // --- Paso 3: la referencia que enviamos a Wompi ES el id de nuestra Orden ---
    const ordenResult = await this.ordenes.buscarPorId(transaccionWompi.reference);
    if (ordenResult.isFailure) {
      console.error(`${LOG} FALLÓ - no se encontró la orden con id=${transaccionWompi.reference}`);
      return Result.fail(ordenResult.getError());
    }
    const orden = ordenResult.getValue();

    // --- Paso 4: encontrar el registro de TransaccionPago que se creó como PENDING ---
    const transaccionExistenteResult = await this.transacciones.buscarPorOrdenId(orden.id);
    if (transaccionExistenteResult.isFailure) {
      console.error(`${LOG} FALLÓ - no se encontró la transacción para la orden ${orden.id}`);
      return Result.fail(transaccionExistenteResult.getError());
    }
    const transaccionExistente = transaccionExistenteResult.getValue();

    // --- Paso 5: aplicar el resultado (misma lógica que usa la consulta activa) ---
    const aplicarResult = await this.aplicarResultado.aplicar(orden, transaccionExistente, {
      idTransaccionPasarela: transaccionWompi.id,
      estado: transaccionWompi.status,
      respuestaCruda: payload.data as Record<string, unknown>,
    });
    if (aplicarResult.isFailure) {
      return Result.fail(aplicarResult.getError());
    }

    console.log(`${LOG} Fin | ordenId=${orden.id}`);
    return Result.ok(undefined);
  }
}
