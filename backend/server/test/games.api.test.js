// Testes HTTP dos endpoints REST (camada completa: rota -> middleware ->
// controller -> serviço -> chess.js), com repositório isolado por teste.

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createInMemoryGameRepository } from '../src/repositories/gameRepository.js';

const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

let app;
beforeEach(() => {
  app = createApp({ repository: createInMemoryGameRepository(), corsOrigins: ['http://localhost:5173'] });
});

async function criarPartida() {
  const res = await request(app).post('/api/games').expect(201);
  return res.body.data;
}

describe('POST /api/games — criação', () => {
  it('cria partida com id único e estado inicial', async () => {
    const res = await request(app).post('/api/games').expect(201);
    const game = res.body.data;

    expect(res.body.success).toBe(true);
    expect(game.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(game.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(game.turn).toBe('w');
    expect(game.status).toBe('active');
    expect(game.moveCount).toBe(0);
    expect(game.lastMove).toBeNull();
    expect(game.board).toHaveLength(8);
    expect(game.board[0][4]).toEqual({ square: 'e8', type: 'k', color: 'b' });
  });

  it('gera ids diferentes para partidas diferentes', async () => {
    const a = await criarPartida();
    const b = await criarPartida();
    expect(a.id).not.toBe(b.id);
  });
});

describe('GET /api/games/:id — consulta', () => {
  it('retorna a partida existente', async () => {
    const game = await criarPartida();
    const res = await request(app).get(`/api/games/${game.id}`).expect(200);
    expect(res.body.data.id).toBe(game.id);
  });

  it('retorna 404 para partida inexistente', async () => {
    const res = await request(app).get(`/api/games/${UUID_INEXISTENTE}`).expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('GAME_NOT_FOUND');
  });

  it('retorna 400 para identificador malformado', async () => {
    const res = await request(app).get('/api/games/nao-e-uuid').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/games/:id/legal-moves — movimentos possíveis', () => {
  it('lista os lances legais de uma casa', async () => {
    const game = await criarPartida();
    const res = await request(app)
      .get(`/api/games/${game.id}/legal-moves?square=e2`)
      .expect(200);

    const destinos = res.body.data.moves.map((m) => m.to).sort();
    expect(destinos).toEqual(['e3', 'e4']);
    expect(res.body.data.square).toBe('e2');
  });

  it('sem "square" lista todos os lances de quem tem a vez', async () => {
    const game = await criarPartida();
    const res = await request(app).get(`/api/games/${game.id}/legal-moves`).expect(200);
    expect(res.body.data.count).toBe(20);
  });

  it('casa sem peça retorna lista vazia (sem erro)', async () => {
    const game = await criarPartida();
    const res = await request(app)
      .get(`/api/games/${game.id}/legal-moves?square=e5`)
      .expect(200);
    expect(res.body.data.count).toBe(0);
  });

  it('rejeita casa com formato inválido', async () => {
    const game = await criarPartida();
    const res = await request(app)
      .get(`/api/games/${game.id}/legal-moves?square=z9`)
      .expect(400);
    expect(res.body.error.details.field).toBe('square');
  });

  it('retorna 404 para partida inexistente', async () => {
    await request(app)
      .get(`/api/games/${UUID_INEXISTENTE}/legal-moves?square=e2`)
      .expect(404);
  });
});

describe('POST /api/games/:id/moves — execução de movimentos', () => {
  it('executa jogada legal e devolve o estado atualizado', async () => {
    const game = await criarPartida();
    const res = await request(app)
      .post(`/api/games/${game.id}/moves`)
      .send({ from: 'e2', to: 'e4' })
      .expect(200);

    expect(res.body.data.lastMove.san).toBe('e4');
    expect(res.body.data.turn).toBe('b');
    expect(res.body.data.moveCount).toBe(1);
  });

  it('a jogada persiste: consulta posterior mostra o mesmo estado', async () => {
    const game = await criarPartida();
    await request(app).post(`/api/games/${game.id}/moves`).send({ from: 'e2', to: 'e4' }).expect(200);
    const res = await request(app).get(`/api/games/${game.id}`).expect(200);
    expect(res.body.data.moveCount).toBe(1);
    expect(res.body.data.turn).toBe('b');
  });

  it('rejeita jogada ilegal com 422', async () => {
    const game = await criarPartida();
    const res = await request(app)
      .post(`/api/games/${game.id}/moves`)
      .send({ from: 'e2', to: 'e5' })
      .expect(422);
    expect(res.body.error.code).toBe('ILLEGAL_MOVE');
  });

  it('rejeita corpo sem campos obrigatórios (400)', async () => {
    const game = await criarPartida();
    const res = await request(app)
      .post(`/api/games/${game.id}/moves`)
      .send({ from: 'e2' })
      .expect(400);
    expect(res.body.error.details.field).toBe('to');
  });

  it('rejeita promoção com valor fora de q/r/b/n (400)', async () => {
    const game = await criarPartida();
    const res = await request(app)
      .post(`/api/games/${game.id}/moves`)
      .send({ from: 'e2', to: 'e4', promotion: 'k' })
      .expect(400);
    expect(res.body.error.details.field).toBe('promotion');
  });

  it('rejeita JSON malformado (400)', async () => {
    const game = await criarPartida();
    const res = await request(app)
      .post(`/api/games/${game.id}/moves`)
      .set('Content-Type', 'application/json')
      .send('{"from": "e2"')
      .expect(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('retorna 404 ao jogar em partida inexistente', async () => {
    await request(app)
      .post(`/api/games/${UUID_INEXISTENTE}/moves`)
      .send({ from: 'e2', to: 'e4' })
      .expect(404);
  });

  it('retorna 409 ao tentar jogar após o fim da partida', async () => {
    const game = await criarPartida();
    for (const [from, to] of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']]) {
      await request(app).post(`/api/games/${game.id}/moves`).send({ from, to }).expect(200);
    }
    const res = await request(app)
      .post(`/api/games/${game.id}/moves`)
      .send({ from: 'a2', to: 'a3' })
      .expect(409);
    expect(res.body.error.code).toBe('GAME_OVER');
    expect(res.body.error.details.result).toBe('0-1');
  });

  it('executa promoção quando a peça é informada', async () => {
    const game = await criarPartida();
    const jogadas = [['h2', 'h4'], ['a7', 'a6'], ['h4', 'h5'], ['a6', 'a5'], ['h5', 'h6'], ['a5', 'a4'], ['h6', 'g7'], ['a4', 'a3']];
    for (const [from, to] of jogadas) {
      await request(app).post(`/api/games/${game.id}/moves`).send({ from, to }).expect(200);
    }
    const res = await request(app)
      .post(`/api/games/${game.id}/moves`)
      .send({ from: 'g7', to: 'h8', promotion: 'q' })
      .expect(200);
    expect(res.body.data.lastMove.promotion).toBe('q');
  });
});

describe('GET /api/games/:id/history — histórico', () => {
  it('lista os movimentos em ordem com PGN', async () => {
    const game = await criarPartida();
    await request(app).post(`/api/games/${game.id}/moves`).send({ from: 'e2', to: 'e4' });
    await request(app).post(`/api/games/${game.id}/moves`).send({ from: 'e7', to: 'e5' });

    const res = await request(app).get(`/api/games/${game.id}/history`).expect(200);
    const { moves, moveCount, pgn } = res.body.data;

    expect(moveCount).toBe(2);
    expect(moves.map((m) => m.san)).toEqual(['e4', 'e5']);
    expect(moves.map((m) => m.moveNumber)).toEqual([1, 1]);
    expect(moves[0].color).toBe('w');
    expect(moves[1].color).toBe('b');
    expect(pgn).toContain('1. e4 e5');
  });

  it('histórico vazio em partida nova', async () => {
    const game = await criarPartida();
    const res = await request(app).get(`/api/games/${game.id}/history`).expect(200);
    expect(res.body.data.moves).toEqual([]);
  });

  it('retorna 404 para partida inexistente', async () => {
    await request(app).get(`/api/games/${UUID_INEXISTENTE}/history`).expect(404);
  });
});

describe('rotas e cabeçalhos gerais', () => {
  it('rota inexistente retorna 404 padronizado', async () => {
    const res = await request(app).get('/api/nao-existe').expect(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('health check responde ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('libera CORS apenas para a origem configurada', async () => {
    const ok = await request(app)
      .get('/api/games')
      .set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const bloqueada = await request(app)
      .get('/api/games')
      .set('Origin', 'http://site-estranho.com');
    expect(bloqueada.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('configuração padrão de CORS', () => {
  it('libera localhost e 127.0.0.1 na porta do Vite por padrão', async () => {
    const { config } = await import('../src/config/index.js');
    const defaultApp = createApp({ repository: createInMemoryGameRepository(), corsOrigins: config.corsOrigins });
    for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173']) {
      const res = await request(defaultApp).get('/api/games').set('Origin', origin);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
    }
  });
});
