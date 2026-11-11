// Agregador de rotas da API (prefixo /api).
// Novas áreas (ex.: usuários nas próximas sprints) entram aqui.

import { Router } from 'express';
import { createGamesRouter } from './gamesRoutes.js';

export function createApiRouter({ controllers }) {
  const api = Router();

  api.use('/games', createGamesRouter({ controller: controllers.games }));

  return api;
}
