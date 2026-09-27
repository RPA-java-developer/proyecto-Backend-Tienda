import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

import { ListarProductosUseCase } from '../../application/use-cases/listar-productos.use-case';
import { mapearErrorDominioAHttp } from '@shared/http/error-http.mapper';

@Controller('productos')
export class ProductoController {
  constructor(private readonly listarProductos: ListarProductosUseCase) {}

  @Get()
  async listar(@Res() res: Response) {
    const resultado = await this.listarProductos.ejecutar();

    return resultado.match({
      onSuccess: (productos) => res.status(200).json({ status: 'OK', data: productos }),
      onFailure: (error) => {
        const { status, body } = mapearErrorDominioAHttp(error);
        return res.status(status).json(body);
      },
    });
  }
}
