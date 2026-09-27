/**
 * Result<T, E>
 * ----------------------------------------------------------------------
 * Implementación propia y ligera del patrón Railway Oriented Programming.
 * No representa errores con excepciones: los representa como VALORES.
 * Cada caso de uso encadena pasos con `flatMap`, y solo hay un punto
 * de salida (`match`) donde se decide qué responder según el resultado.
 * ----------------------------------------------------------------------
 */
export abstract class Result<T, E> {
  abstract readonly isSuccess: boolean;

  abstract get isFailure(): boolean;

  /** Transforma el valor de éxito. No se ejecuta si el Result es Failure. */
  abstract map<U>(fn: (value: T) => U): Result<U, E>;

  /**
   * Encadena un paso que también devuelve Result<U, E>.
   * Es el operador central de ROP: si el Result actual es Failure,
   * el siguiente paso NUNCA se ejecuta (la vía de fallo se propaga).
   */
  abstract flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E>;

  /** Transforma el error. No se ejecuta si el Result es Success. */
  abstract mapError<F>(fn: (error: E) => F): Result<T, F>;

  /** Punto único de salida: obliga a manejar ambos caminos. */
  abstract match<U>(handlers: { onSuccess: (value: T) => U; onFailure: (error: E) => U }): U;

  /** Acceso directo al valor (lanza si es Failure). Úsalo solo tras validar isSuccess. */
  abstract getValue(): T;

  /** Acceso directo al error (lanza si es Success). Úsalo solo tras validar isFailure. */
  abstract getError(): E;

  static ok<T, E = never>(value: T): Result<T, E> {
    return new Success<T, E>(value);
  }

  static fail<E, T = never>(error: E): Result<T, E> {
    return new Failure<T, E>(error);
  }

  /**
   * Combina una lista de Result en uno solo.
   * Si TODOS son éxito, retorna éxito con el arreglo de valores.
   * Si alguno falla, retorna el PRIMER error encontrado.
   */
  static combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = [];
    for (const result of results) {
      if (result.isFailure) {
        return Result.fail<E, T[]>(result.getError());
      }
      values.push(result.getValue());
    }
    return Result.ok<T[], E>(values);
  }
}

class Success<T, E> extends Result<T, E> {
  readonly isSuccess = true;
  constructor(private readonly value: T) {
    super();
  }

  get isFailure(): boolean {
    return false;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return Result.ok<U, E>(fn(this.value));
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  mapError<F>(_fn: (error: E) => F): Result<T, F> {
    return Result.ok<T, F>(this.value);
  }

  match<U>(handlers: { onSuccess: (value: T) => U; onFailure: (error: E) => U }): U {
    return handlers.onSuccess(this.value);
  }

  getValue(): T {
    return this.value;
  }

  getError(): E {
    throw new Error('No se puede obtener el error de un Result exitoso (Success).');
  }
}

class Failure<T, E> extends Result<T, E> {
  readonly isSuccess = false;
  constructor(private readonly error: E) {
    super();
  }

  get isFailure(): boolean {
    return true;
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return Result.fail<E, U>(this.error);
  }

  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return Result.fail<E, U>(this.error);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    return Result.fail<F, T>(fn(this.error));
  }

  match<U>(handlers: { onSuccess: (value: T) => U; onFailure: (error: E) => U }): U {
    return handlers.onFailure(this.error);
  }

  getValue(): T {
    throw new Error('No se puede obtener el valor de un Result fallido (Failure).');
  }

  getError(): E {
    return this.error;
  }
}
