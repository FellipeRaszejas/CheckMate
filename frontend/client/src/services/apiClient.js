// Cliente HTTP genérico. Único ponto que usa fetch no frontend.
//
// Responsabilidades:
//  - montar a URL a partir da base configurada;
//  - enviar JSON e interpretar o formato padronizado do backend;
//  - converter falhas (rede, HTTP, erro de domínio) em ApiRequestError.

export class ApiRequestError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', details = null } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function createApiClient({ baseUrl, fetchImpl = globalThis.fetch }) {
  const normalizedBase = baseUrl.replace(/\/+$/, '');

  async function request(method, path, body) {
    let response;
    try {
      response = await fetchImpl(`${normalizedBase}${path}`, {
        method,
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiRequestError(
        'Não foi possível conectar ao servidor. Verifique se o backend está em execução.',
        { code: 'NETWORK_ERROR' },
      );
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || !payload?.success) {
      const error = payload?.error;
      throw new ApiRequestError(
        error?.message ?? `Erro inesperado (HTTP ${response.status}).`,
        {
          status: response.status,
          code: error?.code ?? 'HTTP_ERROR',
          details: error?.details ?? null,
        },
      );
    }

    return payload.data;
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
  };
}
