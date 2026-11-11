// Erro de domínio/HTTP. Qualquer ApiError lançado nas camadas internas
// é convertido em resposta padronizada pelo errorHandler.
export class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
