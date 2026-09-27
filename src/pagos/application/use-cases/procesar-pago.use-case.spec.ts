import { Result } from '@shared/result';
import { NotFoundError } from '@shared/domain/domain-error';

import { Usuario } from '../../../usuarios/domain/usuario.entity';
import { UsuarioRepositoryPort } from '../../../usuarios/application/ports/usuario-repository.port';

import { Producto } from '../../../productos/domain/producto.entity';
import { ProductoRepositoryPort } from '../../../productos/application/ports/producto-repository.port';

import { OrdenRepositoryPort } from '../ports/orden-repository.port';
import { TransaccionPagoRepositoryPort } from '../ports/transaccion-pago-repository.port';
import { PasarelaPagoPort, ResultadoTransaccionPasarela } from '../ports/pasarela-pago.port';
import { PasarelaRechazoError, PasarelaNoDisponibleError } from '../../domain/pagos.errors';

import { ProcesarPagoUseCase } from './procesar-pago.use-case';
import { ProcesarPagoInput } from './procesar-pago.dto';

// ---------- Helpers de datos válidos ----------

function usuarioDePrueba(): Usuario {
  const resultado = Usuario.create({
    id: 'usuario-1',
    nombreCompleto: 'Juan Perez',
    correoElectronico: 'juan@example.com',
    telefono: '3001234567',
    tipoDocumento: 'CC',
    numeroDocumento: '1020304050',
  });
  if (resultado.isFailure) throw new Error('Setup de test inválido (Usuario)');
  return resultado.getValue();
}

function productoDePrueba(stock = 10, precioEnCentavos = 5000000): Producto {
  const resultado = Producto.create({
    id: 'producto-1',
    nombre: 'Camiseta',
    descripcion: 'Camiseta de prueba',
    stock,
    precioEnCentavos,
  });
  if (resultado.isFailure) throw new Error('Setup de test inválido (Producto)');
  return resultado.getValue();
}

function inputValido(overrides: Partial<ProcesarPagoInput> = {}): ProcesarPagoInput {
  const anioFuturo = new Date().getFullYear() + 2;
  return {
    usuarioId: 'usuario-1',
    productoId: 'producto-1',
    cantidad: 2,
    moneda: 'COP',
    numeroTarjeta: '4242424242424242',
    mesExpiracion: 12,
    anioExpiracion: anioFuturo,
    cvc: '123',
    nombreEnTarjeta: 'Juan Perez',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '1020304050',
    numeroCuotas: 1,
    aceptaTerminosYCondiciones: true,
    ...overrides,
  };
}

function resultadoPasarela(overrides: Partial<ResultadoTransaccionPasarela> = {}): ResultadoTransaccionPasarela {
  return {
    idTransaccionPasarela: 'wompi-tx-1',
    estado: 'APPROVED',
    respuestaCruda: {},
    ...overrides,
  };
}

// ---------- Fábrica de mocks (uno nuevo por test, para no arrastrar estado) ----------

function crearMocks() {
  const usuarios: jest.Mocked<UsuarioRepositoryPort> = {
    buscarPorId: jest.fn(),
  };
  const productos: jest.Mocked<ProductoRepositoryPort> = {
    buscarPorId: jest.fn(),
    guardar: jest.fn(),
    listarTodos: jest.fn(),
  };
  const ordenes: jest.Mocked<OrdenRepositoryPort> = {
    guardar: jest.fn(),
    buscarPorId: jest.fn(),
  };
  const transacciones: jest.Mocked<TransaccionPagoRepositoryPort> = {
    guardar: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorOrdenId: jest.fn(),
  };
  const pasarela: jest.Mocked<PasarelaPagoPort> = {
    obtenerTokenAceptacion: jest.fn(),
    tokenizarTarjeta: jest.fn(),
    crearTransaccion: jest.fn(),
    consultarTransaccion: jest.fn(),
  };

  // Happy path por defecto; cada test sobreescribe lo que necesite.
  usuarios.buscarPorId.mockResolvedValue(Result.ok(usuarioDePrueba()));
  productos.buscarPorId.mockResolvedValue(Result.ok(productoDePrueba()));
  productos.guardar.mockResolvedValue(Result.ok(undefined));
  ordenes.guardar.mockResolvedValue(Result.ok(undefined));
  transacciones.guardar.mockResolvedValue(Result.ok(undefined));
  pasarela.obtenerTokenAceptacion.mockResolvedValue(Result.ok({ acceptanceToken: 'accept-token' }));
  pasarela.tokenizarTarjeta.mockResolvedValue(Result.ok({ cardToken: 'card-token' }));
  pasarela.crearTransaccion.mockResolvedValue(Result.ok(resultadoPasarela()));

  const useCase = new ProcesarPagoUseCase(usuarios, productos, ordenes, transacciones, pasarela);

  return { usuarios, productos, ordenes, transacciones, pasarela, useCase };
}

// ---------- Tests ----------

