import { Result } from './result';

describe('Result<T, E>', () => {
  describe('Result.ok / Result.fail', () => {
    it('crea un Success con isSuccess=true e isFailure=false', () => {
      const resultado = Result.ok<number, string>(42);
      expect(resultado.isSuccess).toBe(true);
      expect(resultado.isFailure).toBe(false);
      expect(resultado.getValue()).toBe(42);
    });

    it('crea un Failure con isSuccess=false e isFailure=true', () => {
      const resultado = Result.fail<string, number>('error');
      expect(resultado.isSuccess).toBe(false);
      expect(resultado.isFailure).toBe(true);
      expect(resultado.getError()).toBe('error');
    });
  });

  describe('getValue / getError - accesos indebidos', () => {
    it('getValue() lanza si el Result es Failure', () => {
      const resultado = Result.fail<string, number>('boom');
      expect(() => resultado.getValue()).toThrow();
    });

    it('getError() lanza si el Result es Success', () => {
      const resultado = Result.ok<number, string>(1);
      expect(() => resultado.getError()).toThrow();
    });
  });

  describe('map', () => {
    it('transforma el valor cuando es Success', () => {
      const resultado = Result.ok<number, string>(10).map((valor) => valor * 2);
      expect(resultado.isSuccess).toBe(true);
      expect(resultado.getValue()).toBe(20);
    });

    it('NO ejecuta la función cuando es Failure (se propaga el error)', () => {
      const fn = jest.fn((valor: number) => valor * 2);
      const resultado = Result.fail<string, number>('error').map(fn);
      expect(fn).not.toHaveBeenCalled();
      expect(resultado.isFailure).toBe(true);
      expect(resultado.getError()).toBe('error');
    });
  });

  describe('flatMap - el operador central de ROP', () => {
    it('encadena un paso exitoso tras otro exitoso', () => {
      const resultado = Result.ok<number, string>(5).flatMap((valor) => Result.ok<number, string>(valor + 1));
      expect(resultado.isSuccess).toBe(true);
      expect(resultado.getValue()).toBe(6);
    });

    it('corta la cadena si el primer paso falla (el segundo paso nunca se ejecuta)', () => {
      const segundoPaso = jest.fn((valor: number) => Result.ok<number, string>(valor + 1));
      const resultado = Result.fail<string, number>('falló el primer paso').flatMap(segundoPaso);

      expect(segundoPaso).not.toHaveBeenCalled();
      expect(resultado.isFailure).toBe(true);
      expect(resultado.getError()).toBe('falló el primer paso');
    });

    it('corta la cadena si un paso intermedio falla', () => {
      const tercerPaso = jest.fn((valor: number) => Result.ok<number, string>(valor));
      const resultado = Result.ok<number, string>(1)
        .flatMap(() => Result.fail<string, number>('falló el segundo paso'))
        .flatMap(tercerPaso);

      expect(tercerPaso).not.toHaveBeenCalled();
      expect(resultado.isFailure).toBe(true);
      expect(resultado.getError()).toBe('falló el segundo paso');
    });
  });

  describe('mapError', () => {
    it('transforma el error cuando es Failure', () => {
      const resultado = Result.fail<string, number>('crudo').mapError((error) => `traducido: ${error}`);
      expect(resultado.getError()).toBe('traducido: crudo');
    });

    it('NO se ejecuta cuando es Success', () => {
      const fn = jest.fn((error: string) => error.toUpperCase());
      const resultado = Result.ok<number, string>(1).mapError(fn);
      expect(fn).not.toHaveBeenCalled();
      expect(resultado.isSuccess).toBe(true);
    });
  });

  describe('match', () => {
    it('llama a onSuccess cuando es Success', () => {
      const salida = Result.ok<number, string>(7).match({
        onSuccess: (valor) => `ok:${valor}`,
        onFailure: (error) => `error:${error}`,
      });
      expect(salida).toBe('ok:7');
    });

    it('llama a onFailure cuando es Failure', () => {
      const salida = Result.fail<string, number>('mal').match({
        onSuccess: (valor) => `ok:${valor}`,
        onFailure: (error) => `error:${error}`,
      });
      expect(salida).toBe('error:mal');
    });
  });

  describe('combine', () => {
    it('retorna éxito con el arreglo de valores si TODOS son éxito', () => {
      const resultado = Result.combine<number, string>([Result.ok(1), Result.ok(2), Result.ok(3)]);
      expect(resultado.isSuccess).toBe(true);
      expect(resultado.getValue()).toEqual([1, 2, 3]);
    });

    it('retorna el PRIMER error si alguno falla', () => {
      const resultado = Result.combine<number, string>([Result.ok(1), Result.fail('primer error'), Result.fail('segundo error')]);
      expect(resultado.isFailure).toBe(true);
      expect(resultado.getError()).toBe('primer error');
    });
  });
});
