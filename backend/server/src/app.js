// Montagem da aplicação Express. Recebe as dependências (injeção), o que
// permite criar instâncias isoladas nos testes com repositório próprio.

import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { createInMemoryGameRepository } from './repositories/gameRepository.js';
import { createGameService } from './services/gameService.js';
import { createGamesController } from './controllers/gamesController.js';
import { createApiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

export function createApp({
  repository = createInMemoryGameRepository(),
  corsOrigins = config.corsOrigins,
} = {}) {
  const app = express();

  const gameService = createGameService({ repository });
  const controllers = {
    games: createGamesController({ gameService }),
  };

  app.disable('x-powered-by');
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
  app.use('/api', createApiRouter({ controllers }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
