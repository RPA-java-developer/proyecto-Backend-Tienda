// Los casos de uso llenan la consola con console.log/warn/error a propósito
// (ver [ProcesarPago], [WompiAdapter], etc.). Eso es útil corriendo la app,
// pero ensucia el output de `npm test`. Aquí los silenciamos SOLO durante los tests;
// el código de producción no cambia.
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});
