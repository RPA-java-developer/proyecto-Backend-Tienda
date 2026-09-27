import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@shared/result';

import { TarjetaCredito } from '../../domain/tarjeta-credito.entity';
import { PasarelaNoDisponibleError, PasarelaRechazoError } from '../../domain/pagos.errors';
import {
  DatosTransaccionPago,
  PasarelaPagoPort,
  ResultadoTransaccionPasarela,
  TokenAceptacion,
  TokenTarjeta,
} from '../../application/ports/pasarela-pago.port';

import { WOMPI_CONFIG, WompiConfig } from './wompi.config';
import { calcularFirmaIntegridad } from './wompi-signature.util';

const LOG = '[WompiAdapter]';

@Injectable()
export class WompiAdapter implements PasarelaPagoPort {
  constructor(@Inject(WOMPI_CONFIG) private readonly config: WompiConfig) {}

  async obtenerTokenAceptacion(): Promise<Result<TokenAceptacion, PasarelaNoDisponibleError>> {
    console.log(`${LOG} GET /merchants/{publicKey} -> solicitando token de aceptación...`);
    try {
      const respuesta = await fetch(`${this.config.baseUrl}/merchants/${this.config.publicKey}`);
      console.log(`${LOG} GET /merchants respondió con status ${respuesta.status}`);
      if (!respuesta.ok) {
        return Result.fail(new PasarelaNoDisponibleError(`Wompi respondió ${respuesta.status} al consultar el comercio.`));
      }
      const cuerpo = await respuesta.json();
      const acceptanceToken = cuerpo?.data?.presigned_acceptance?.acceptance_token;
      if (!acceptanceToken) {
        console.error(`${LOG} No vino acceptance_token en la respuesta:`, cuerpo);
        return Result.fail(new PasarelaNoDisponibleError('Wompi no devolvió un token de aceptación válido.'));
      }
      console.log(`${LOG} acceptance_token obtenido correctamente`);
      return Result.ok({ acceptanceToken });
    } catch (error) {
      console.error(`${LOG} Excepción en GET /merchants:`, error);
      return Result.fail(new PasarelaNoDisponibleError((error as Error).message));
    }
  }

  async tokenizarTarjeta(
    tarjeta: TarjetaCredito,
  ): Promise<Result<TokenTarjeta, PasarelaRechazoError | PasarelaNoDisponibleError>> {
    console.log(`${LOG} POST /tokens/cards -> tokenizando tarjeta terminada en ${tarjeta.numero.ultimosCuatro()}...`);
    try {
      const respuesta = await fetch(`${this.config.baseUrl}/tokens/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.publicKey}`,
        },
        body: JSON.stringify({
          number: tarjeta.numero.valor,
          cvc: tarjeta.cvc.valor,
          exp_month: String(tarjeta.expiracion.mes).padStart(2, '0'),
          exp_year: String(tarjeta.expiracion.anio).slice(-2),
          card_holder: tarjeta.nombreEnTarjeta,
        }),
      });

      console.log(`${LOG} POST /tokens/cards respondió con status ${respuesta.status}`);
      const cuerpo = await respuesta.json();

      if (!respuesta.ok) {
        console.error(`${LOG} Tokenización rechazada:`, cuerpo);
        return Result.fail(new PasarelaRechazoError(cuerpo?.error?.reason ?? 'no fue posible tokenizar la tarjeta.'));
      }

