import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@shared/result';
import { PersistenceError } from '@shared/domain/domain-error';

import { PRODUCTO_REPOSITORY_PORT, ProductoRepositoryPort } from '../ports/producto-repository.port';

export interface ProductoListadoOutput {
  id: string;
  nombre: string;
  descripcion: string;
  stock: number;
  precioEnCentavos: number;
}

@Injectable()
export class ListarProductosUseCase {
  constructor(@Inject(PRODUCTO_REPOSITORY_PORT) private readonly productos: ProductoRepositoryPort) {}

  async ejecutar(): Promise<Result<ProductoListadoOutput[], PersistenceError>> {
    const resultado = await this.productos.listarTodos();
    if (resultado.isFailure) {
      return Result.fail(resultado.getError());
    }

    return Result.ok(
      resultado.getValue().map((producto) => ({
        id: producto.id,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        stock: producto.stock,
        precioEnCentavos: producto.precioEnCentavos,
      })),
    );
  }
}
