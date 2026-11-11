// Testes de regras de xadrez executados pelo serviço (que usa o chess.js).

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { createTestService, playUci, uci, errorOf } from './helpers.js';
import { describeStatus, findCheckedKingSquare } from '../src/services/chessRules.js';

async function newGame(service) {
  return service.createGame();
}

describe('movimentos legais e ilegais', () => {
  it('posição inicial tem 20 lances legais para as brancas', async () => {
    const service = createTestService();
    const game = await newGame(service);
    const legal = await service.getLegalMoves(game.id);
    expect(legal.count).toBe(20);
    expect(legal.turn).toBe('w');
  });

  it('cada tipo de peça tem os lances esperados na posição inicial', async () => {
    const service = createTestService();
    const { id } = await newGame(service);
    const destinosDe = async (square) =>
      (await service.getLegalMoves(id, square)).moves.map((m) => m.to).sort();

    expect(await destinosDe('e2')).toEqual(['e3', 'e4']); // peão
    expect(await destinosDe('g1')).toEqual(['f3', 'h3']); // cavalo
    expect(await destinosDe('a1')).toEqual([]); // torre bloqueada
    expect(await destinosDe('c1')).toEqual([]); // bispo bloqueado
    expect(await destinosDe('d1')).toEqual([]); // rainha bloqueada
    expect(await destinosDe('e1')).toEqual([]); // rei bloqueado
  });

  it('peça intermediária bloqueia torre, bispo e rainha', async () => {
    const service = createTestService();
    const game = await newGame(service);
    await expect(service.makeMove(game.id, uci('a1a3'))).rejects.toMatchObject({
      code: 'ILLEGAL_MOVE',
      status: 422,
    });
    await expect(service.makeMove(game.id, uci('f1c4'))).rejects.toMatchObject({
      code: 'ILLEGAL_MOVE',
    });
  });

  it('cavalo salta por cima de peças', async () => {
    const service = createTestService();
    const game = await newGame(service);
    const updated = await service.makeMove(game.id, uci('g1f3'));
    expect(updated.lastMove.san).toBe('Nf3');
  });

  it('rejeita movimento de casa vazia com mensagem específica', async () => {
    const service = createTestService();
    const game = await newGame(service);
    const err = await errorOf(service.makeMove(game.id, uci('e4e5')));
    expect(err.code).toBe('ILLEGAL_MOVE');
    expect(err.message).toMatch(/Não há peça na casa e4/);
  });

  it('rejeita peça que não pertence ao jogador da vez', async () => {
    const service = createTestService();
    const game = await newGame(service);
    const err = await errorOf(service.makeMove(game.id, uci('e7e5')));
    expect(err.code).toBe('ILLEGAL_MOVE');
    expect(err.message).toMatch(/não pertence ao jogador da vez/);
  });

  it('rei não pode se mover para casa atacada (proteção do próprio rei)', async () => {
    const service = createTestService();
    const game = await newGame(service);
    // 1.e4 f6 2.Qh5+ dá xeque ao rei em e8 pela diagonal h5-g6-f7-e8.
    await playUci(service, game.id, ['e2e4', 'f7f6', 'd1h5']);
    // f7 está atacada pela dama em h5: o rei não pode ir para lá.
    await expect(service.makeMove(game.id, uci('e8f7'))).rejects.toMatchObject({
      code: 'ILLEGAL_MOVE',
    });
  });
});

describe('capturas', () => {
  it('registra captura de peão com flag e peça capturada', async () => {
    const service = createTestService();
    const game = await newGame(service);
    const after = await playUci(service, game.id, ['e2e4', 'd7d5', 'e4d5']);
    expect(after.lastMove.flags.capture).toBe(true);
    expect(after.lastMove.captured).toBe('p');
    expect(after.lastMove.san).toBe('exd5');
  });

  it('lances legais de captura são identificados nas opções da casa', async () => {
    const service = createTestService();
    const game = await newGame(service);
    await playUci(service, game.id, ['e2e4', 'd7d5']);
    const legal = await service.getLegalMoves(game.id, 'e4');
    const captura = legal.moves.find((m) => m.to === 'd5');
    expect(captura.flags.capture).toBe(true);
  });
});

describe('alternância de turnos', () => {
  it('troca a vez a cada movimento', async () => {
    const service = createTestService();
    const game = await newGame(service);
    expect(game.turn).toBe('w');
    const afterWhite = await service.makeMove(game.id, uci('e2e4'));
    expect(afterWhite.turn).toBe('b');
    const afterBlack = await service.makeMove(game.id, uci('e7e5'));
    expect(afterBlack.turn).toBe('w');
    expect(afterBlack.moveCount).toBe(2);
  });
});