describe('ProcesarPagoUseCase', () => {
  it('camino feliz: pago APROBADO descuenta stock y persiste todo', async () => {
    const { productos, ordenes, transacciones, useCase } = crearMocks();

    const resultado = await useCase.ejecutar(inputValido({ cantidad: 3 }));

    expect(resultado.isSuccess).toBe(true);
    const salida = resultado.getValue();
    expect(salida.estado).toBe('APROBADA');
    expect(salida.montoTotalEnCentavos).toBe(15000000); // 5.000.000 x 3

    expect(ordenes.guardar).toHaveBeenCalledTimes(1);
    expect(productos.guardar).toHaveBeenCalledTimes(1);
    expect(transacciones.guardar).toHaveBeenCalledTimes(1);

    // El producto guardado debe reflejar el stock ya descontado.
    const productoGuardado = productos.guardar.mock.calls[0][0];
    expect(productoGuardado.stock).toBe(7); // 10 - 3
  });

  it('el monto se calcula como precio x cantidad y se envía así a la pasarela', async () => {
    const { productos, pasarela, useCase } = crearMocks();
    productos.buscarPorId.mockResolvedValue(Result.ok(productoDePrueba(10, 1000000))); // precio $10.000

    await useCase.ejecutar(inputValido({ cantidad: 4 }));

    expect(pasarela.crearTransaccion).toHaveBeenCalledWith(
      expect.objectContaining({ montoEnCentavos: 4000000 }), // 1.000.000 x 4
      expect.anything(),
      expect.anything(),
    );
  });

  it('tarjeta inválida: corta antes de consultar cualquier puerto externo', async () => {
    const { usuarios, pasarela, useCase } = crearMocks();

    const resultado = await useCase.ejecutar(inputValido({ numeroTarjeta: '1234' })); // no pasa Luhn

    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().code).toBe('VALIDATION_ERROR');
    expect(usuarios.buscarPorId).not.toHaveBeenCalled();
    expect(pasarela.obtenerTokenAceptacion).not.toHaveBeenCalled();
  });

  it('usuario no encontrado: corta antes de tocar el producto o la pasarela', async () => {
    const { usuarios, productos, pasarela, useCase } = crearMocks();
    usuarios.buscarPorId.mockResolvedValue(Result.fail(new NotFoundError('Usuario', 'usuario-1')));

    const resultado = await useCase.ejecutar(inputValido());

    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().code).toBe('NOT_FOUND');
    expect(productos.buscarPorId).not.toHaveBeenCalled();
    expect(pasarela.obtenerTokenAceptacion).not.toHaveBeenCalled();
  });

  it('stock insuficiente: corta antes de llamar a la pasarela, y no crea la orden', async () => {
    const { productos, ordenes, pasarela, useCase } = crearMocks();
    productos.buscarPorId.mockResolvedValue(Result.ok(productoDePrueba(1))); // solo 1 disponible

    const resultado = await useCase.ejecutar(inputValido({ cantidad: 5 }));

    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().code).toBe('STOCK_INSUFICIENTE');
    expect(pasarela.obtenerTokenAceptacion).not.toHaveBeenCalled();
    expect(ordenes.guardar).not.toHaveBeenCalled();
  });

  it('la pasarela rechaza al crear la transacción: la orden se guarda como FALLIDA, el stock NO se persiste', async () => {
    const { productos, ordenes, transacciones, pasarela, useCase } = crearMocks();
    pasarela.crearTransaccion.mockResolvedValue(Result.fail(new PasarelaRechazoError('fondos insuficientes')));

    const resultado = await useCase.ejecutar(inputValido());

    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().code).toBe('PASARELA_RECHAZO');
    expect(ordenes.guardar).toHaveBeenCalledTimes(1);
    expect(ordenes.guardar.mock.calls[0][0].estado).toBe('FALLIDA');
    expect(productos.guardar).not.toHaveBeenCalled();
    expect(transacciones.guardar).not.toHaveBeenCalled();
  });

  it('la pasarela responde DECLINED: la orden queda RECHAZADA y el stock NO se descuenta', async () => {
    const { productos, ordenes, transacciones, pasarela, useCase } = crearMocks();
    pasarela.crearTransaccion.mockResolvedValue(Result.ok(resultadoPasarela({ estado: 'DECLINED', motivoRechazo: 'fondos' })));

    const resultado = await useCase.ejecutar(inputValido());

    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().code).toBe('PASARELA_RECHAZO');
    expect(ordenes.guardar.mock.calls[0][0].estado).toBe('RECHAZADA');
    expect(transacciones.guardar).toHaveBeenCalledTimes(1);
    expect(productos.guardar).not.toHaveBeenCalled(); // el stock nunca se persiste
  });

  it('la pasarela responde PENDING: se guarda orden y transacción, pero el stock NO se descuenta', async () => {
    const { productos, ordenes, transacciones, pasarela, useCase } = crearMocks();
    pasarela.crearTransaccion.mockResolvedValue(Result.ok(resultadoPasarela({ estado: 'PENDING' })));

    const resultado = await useCase.ejecutar(inputValido());

    expect(resultado.isSuccess).toBe(true);
    expect(resultado.getValue().estado).toBe('PENDIENTE');
    expect(ordenes.guardar).toHaveBeenCalledTimes(1);
    expect(transacciones.guardar).toHaveBeenCalledTimes(1);
    expect(productos.guardar).not.toHaveBeenCalled();
  });

  it('si obtenerTokenAceptacion falla, no se tokeniza la tarjeta ni se crea la orden', async () => {
    const { ordenes, pasarela, useCase } = crearMocks();
    pasarela.obtenerTokenAceptacion.mockResolvedValue(Result.fail(new PasarelaNoDisponibleError('timeout')));

    const resultado = await useCase.ejecutar(inputValido());

    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().code).toBe('PASARELA_NO_DISPONIBLE');
    expect(pasarela.tokenizarTarjeta).not.toHaveBeenCalled();
    expect(ordenes.guardar).not.toHaveBeenCalled();
  });
});
