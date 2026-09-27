import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import type { Response } from 'express';

import { ProcesarPagoUseCase } from '../../application/use-cases/procesar-pago.use-case';
import { ConsultarEstadoTransaccionUseCase } from '../../application/use-cases/consultar-estado-transaccion.use-case';
import { ProcesarWebhookWompiUseCase } from '../../application/use-cases/procesar-webhook-wompi.use-case';
import { ProcesarPagoRequestDto } from './procesar-pago.request.dto';
import { mapearErrorDominioAHttp } from '@shared/http/error-http.mapper';
import { WompiEventoPayload } from '../wompi/wompi-evento.dto';

@Controller('pagos')
export class PagoController {
  constructor(
    private readonly procesarPago: ProcesarPagoUseCase,
    private readonly consultarEstadoTransaccion: ConsultarEstadoTransaccionUseCase,
    private readonly procesarWebhookWompi: ProcesarWebhookWompiUseCase,
  ) {}

  @Post()
  @HttpCode(200)
  async procesar(@Body() dto: ProcesarPagoRequestDto, @Res() res: Response) {
    const resultado = await this.procesarPago.ejecutar(dto);

    // El controlador es el ÚNICO lugar donde el Result se traduce a HTTP.
    // El caso de uso y el dominio no conocen Express ni códigos de estado.
    return resultado.match({
      onSuccess: (output) =>
        res.status(200).json({
          status: 'OK',
          data: output,
        }),
      onFailure: (error) => {
        const { status, body } = mapearErrorDominioAHttp(error);
        return res.status(status).json(body);
      },
    });
  }

  /** Pensado para polling desde el frontend React mientras el pago está PENDING. */
  @Get(':transaccionId/estado')
  @HttpCode(200)
  async consultarEstado(@Param('transaccionId', new ParseUUIDPipe()) transaccionId: string, @Res() res: Response) {
    const resultado = await this.consultarEstadoTransaccion.ejecutar(transaccionId);

    return resultado.match({
      onSuccess: (output) =>
        res.status(200).json({
          status: 'OK',
          data: output,
        }),
      onFailure: (error) => {
        const { status, body } = mapearErrorDominioAHttp(error);
        return res.status(status).json(body);
      },
    });
  }

  /**
   * Endpoint público que Wompi llama cuando el estado de una transacción cambia.
   * Configúralo en el Dashboard de Wompi (Sandbox y Producción por separado):
   *   https://tu-dominio.com/pagos/webhook
   * Debe responder 200 rápido; si responde error, Wompi reintenta el evento.
   */
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() payload: WompiEventoPayload, @Res() res: Response) {
    const resultado = await this.procesarWebhookWompi.ejecutar(payload);

    return resultado.match({
      onSuccess: () => res.status(200).json({ status: 'OK' }),
      onFailure: (error) => {
        const { status, body } = mapearErrorDominioAHttp(error);
        return res.status(status).json(body);
      },
    });
  }
}
