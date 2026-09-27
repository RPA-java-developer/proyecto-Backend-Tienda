/**
 * Todos los errores que viajan por la "vía de fallo" del ROP
 * extienden esta clase. `code` es lo que el controlador usa para
 * mapear a un status HTTP; `message` es apto para mostrar al usuario.
 */
export abstract class DomainError {
  abstract readonly code: string;
  constructor(public readonly message: string) {}
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string, public readonly field?: string) {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  constructor(entity: string, id: string) {
    super(`${entity} con id "${id}" no fue encontrado.`);
  }
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
  constructor(message: string) {
    super(message);
  }
}

export class PersistenceError extends DomainError {
  readonly code = 'PERSISTENCE_ERROR';
  constructor(message: string) {
    super(message);
  }
}
