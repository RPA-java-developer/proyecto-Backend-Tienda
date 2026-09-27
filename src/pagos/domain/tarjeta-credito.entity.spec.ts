import { TarjetaCredito, CrearTarjetaCreditoProps } from './tarjeta-credito.entity';

function propsValidas(overrides: Partial<CrearTarjetaCreditoProps> = {}): CrearTarjetaCreditoProps {
  const anioFuturo = new Date().getFullYear() + 2;
  return {
    numeroTarjeta: '4242424242424242', // pasa Luhn
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

describe('TarjetaCredito.create', () => {
  it('crea la tarjeta cuando todos los datos son válidos', () => {
    const resultado = TarjetaCredito.create(propsValidas());
    expect(resultado.isSuccess).toBe(true);
    expect(resultado.getValue().numero.ultimosCuatro()).toBe('4242');
  });

  it('rechaza si no se aceptan términos y condiciones', () => {
    const resultado = TarjetaCredito.create(propsValidas({ aceptaTerminosYCondiciones: false }));
    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().field).toBe('aceptaTerminosYCondiciones');
  });

  it('rechaza un número de tarjeta que no pasa el algoritmo de Luhn', () => {
    const resultado = TarjetaCredito.create(propsValidas({ numeroTarjeta: '4242424242424241' }));
    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().field).toBe('numeroTarjeta');
  });

  it('rechaza un número de tarjeta con longitud inválida', () => {
    const resultado = TarjetaCredito.create(propsValidas({ numeroTarjeta: '123' }));
    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().field).toBe('numeroTarjeta');
  });

  it('rechaza una tarjeta ya expirada', () => {
    const resultado = TarjetaCredito.create(propsValidas({ mesExpiracion: 1, anioExpiracion: 2020 }));
    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().field).toBe('fechaExpiracion');
  });

  it('rechaza un mes de expiración fuera de rango', () => {
    const resultado = TarjetaCredito.create(propsValidas({ mesExpiracion: 13 }));
    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().field).toBe('mesExpiracion');
  });

  it('rechaza un CVC con formato inválido', () => {
    const resultado = TarjetaCredito.create(propsValidas({ cvc: 'abc' }));
    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().field).toBe('cvc');
  });

  it('rechaza un número de cuotas fuera de rango (0 o mayor a 36)', () => {
    expect(TarjetaCredito.create(propsValidas({ numeroCuotas: 0 })).isFailure).toBe(true);
    expect(TarjetaCredito.create(propsValidas({ numeroCuotas: 37 })).isFailure).toBe(true);
  });

  it('rechaza si falta el nombre en la tarjeta', () => {
    const resultado = TarjetaCredito.create(propsValidas({ nombreEnTarjeta: 'Jo' }));
    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().field).toBe('nombreEnTarjeta');
  });
});
