// Regras de orquestração das partidas.
//
// Responsabilidades:
//  - criar, consultar e atualizar partidas via repositório;
//  - validar a jogada em conjunto com o chess.js (via chessRules);
//  - decidir os códigos de erro de domínio (ApiError).
//
// Este serviço não conhece HTTP: não recebe req/res.

import { randomUUID } from 'node:crypto';
import { ApiError } from '../utils/ApiError.js';
import { buildEngine, serializeGame, toMoveDto } from './chessRules.js';


// Metadados PGN padrão de cada partida.
function buildHeaders(createdAt) {
  return {
    Event: 'Partida casual',
    Site: 'Plataforma de Xadrez',
    Date: createdAt.slice(0, 10).replaceAll('-', '.'),
    White: 'Branco',
    Black: 'Preto',
  };
}

export function createGameService({ repository }) {
  if (!repository) throw new Error('createGameService requer um repository');

  // Carrega a partida e reconstrói o engine. Lança 404 se não existir.
  async function loadGame(id) {
    const record = await repository.findById(id);
    if (!record) {
      throw new ApiError(404, 'GAME_NOT_FOUND', `Partida não encontrada: ${id}`);
    }
    return { record, chess: buildEngine(record.moves, buildHeaders(record.createdAt)) };
  }

  async function createGame() {
    const now = new Date().toISOString();
    const record = {
      id: randomUUID(),
      moves: [],
      createdAt: now,
      updatedAt: now,
    };
    await repository.create(record);
    const chess = buildEngine([], buildHeaders(now));
    return serializeGame(record, chess);
  }

  async function getGame(id) {
    const { record, chess } = await loadGame(id);
    return serializeGame(record, chess);
  }

  // Movimentos legais de uma casa (ou de todas as peças de quem tem a vez).
  // Usa chess.moves() com verbose: true para obter from/to/flags de cada lance.
  async function getLegalMoves(id, square = null) {
    const { chess } = await loadGame(id);
    const moves = square
      ? chess.moves({ square, verbose: true })
      : chess.moves({ verbose: true });

    return {
      gameId: id,
      turn: chess.turn(),
      square,
      count: moves.length,
      moves: moves.map(toMoveDto),
    };
  }

  // Explica por que uma casa de origem não produz movimento legal.
  function explainNoMove(chess, from, to) {
    const piece = chess.get(from);
    if (!piece) {
      return `Não há peça na casa ${from}.`;
    }
    if (piece.color !== chess.turn()) {
      return `A peça em ${from} não pertence ao jogador da vez.`;
    }
    return `Movimento ilegal: ${from} para ${to}.`;
  }

  async function makeMove(id, { from, to, promotion = null }) {
    const { record, chess } = await loadGame(id);

    if (chess.isGameOver()) {
      const state = serializeGame(record, chess);
      throw new ApiError(409, 'GAME_OVER', 'A partida já foi encerrada.', {
        status: state.status,
        result: state.result,
        drawReason: state.drawReason,
      });
    }

    // Candidatos = lances legais de 'from' que chegam em 'to'.
    // Em promoção, o chess.js gera um candidato por peça de promoção.
    const candidates = chess
      .moves({ square: from, verbose: true })
      .filter((move) => move.to === to);

    if (candidates.length === 0) {
      throw new ApiError(422, 'ILLEGAL_MOVE', explainNoMove(chess, from, to), { from, to });
    }

    const isPromotionMove = candidates.some((move) => move.isPromotion());

    if (isPromotionMove && !promotion) {
      throw new ApiError(400, 'PROMOTION_REQUIRED',
        'Esta jogada é uma promoção. Informe a peça: q, r, b ou n.', { from, to });
    }

    if (promotion && !isPromotionMove) {
      throw new ApiError(400, 'INVALID_PROMOTION',
        'A peça de promoção só pode ser informada em jogadas de promoção.', { from, to });
    }

    if (promotion && !candidates.some((move) => move.promotion === promotion)) {
      throw new ApiError(400, 'INVALID_PROMOTION',
        `Peça de promoção inválida para esta jogada: ${promotion}.`, { from, to, promotion });
    }

    // Aqui a jogada já está validada. O chess.js aplica e atualiza o estado.
    const applied = chess.move({ from, to, promotion: promotion ?? undefined });

    record.moves.push({
      from: applied.from,
      to: applied.to,
      ...(applied.promotion ? { promotion: applied.promotion } : {}),
    });
    record.updatedAt = new Date().toISOString();
    await repository.update(record);

    return serializeGame(record, chess);
  }

  async function getHistory(id) {
    const { record, chess } = await loadGame(id);
    const moves = chess.history({ verbose: true }).map((move, index) => ({
      ply: index + 1,
      moveNumber: Math.floor(index / 2) + 1,
      ...toMoveDto(move),
    }));

    return {
      gameId: record.id,
      moveCount: moves.length,
      moves,
      pgn: chess.pgn(),
    };
  }

  return { createGame, getGame, getLegalMoves, makeMove, getHistory };
}
