import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@shared/result';
import { DomainError, NotFoundError, PersistenceError, ValidationError } from '@shared/domain/domain-error';

import { TarjetaCredito } from '../../domain/tarjeta-credito.entity';
import { Orden } from '../../domain/orden.entity';
import { TransaccionPago } from '../../domain/transaccion-pago.entity';
import { PasarelaRechazoError, PasarelaNoDisponibleError, StockInsuficienteError } from '../../domain/pagos.errors';

import { USUARIO_REPOSITORY_PORT, UsuarioRepositoryPort } from '../../../usuarios/application/ports/usuario-repository.port';
import { PRODUCTO_REPOSITORY_PORT, ProductoRepositoryPort } from '../../../productos/application/ports/producto-repository.port';
import { ORDEN_REPOSITORY_PORT, OrdenRepositoryPort } from '../ports/orden-repository.port';
import { TRANSACCION_PAGO_REPOSITORY_PORT, TransaccionPagoRepositoryPort } from '../ports/transaccion-pago-repository.port';
import { PASARELA_PAGO_PORT, PasarelaPagoPort } from '../ports/pasarela-pago.port';

import { ProcesarPagoInput, ProcesarPagoOutput } from './procesar-pago.dto';

export type ProcesarPagoError =
  | ValidationError
  | NotFoundError
  | StockInsuficienteError
  | PasarelaRechazoError
  | PasarelaNoDisponibleError
  | PersistenceError;

// Prefijo fijo para poder filtrar estos logs en consola (ej: buscar "[ProcesarPago]").
const LOG = '[ProcesarPago]';

