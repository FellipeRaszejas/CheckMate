// Controllers: traduzem a requisição HTTP em chamadas ao serviço e
// devolvem a resposta padronizada. Não contêm regra de negócio.

import { sendSuccess } from '../utils/response.js';

export function createGamesController({ gameService }) {
  return {
    async create(req, res) {
      const game = await gameService.createGame();
      sendSuccess(res, game, 201);
    },

    async getById(req, res) {
      const game = await gameService.getGame(req.params.id);
      sendSuccess(res, game);
    },

    async getLegalMoves(req, res) {
      const result = await gameService.getLegalMoves(req.params.id, req.validatedSquare);
      sendSuccess(res, result);
    },

    async makeMove(req, res) {
      const game = await gameService.makeMove(req.params.id, req.validatedMove);
      sendSuccess(res, game);
    },

    async getHistory(req, res) {
      const history = await gameService.getHistory(req.params.id);
      sendSuccess(res, history);
    },
  };
}
