// Camada de serviços de partidas: traduz ações do jogo em endpoints REST.
// Os componentes React usam apenas estas funções; nunca chamam fetch direto.

import { createApiClient } from './apiClient.js';

export function createGameApi(client) {
  return {
    createGame: () => client.post('/games'),

    getGame: (gameId) => client.get(`/games/${encodeURIComponent(gameId)}`),

    // square é opcional: sem ele, a API lista todos os lances de quem tem a vez.
    getLegalMoves: (gameId, square) => {
      const query = square ? `?square=${encodeURIComponent(square)}` : '';
      return client.get(`/games/${encodeURIComponent(gameId)}/legal-moves${query}`);
    },

    makeMove: (gameId, { from, to, promotion = null }) =>
      client.post(`/games/${encodeURIComponent(gameId)}/moves`, {
        from,
        to,
        ...(promotion ? { promotion } : {}),
      }),

    getHistory: (gameId) => client.get(`/games/${encodeURIComponent(gameId)}/history`),
  };
}

// Instância padrão usada pelo aplicativo. A URL vem de VITE_API_URL.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const gameApi = createGameApi(createApiClient({ baseUrl: API_BASE_URL }));
