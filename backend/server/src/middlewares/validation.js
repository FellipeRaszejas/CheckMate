// Middlewares de validação de entrada.
//
// Validam formato (id, casa, peça de promoção) antes de chegar ao serviço.
// Não verificam regras de xadrez: isso é responsabilidade do chess.js,
// aplicada pelo gameService. Ex.: "e2" é formato válido; se é legal, o
// serviço decide.

import { ApiError } from '../utils/ApiError.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SQUARE_REGEX = /^[a-h][1-8]$/;
const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];

function isSquare(value) {
  return typeof value === 'string' && SQUARE_REGEX.test(value);
}

// Garante que :id é um UUID bem formado (partida inexistente continua sendo 404).
export function validateGameIdParam(req, res, next) {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    return next(new ApiError(400, 'VALIDATION_ERROR',
      'Identificador de partida inválido.', { field: 'id' }));
  }
  next();
}

// GET /legal-moves?square=e2 (square é opcional: sem ele, lista todos os lances de quem tem a vez).
export function validateLegalMovesQuery(req, res, next) {
  const { square } = req.query;

  if (square === undefined) {
    req.validatedSquare = null;
    return next();
  }

  if (!isSquare(square)) {
    return next(new ApiError(400, 'VALIDATION_ERROR',
      'Parâmetro "square" inválido. Use a notação de casa, ex.: e2.', { field: 'square' }));
  }

  req.validatedSquare = square;
  next();
}

// POST /moves { from, to, promotion? }
export function validateMoveBody(req, res, next) {
  const body = req.body ?? {};
  const { from, to, promotion } = body;

  if (!isSquare(from)) {
    return next(new ApiError(400, 'VALIDATION_ERROR',
      'Campo "from" é obrigatório e deve ser uma casa válida, ex.: e2.', { field: 'from' }));
  }

  if (!isSquare(to)) {
    return next(new ApiError(400, 'VALIDATION_ERROR',
      'Campo "to" é obrigatório e deve ser uma casa válida, ex.: e4.', { field: 'to' }));
  }

  if (promotion !== undefined && promotion !== null && !PROMOTION_PIECES.includes(promotion)) {
    return next(new ApiError(400, 'VALIDATION_ERROR',
      'Campo "promotion" deve ser q, r, b ou n.', { field: 'promotion' }));
  }

  req.validatedMove = { from, to, promotion: promotion ?? null };
  next();
}