describe('movimentos especiais', () => {
  it('roque pequeno (O-O) com flag de castling', async () => {
    const service = createTestService();
    const game = await newGame(service);
    const after = await playUci(service, game.id, [
      'e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'e1g1',
    ]);
    expect(after.lastMove.san).toBe('O-O');
    expect(after.lastMove.flags.kingsideCastle).toBe(true);
    expect(after.fen).toContain('RNBQ1RK1');
  });

  it('roque grande (O-O-O) com flag de castling', async () => {
    const service = createTestService();
    const game = await newGame(service);
    const after = await playUci(service, game.id, [
      'd2d4', 'd7d5', 'b1c3', 'b8c6', 'c1f4', 'c8f5', 'd1d2', 'd8d7', 'e1c1',
    ]);
    expect(after.lastMove.san).toBe('O-O-O');
    expect(after.lastMove.flags.queensideCastle).toBe(true);
  });

  it('não permite roque com caminho bloqueado', async () => {
    const service = createTestService();
    const game = await newGame(service);
    await playUci(service, game.id, ['e2e4', 'e7e5', 'g1f3', 'b8c6']);
    await expect(service.makeMove(game.id, uci('e1g1'))).rejects.toMatchObject({
      code: 'ILLEGAL_MOVE',
    }); // f1 e g1 ainda ocupados
  });

  it('en passant remove o peão capturado', async () => {
    const service = createTestService();
    const game = await newGame(service);
    const after = await playUci(service, game.id, [
      'e2e4', 'a7a6', 'e4e5', 'd7d5', 'e5d6',
    ]);
    expect(after.lastMove.flags.enPassant).toBe(true);
    expect(after.lastMove.captured).toBe('p');
    // O peão de d5 deve ter sido removido do tabuleiro.
    expect(after.board[3][3]).toBeNull(); // linha 5 (índice 3), coluna d (índice 3)
  });

  it('en passant só é válido imediatamente após o avanço duplo', async () => {
    const service = createTestService();
    const game = await newGame(service);
    await playUci(service, game.id, ['e2e4', 'a7a6', 'e4e5', 'd7d5', 'a2a3', 'a6a5']);
    await expect(service.makeMove(game.id, uci('e5d6'))).rejects.toMatchObject({
      code: 'ILLEGAL_MOVE',
    });
  });
});

describe('promoção de peões', () => {
  // Sequência que leva o peão de h2 a capturar em g7 e chegar em h8.
  const ATE_PROMOCAO = ['h2h4', 'a7a6', 'h4h5', 'a6a5', 'h5h6', 'a5a4', 'h6g7', 'a4a3'];

  it('exige a peça de promoção em lance de promoção', async () => {
    const service = createTestService();
    const game = await newGame(service);
    await playUci(service, game.id, ATE_PROMOCAO);
    await expect(service.makeMove(game.id, uci('g7h8'))).rejects.toMatchObject({
      code: 'PROMOTION_REQUIRED',
      status: 400,
    });
  });

  it('oferece as quatro peças de promoção (q, r, b, n)', async () => {
    const service = createTestService();
    const game = await newGame(service);
    await playUci(service, game.id, ATE_PROMOCAO);
    const legal = await service.getLegalMoves(game.id, 'g7');
    const promocoes = legal.moves.filter((m) => m.to === 'h8').map((m) => m.promotion).sort();
    expect(promocoes).toEqual(['b', 'n', 'q', 'r']);
  });

  it.each(['q', 'r', 'b', 'n'])('promove para %s', async (peca) => {
    const service = createTestService();
    const game = await newGame(service);
    await playUci(service, game.id, ATE_PROMOCAO);
    const after = await service.makeMove(game.id, { from: 'g7', to: 'h8', promotion: peca });
    expect(after.lastMove.promotion).toBe(peca);
    expect(after.lastMove.flags.promotion).toBe(true);
    expect(after.board[0][7]).toEqual({ square: 'h8', type: peca, color: 'w' });
  });

  it('rejeita peça de promoção inválida (ex.: rei)', async () => {
    const service = createTestService();
    const game = await newGame(service);
    await playUci(service, game.id, ATE_PROMOCAO);
    await expect(
      service.makeMove(game.id, { from: 'g7', to: 'h8', promotion: 'k' }),
    ).rejects.toMatchObject({ code: 'INVALID_PROMOTION' });
  });

  it('rejeita promoção informada em lance que não é promoção', async () => {
    const service = createTestService();
    const game = await newGame(service);
    await expect(
      service.makeMove(game.id, { from: 'e2', to: 'e4', promotion: 'q' }),
    ).rejects.toMatchObject({ code: 'INVALID_PROMOTION' });
  });
});

