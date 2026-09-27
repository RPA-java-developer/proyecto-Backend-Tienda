import { Producto } from './producto.entity';

function crearProducto(stock = 10, precioEnCentavos = 5000000) {
  const resultado = Producto.create({
    id: 'prod-1',
    nombre: 'Camiseta',
    descripcion: 'Camiseta de prueba',
    stock,
    precioEnCentavos,
  });
  if (resultado.isFailure) throw new Error('Setup de test inválido');
  return resultado.getValue();
}

describe('Producto.create', () => {
  it('crea el producto cuando los datos son válidos', () => {
    const resultado = Producto.create({ id: '1', nombre: 'Camiseta', descripcion: 'Algodón', stock: 5, precioEnCentavos: 1000000 });
    expect(resultado.isSuccess).toBe(true);
  });

  it('rechaza stock negativo', () => {
    const resultado = Producto.create({ id: '1', nombre: 'Camiseta', descripcion: '', stock: -1, precioEnCentavos: 1000000 });
    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().field).toBe('stock');
  });

  it('rechaza precio en cero o negativo', () => {
    expect(Producto.create({ id: '1', nombre: 'X', descripcion: '', stock: 1, precioEnCentavos: 0 }).isFailure).toBe(true);
    expect(Producto.create({ id: '1', nombre: 'X', descripcion: '', stock: 1, precioEnCentavos: -100 }).isFailure).toBe(true);
  });

  it('rechaza nombre vacío o muy corto', () => {
    const resultado = Producto.create({ id: '1', nombre: 'A', descripcion: '', stock: 1, precioEnCentavos: 100 });
    expect(resultado.isFailure).toBe(true);
    expect(resultado.getError().field).toBe('nombre');
  });
});

describe('Producto.reservarStock', () => {
  it('descuenta el stock cuando hay suficiente', () => {
    const producto = crearProducto(10);
    const resultado = producto.reservarStock(3);
    expect(resultado.isSuccess).toBe(true);
    expect(producto.stock).toBe(7);
  });

  it('falla si se pide más stock del disponible, y NO modifica el stock', () => {
    const producto = crearProducto(2);
    const resultado = producto.reservarStock(5);
    expect(resultado.isFailure).toBe(true);
    expect(producto.stock).toBe(2); // el stock queda intacto, no se descuenta parcialmente
  });

  it('falla si la cantidad a reservar es cero o negativa', () => {
    const producto = crearProducto(10);
    expect(producto.reservarStock(0).isFailure).toBe(true);
    expect(producto.reservarStock(-1).isFailure).toBe(true);
    expect(producto.stock).toBe(10);
  });

  it('permite reservar exactamente todo el stock disponible', () => {
    const producto = crearProducto(5);
    const resultado = producto.reservarStock(5);
    expect(resultado.isSuccess).toBe(true);
    expect(producto.stock).toBe(0);
  });
});

describe('Producto.calcularMontoEnCentavos', () => {
  it('multiplica el precio por la cantidad', () => {
    const producto = crearProducto(10, 5000000); // $50.000,00
    expect(producto.calcularMontoEnCentavos(3)).toBe(15000000);
  });

  it('con cantidad 1, el monto es igual al precio unitario', () => {
    const producto = crearProducto(10, 5000000);
    expect(producto.calcularMontoEnCentavos(1)).toBe(5000000);
  });
});
