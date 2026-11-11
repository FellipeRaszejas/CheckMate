// Integração frontend ↔ backend REAL: sobe o Express de verdade e usa a
// camada de serviços do frontend (apiClient + gameApi) via HTTP.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../server/src/app.js';
import { createInMemoryGameRepository } from '../../server/src/repositories/gameRepository.js';
import { createApiClient, ApiRequestError } from '../src/services/apiClient.js';
import { createGameApi } from '../src/services/gameApi.js';

let server;
let api;

beforeAll(async () => {
  const app = createApp({ repository: createInMemoryGameRepository(), corsOrigins: [] });
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  api = createGameApi(createApiClient({ baseUrl: `http://127.0.0.1:${port}/api` }));
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('frontend → backend real (camada de serviços)', () => {
  it('cria partida e consulta o estado inicial', async () => {
    const game = await api.createGame();
    const consultada = await api.getGame(game.id);
    expect(consultada.id).toBe(game.id);
    expect(consultada.turn).toBe('w');
    expect(consultada.board[7][4]).toEqual({ square: 'e1', type: 'k', color: 'w' });
  });

  it('consulta lances legais de uma casa', async () => {
    const game = await api.createGame();
    const { moves } = await api.getLegalMoves(game.id, 'g1');
    expect(moves.map((m) => m.to).sort()).toEqual(['f3', 'h3']);
  });

  it('executa jogada e registra no histórico', async () => {
    const game = await api.createGame();
    const updated = await api.makeMove(game.id, { from: 'e2', to: 'e4' });
    expect(updated.turn).toBe('b');
    const { moves, pgn } = await api.getHistory(game.id);
    expect(moves.map((m) => m.san)).toEqual(['e4']);
    expect(pgn).toContain('1. e4');
  });

  it('jogada ilegal chega ao cliente como ApiRequestError com código', async () => {
    const game = await api.createGame();
    const err = await api.makeMove(game.id, { from: 'e2', to: 'e5' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err.code).toBe('ILLEGAL_MOVE');
    expect(err.status).toBe(422);
    expect(err.message).toMatch(/Movimento ilegal/);
  });

  it('partida inexistente gera ApiRequestError 404', async () => {
    const err = await api
      .getGame('00000000-0000-4000-8000-000000000000')
      .catch((e) => e);
    expect(err.status).toBe(404);
    expect(err.code).toBe('GAME_NOT_FOUND');
  });

  it('falha de rede é reportada com mensagem amigável', async () => {
    const offline = createGameApi(createApiClient({ baseUrl: 'http://127.0.0.1:1/api' }));
    const err = await offline.createGame().catch((e) => e);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.message).toMatch(/Não foi possível conectar/);
  });
});