describe('xeque, xeque-mate, empates e fim de partida', () => {
  it('identifica xeque e a casa do rei atacado', async () => {
    const service = createTestService();
    const game = await newGame(service);
    const after = await playUci(service, game.id, ['e2e4', 'f7f6', 'd1h5']);
    expect(after.inCheck).toBe(true);
    expect(after.status).toBe('active');
    expect(after.checkedKingSquare).toBe('e8');
  });

  it('xeque obriga a sair do xeque (lance que não resolve é ilegal)', async () => {
    const service = createTestService();
    const game = await newGame(service);
    await playUci(service, game.id, ['e2e4', 'f7f6', 'd1h5']);
    await expect(service.makeMove(game.id, uci('a7a6'))).rejects.toMatchObject({
      code: 'ILLEGAL_MOVE',
    });
    // g6 bloqueia a diagonal h5-e8.
    const after = await service.makeMove(game.id, uci('g7g6'));
    expect(after.inCheck).toBe(false);
  });

  it('xeque-mate do mate do pastor (fim de partida, vencedor brancas)', async () => {
    const service = createTestService();
    const game = await newGame(service);
    const after = await playUci(service, game.id, ['e2e4', 'e7e5', 'd1h5', 'b8c6', 'f1c4', 'g8f6', 'h5f7']);
    expect(after.status).toBe('checkmate');
    expect(after.winner).toBe('w');
    expect(after.result).toBe('1-0');
    expect(after.inCheck).toBe(true);
    expect(after.checkedKingSquare).toBe('e8');
  });

  it('xeque-mate do mate do louco (vencedor pretas)', async () => {
    const service = createTestService();
    const game = await newGame(service);
    const after = await playUci(service, game.id, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    expect(after.status).toBe('checkmate');
    expect(after.result).toBe('0-1');
    expect(after.winner).toBe('b');
    expect(after.turn).toBe('w');
  });

  it('rejeita movimentos após o encerramento da partida (409)', async () => {
    const service = createTestService();
    const game = await newGame(service);
    await playUci(service, game.id, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    const err = await errorOf(service.makeMove(game.id, uci('a2a3')));
    expect(err.status).toBe(409);
    expect(err.code).toBe('GAME_OVER');
    expect(err.details.status).toBe('checkmate');
  });

  it('empate por repetição tripla', async () => {
    const service = createTestService();
    const game = await newGame(service);
    const after = await playUci(service, game.id, [
      'g1f3', 'g8f6', 'f3g1', 'f6g8',
      'g1f3', 'g8f6', 'f3g1', 'f6g8',
    ]);
    expect(after.status).toBe('draw');
    expect(after.drawReason).toBe('threefold_repetition');
    expect(after.result).toBe('1/2-1/2');
  });
});

describe('empates pelas regras (verificação direta do estado)', () => {
  it('afogamento (stalemate) é empate', () => {
    const chess = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    const state = describeStatus(chess);
    expect(state).toMatchObject({ status: 'draw', drawReason: 'stalemate', result: '1/2-1/2' });
  });

  it('material insuficiente (rei contra rei) é empate', () => {
    const chess = new Chess('8/8/4k3/8/8/4K3/8/8 w - - 0 1');
    expect(describeStatus(chess)).toMatchObject({
      status: 'draw',
      drawReason: 'insufficient_material',
    });
  });

  it('regra dos 50 lances é empate', () => {
    const chess = new Chess('4k3/8/8/8/8/8/8/4K2R w - - 100 80');
    expect(describeStatus(chess)).toMatchObject({ status: 'draw', drawReason: 'fifty_moves' });
  });

  it('posição de xeque-mate informa o vencedor corretamente', () => {
    const chess = new Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
    expect(describeStatus(chess)).toMatchObject({ status: 'checkmate', winner: 'w', result: '1-0' });
  });

  it('posição normal permanece ativa', () => {
    const chess = new Chess();
    expect(describeStatus(chess)).toMatchObject({ status: 'active', result: null });
    expect(findCheckedKingSquare(chess)).toBeNull();
  });
});
