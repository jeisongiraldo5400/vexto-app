export class ApiError extends Error {
  /** Código estable del backend (`body.message.code`), p. ej. `CAJA_NO_ABIERTA`. */
  public code?: string;
  /** Campos extra que acompañan al código (`maximo`, `diferencia`, `sesionId`…). */
  public details?: Record<string, unknown>;

  constructor(
    public status: number,
    message: string,
    extra: { code?: string; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = extra.code;
    this.details = extra.details;
  }
}
