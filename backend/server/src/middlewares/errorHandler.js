// Tratamento centralizado de erros. Converte qualquer exceção em resposta
// padronizada, sem vazar stack trace ao cliente.

import { sendError } from '../utils/response.js';

export function notFoundHandler(req, res) {
  sendError(res, 404, 'ROUTE_NOT_FOUND', `Rota não encontrada: ${req.method} ${req.originalUrl}`);
}

// Express exige 4 parâmetros para reconhecer um error handler.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // JSON malformado no corpo da requisição.
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_JSON', 'Corpo da requisição não é um JSON válido.');
  }

  if (err.name === 'ApiError' || err.status) {
    return sendError(res, err.status, err.code ?? 'REQUEST_ERROR', err.message, err.details ?? null);
  }

  console.error('[erro não tratado]', err);
  sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno do servidor.');
}