      const cardToken = cuerpo?.data?.id;
      if (!cardToken) {
        console.error(`${LOG} No vino card token en la respuesta:`, cuerpo);
        return Result.fail(new PasarelaNoDisponibleError('Wompi no devolvió un token de tarjeta válido.'));
      }
      console.log(`${LOG} Tarjeta tokenizada correctamente (cardToken=${cardToken})`);
      return Result.ok({ cardToken });
    } catch (error) {
      console.error(`${LOG} Excepción en POST /tokens/cards:`, error);
      return Result.fail(new PasarelaNoDisponibleError((error as Error).message));
    }
  }

  async crearTransaccion(
    datos: DatosTransaccionPago,
    tokenTarjeta: TokenTarjeta,
    tokenAceptacion: TokenAceptacion,
  ): Promise<Result<ResultadoTransaccionPasarela, PasarelaRechazoError | PasarelaNoDisponibleError>> {
    const firma = calcularFirmaIntegridad({
      referencia: datos.referencia,
      montoEnCentavos: datos.montoEnCentavos,
      moneda: datos.moneda,
      secretoIntegridad: this.config.integritySecret,
    });

    console.log(
      `${LOG} POST /transactions -> referencia=${datos.referencia} monto=${datos.montoEnCentavos} moneda=${datos.moneda} cuotas=${datos.numeroCuotas}`,
    );

    try {
      const respuesta = await fetch(`${this.config.baseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.privateKey}`,
        },
        body: JSON.stringify({
          amount_in_cents: datos.montoEnCentavos,
          currency: datos.moneda,
          reference: datos.referencia,
          acceptance_token: tokenAceptacion.acceptanceToken,
          signature: firma,
          "customer_email": "comprador_prueba@example.com",
          payment_method: {
            type: 'CARD',
            token: tokenTarjeta.cardToken,
            installments: datos.numeroCuotas,
          },
        }),
      });

      console.log(`${LOG} POST /transactions respondió con status ${respuesta.status}`);
      const cuerpo = await respuesta.json();

      if (!respuesta.ok) {
        console.error(`${LOG} Transacción rechazada por Wompi:`, cuerpo);

        console.log(JSON.stringify(cuerpo, null, 2));

        return Result.fail(new PasarelaRechazoError(cuerpo?.error?.reason ?? 'la transacción fue rechazada.'));
      }

      const estado = cuerpo?.data?.status as ResultadoTransaccionPasarela['estado'] | undefined;
      const idTransaccionPasarela = cuerpo?.data?.id;
      if (!estado || !idTransaccionPasarela) {
        console.error(`${LOG} Respuesta incompleta de Wompi:`, cuerpo);
        return Result.fail(new PasarelaNoDisponibleError('Respuesta de Wompi incompleta al crear la transacción.'));
      }

      console.log(`${LOG} Transacción creada -> id=${idTransaccionPasarela} estado=${estado}`);

      return Result.ok({
        idTransaccionPasarela,
        estado,
        motivoRechazo: cuerpo?.data?.status_message,
        respuestaCruda: cuerpo,
      });
    } catch (error) {
      console.error(`${LOG} Excepción en POST /transactions:`, error);
      return Result.fail(new PasarelaNoDisponibleError((error as Error).message));
    }
  }

  async consultarTransaccion(
    idTransaccionPasarela: string,
  ): Promise<Result<ResultadoTransaccionPasarela, PasarelaNoDisponibleError>> {
    console.log(`${LOG} GET /transactions/${idTransaccionPasarela} -> consultando estado directo en Wompi...`);
    try {
      const respuesta = await fetch(`${this.config.baseUrl}/transactions/${idTransaccionPasarela}`, {
        headers: { Authorization: `Bearer ${this.config.privateKey}` },
      });

      console.log(`${LOG} GET /transactions/${idTransaccionPasarela} respondió con status ${respuesta.status}`);
      const cuerpo = await respuesta.json();

      if (!respuesta.ok) {
        return Result.fail(new PasarelaNoDisponibleError(`Wompi respondió ${respuesta.status} al consultar la transacción.`));
      }

      const estado = cuerpo?.data?.status as ResultadoTransaccionPasarela['estado'] | undefined;
      const idDevuelto = cuerpo?.data?.id;
      if (!estado || !idDevuelto) {
        return Result.fail(new PasarelaNoDisponibleError('Respuesta de Wompi incompleta al consultar la transacción.'));
      }

      console.log(`${LOG} Consulta directa OK -> id=${idDevuelto} estado=${estado}`);

      return Result.ok({
        idTransaccionPasarela: idDevuelto,
        estado,
        motivoRechazo: cuerpo?.data?.status_message,
        respuestaCruda: cuerpo,
      });
    } catch (error) {
      console.error(`${LOG} Excepción en GET /transactions/${idTransaccionPasarela}:`, error);
      return Result.fail(new PasarelaNoDisponibleError((error as Error).message));
    }
  }
}