@Injectable()
export class ProcesarPagoUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY_PORT) private readonly usuarios: UsuarioRepositoryPort,
    @Inject(PRODUCTO_REPOSITORY_PORT) private readonly productos: ProductoRepositoryPort,
    @Inject(ORDEN_REPOSITORY_PORT) private readonly ordenes: OrdenRepositoryPort,
    @Inject(TRANSACCION_PAGO_REPOSITORY_PORT) private readonly transacciones: TransaccionPagoRepositoryPort,
    @Inject(PASARELA_PAGO_PORT) private readonly pasarela: PasarelaPagoPort,
  ) {}

  async ejecutar(input: ProcesarPagoInput): Promise<Result<ProcesarPagoOutput, ProcesarPagoError>> {
    console.log(`${LOG} Inicio | usuarioId=${input.usuarioId} productoId=${input.productoId} cantidad=${input.cantidad}`);

    // --- Paso 1 (síncrono, dominio): validar los datos de la tarjeta ---
    console.log(`${LOG} Paso 1/6 - Validando datos de la tarjeta...`);
    const tarjetaResult = TarjetaCredito.create({
      numeroTarjeta: input.numeroTarjeta,
      mesExpiracion: input.mesExpiracion,
      anioExpiracion: input.anioExpiracion,
      cvc: input.cvc,
      nombreEnTarjeta: input.nombreEnTarjeta,
      tipoIdentificacion: input.tipoIdentificacion,
      numeroIdentificacion: input.numeroIdentificacion,
      numeroCuotas: input.numeroCuotas,
      aceptaTerminosYCondiciones: input.aceptaTerminosYCondiciones,
    });
    if (tarjetaResult.isFailure) {
      console.error(`${LOG} Paso 1/6 FALLÓ - ${tarjetaResult.getError().code}: ${tarjetaResult.getError().message}`);
      return Result.fail(tarjetaResult.getError());
    }
    const tarjeta = tarjetaResult.getValue();
    console.log(`${LOG} Paso 1/6 OK - tarjeta terminada en ${tarjeta.numero.ultimosCuatro()}`);

    // --- Paso 2: usuario debe existir (se creó por SQL directo) ---
    console.log(`${LOG} Paso 2/6 - Buscando usuario ${input.usuarioId}...`);
    const usuarioResult = await this.usuarios.buscarPorId(input.usuarioId);
    if (usuarioResult.isFailure) {
      console.error(`${LOG} Paso 2/6 FALLÓ - ${usuarioResult.getError().code}: ${usuarioResult.getError().message}`);
      return Result.fail(usuarioResult.getError());
    }
    console.log(`${LOG} Paso 2/6 OK - usuario encontrado`);

    // --- Paso 3: producto debe existir y tener stock ---
    console.log(`${LOG} Paso 3/6 - Buscando producto ${input.productoId} y reservando stock...`);
    const productoResult = await this.productos.buscarPorId(input.productoId);
    if (productoResult.isFailure) {
      console.error(`${LOG} Paso 3/6 FALLÓ - ${productoResult.getError().code}: ${productoResult.getError().message}`);
      return Result.fail(productoResult.getError());
    }
    const producto = productoResult.getValue();

    const reservaResult = producto.reservarStock(input.cantidad);
    if (reservaResult.isFailure) {
      console.error(`${LOG} Paso 3/6 FALLÓ - stock insuficiente para "${producto.nombre}"`);
      return Result.fail(new StockInsuficienteError(producto.nombre));
    }
    console.log(`${LOG} Paso 3/6 OK - stock reservado, stock restante en memoria: ${producto.stock}`);

    // El backend es la única fuente de verdad del precio: nunca se confía
    // en un monto enviado por el cliente (frontend React).
    const montoTotalEnCentavos = producto.calcularMontoEnCentavos(input.cantidad);
    console.log(`${LOG} Monto calculado: ${montoTotalEnCentavos} centavos (${input.moneda})`);

    // --- Paso 4: crear la Orden en estado PENDIENTE ---
    const ordenResult = Orden.create({
      id: randomUUID(),
      usuarioId: input.usuarioId,
      productoId: input.productoId,
      cantidad: input.cantidad,
      montoTotalEnCentavos,
      moneda: input.moneda,
    });
    if (ordenResult.isFailure) {
      console.error(`${LOG} Paso 4/6 FALLÓ - ${ordenResult.getError().code}: ${ordenResult.getError().message}`);
      return Result.fail(ordenResult.getError());
    }
    const orden = ordenResult.getValue();
    console.log(`${LOG} Paso 4/6 OK - orden creada en memoria | ordenId=${orden.id} estado=${orden.estado}`);

    // --- Paso 5: coreografía con Wompi (token aceptación -> tokenizar tarjeta -> crear transacción) ---
    console.log(`${LOG} Paso 5/6 - Solicitando token de aceptación a Wompi...`);
    const tokenAceptacionResult = await this.pasarela.obtenerTokenAceptacion();
    if (tokenAceptacionResult.isFailure) {
      console.error(`${LOG} Paso 5/6 FALLÓ (token aceptación) - ${tokenAceptacionResult.getError().message}`);
      return Result.fail(tokenAceptacionResult.getError());
    }
    console.log(`${LOG} Paso 5/6 - Token de aceptación OK`);

    console.log(`${LOG} Paso 5/6 - Tokenizando tarjeta en Wompi...`);
    const tokenTarjetaResult = await this.pasarela.tokenizarTarjeta(tarjeta);
    if (tokenTarjetaResult.isFailure) {
      console.error(`${LOG} Paso 5/6 FALLÓ (tokenizar tarjeta) - ${tokenTarjetaResult.getError().message}`);
      return Result.fail(tokenTarjetaResult.getError());
    }
    console.log(`${LOG} Paso 5/6 - Tarjeta tokenizada OK`);

    console.log(`${LOG} Paso 5/6 - Creando transacción en Wompi | ordenId=${orden.id} monto=${montoTotalEnCentavos}...`);
    const transaccionPasarelaResult = await this.pasarela.crearTransaccion(
      {
        referencia: orden.id,
        montoEnCentavos: montoTotalEnCentavos,
        moneda: input.moneda,
        numeroCuotas: input.numeroCuotas,
      },
      tokenTarjetaResult.getValue(),
      tokenAceptacionResult.getValue(),
    );
    if (transaccionPasarelaResult.isFailure) {
      console.error(`${LOG} Paso 5/6 FALLÓ (crear transacción) - ${transaccionPasarelaResult.getError().message}`);
      // La pasarela rechazó o falló: la Orden se persiste como FALLIDA/RECHAZADA para trazabilidad,
      // pero el stock NUNCA se descuenta (el reservarStock de arriba solo mutó el objeto en memoria).
      orden.marcarFallida();
      await this.ordenes.guardar(orden);
      console.log(`${LOG} Orden ${orden.id} guardada con estado FALLIDA`);
      return Result.fail(transaccionPasarelaResult.getError());
    }
    const resultadoPasarela = transaccionPasarelaResult.getValue();

    console.log();

    console.log(resultadoPasarela);

    console.log();

    console.log(
      `${LOG} Paso 5/6 OK - respuesta Wompi | idTransaccion=${resultadoPasarela.idTransaccionPasarela} estado=${resultadoPasarela.estado}`,
    );

    // --- Paso 6: interpretar el resultado y persistir todo de forma consistente ---
    const transaccion = TransaccionPago.crear({
      id: randomUUID(),
      ordenId: orden.id,
      referenciaPasarela: resultadoPasarela.idTransaccionPasarela,
      estado: resultadoPasarela.estado,
      ultimosCuatroDigitos: tarjeta.numero.ultimosCuatro(),
      numeroCuotas: input.numeroCuotas,
      respuestaCruda: resultadoPasarela.respuestaCruda,
    });

    if (resultadoPasarela.estado === 'DECLINED' || resultadoPasarela.estado === 'ERROR' || resultadoPasarela.estado === 'VOIDED') {
      console.warn(`${LOG} Paso 6/6 - Pago RECHAZADO por Wompi (estado=${resultadoPasarela.estado}). Guardando orden como RECHAZADA...`);
      orden.marcarRechazada();
      await this.ordenes.guardar(orden);
      await this.transacciones.guardar(transaccion);
      console.log(`${LOG} Fin | ordenId=${orden.id} resultado=RECHAZADA`);
      return Result.fail(new PasarelaRechazoError(resultadoPasarela.motivoRechazo ?? 'transacción no aprobada'));
    }

    if (resultadoPasarela.estado === 'PENDING') {
      // PENDING no es un error: Wompi sigue procesando (frecuente en tarjetas).
      // La orden se queda en PENDIENTE y el stock NO se descuenta todavía;
      // el frontend debe hacer polling a GET /pagos/:transaccionId/estado.
      console.log(`${LOG} Paso 6/6 - Pago PENDIENTE en Wompi. Guardando orden y transacción para consultar después...`);
      const guardarOrdenPendiente = await this.ordenes.guardar(orden);
      if (guardarOrdenPendiente.isFailure) {
        console.error(`${LOG} Paso 6/6 FALLÓ al guardar la orden pendiente - ${guardarOrdenPendiente.getError().message}`);
        return Result.fail(guardarOrdenPendiente.getError());
      }
      const guardarTransaccionPendiente = await this.transacciones.guardar(transaccion);
      if (guardarTransaccionPendiente.isFailure) {
        console.error(`${LOG} Paso 6/6 FALLÓ al guardar la transacción pendiente - ${guardarTransaccionPendiente.getError().message}`);
        return Result.fail(guardarTransaccionPendiente.getError());
      }
      console.log(`${LOG} Fin | ordenId=${orden.id} transaccionId=${transaccion.id} resultado=PENDIENTE`);
      return Result.ok({
        ordenId: orden.id,
        transaccionId: transaccion.id,
        estado: 'PENDIENTE',
        referenciaPasarela: transaccion.referenciaPasarela,
        montoTotalEnCentavos,
      });
    }

    console.log(`${LOG} Paso 6/6 - Pago APROBADO. Persistiendo orden, stock y transacción...`);
    orden.marcarAprobada();

    const guardarOrden = await this.ordenes.guardar(orden);
    if (guardarOrden.isFailure) {
      console.error(`${LOG} Paso 6/6 FALLÓ al guardar la orden - ${guardarOrden.getError().message}`);
      return Result.fail(guardarOrden.getError());
    }
    console.log(`${LOG} Paso 6/6 - Orden ${orden.id} guardada como APROBADA`);

    const guardarProducto = await this.productos.guardar(producto); // persiste el nuevo stock
    if (guardarProducto.isFailure) {
      console.error(`${LOG} Paso 6/6 FALLÓ al actualizar stock - ${guardarProducto.getError().message}`);
      return Result.fail(guardarProducto.getError());
    }
    console.log(`${LOG} Paso 6/6 - Stock de "${producto.nombre}" actualizado a ${producto.stock}`);

    const guardarTransaccion = await this.transacciones.guardar(transaccion);
    if (guardarTransaccion.isFailure) {
      console.error(`${LOG} Paso 6/6 FALLÓ al guardar la transacción - ${guardarTransaccion.getError().message}`);
      return Result.fail(guardarTransaccion.getError());
    }
    console.log(`${LOG} Paso 6/6 - Transacción ${transaccion.id} guardada`);

    console.log(`${LOG} Fin | ordenId=${orden.id} resultado=APROBADA montoTotalEnCentavos=${montoTotalEnCentavos}`);

    return Result.ok({
      ordenId: orden.id,
      transaccionId: transaccion.id,
      estado: 'APROBADA',
      referenciaPasarela: transaccion.referenciaPasarela,
      montoTotalEnCentavos,
    });
  }
}
