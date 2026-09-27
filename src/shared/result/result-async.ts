import { Result } from './result';

/**
 * Los pasos que llaman a Wompi son asíncronos (HTTP), pero deben seguir
 * comportándose como una tubería ROP. Estos helpers permiten encadenar
 * Promise<Result<T,E>> sin romper el patrón ni recurrir a try/catch
 * disperso en los casos de uso.
 */

/** Encadena un paso async que recibe el valor y devuelve Result<U,E>. */
export async function flatMapAsync<T, U, E>(
  current: Promise<Result<T, E>>,
  fn: (value: T) => Promise<Result<U, E>>,
): Promise<Result<U, E>> {
  const result = await current;
  if (result.isFailure) {
    return Result.fail<E, U>(result.getError());
  }
  return fn(result.getValue());
}

/** Envuelve una función que puede lanzar (SDKs, HTTP clients) y la convierte en Result. */
export async function tryCatchAsync<T, E>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E,
): Promise<Result<T, E>> {
  try {
    const value = await fn();
    return Result.ok<T, E>(value);
  } catch (error) {
    return Result.fail<E, T>(onError(error));
  }
}
