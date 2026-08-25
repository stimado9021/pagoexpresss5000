export type Resultado<T> =
  | { ok: true; message?: string; data?: T; status?: number; total?: number; limit?: number; offset?: number }
  | { ok: false; status: number; message: string }
