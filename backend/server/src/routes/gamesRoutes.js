// Mapeamento das rotas de partidas para controllers + middlewares de validação.

import { Router } from 'express';
import {
  validateGameIdParam,
  validateLegalMovesQuery,
  validateMoveBody,
} from '../middlewares/validation.js';

export function createGamesRouter({ controller }) {
  const router = Router();

  router.post('/', controller.create);

  router.get('/:id', validateGameIdParam, controller.getById);

  router.get(
    '/:id/legal-moves',
    validateGameIdParam,
    validateLegalMovesQuery,
    controller.getLegalMoves,
  );

  router.post('/:id/moves', validateGameIdParam, validateMoveBody, controller.makeMove);

  router.get('/:id/history', validateGameIdParam, controller.getHistory);

  return router;
}
