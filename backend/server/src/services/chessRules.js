// Camada de regras: ÚNICO ponto que conversa com o chess.js.
//
// Nenhuma regra de xadrez é implementada aqui. Este módulo apenas:
//  - reconstrói o tabuleiro a partir da lista de movimentos;
//  - traduz objetos do chess.js para o formato da API (JSON simples);
//  - interpreta o estado final (xeque-mate, empate, etc.).

import { Chess } from 'chess.js';

const RESULT_BY_WINNER = { w: '1-0', b: '0-1' };

// Monta uma instância do chess.js e aplica todos os movimentos registrados.
// Como cada movimento já foi validado quando foi executado, aqui qualquer
// erro indica dado corrompido, por isso é propagado sem tratamento silencioso.
export function buildEngine(moves = [], headers = {}) {
  const chess = new Chess();

  for (const [key, value] of Object.entries(headers)) {
    chess.setHeader(key, value);
  }

  for (const move of moves) {
    chess.move({ from: move.from, to: move.to, promotion: move.promotion });
  }

  return chess;
}

// Converte um objeto Move (chess.js) em um DTO serializável.
export function toMoveDto(move) {
  return {
    color: move.color,
    piece: move.piece,
    from: move.from,
    to: move.to,
    san: move.san,
    lan: move.lan,
    captured: move.captured ?? null,
    promotion: move.promotion ?? null,
    fenAfter: move.after,
    flags: {
      capture: move.isCapture(),
      promotion: move.isPromotion(),
      enPassant: move.isEnPassant(),
      kingsideCastle: move.isKingsideCastle(),
      queensideCastle: move.isQueensideCastle(),
      bigPawn: move.isBigPawn(),
    },
  };
}

// Interpreta o estado da partida usando somente métodos do chess.js.
// Ordem de verificação: xeque-mate, afogamento, depois os demais empates.
export function describeStatus(chess) {
  if (chess.isCheckmate()) {
    // Quem tem a vez está em xeque-mate, portanto perdeu.
    const winner = chess.turn() === 'w' ? 'b' : 'w';
    return {
      status: 'checkmate',
      winner,
      result: RESULT_BY_WINNER[winner],
      drawReason: null,
    };
  }

  if (chess.isStalemate()) {
    return { status: 'draw', winner: null, result: '1/2-1/2', drawReason: 'stalemate' };
  }

  if (chess.isInsufficientMaterial()) {
    return { status: 'draw', winner: null, result: '1/2-1/2', drawReason: 'insufficient_material' };
  }

  if (chess.isThreefoldRepetition()) {
    return { status: 'draw', winner: null, result: '1/2-1/2', drawReason: 'threefold_repetition' };
  }

  if (chess.isDrawByFiftyMoves()) {
    return { status: 'draw', winner: null, result: '1/2-1/2', drawReason: 'fifty_moves' };
  }

  return { status: 'active', winner: null, result: null, drawReason: null };
}

// Localiza a casa do rei do lado da vez quando ele está em xeque.
export function findCheckedKingSquare(chess) {
  if (!chess.inCheck()) return null;
  const [square] = chess.findPiece({ type: 'k', color: chess.turn() });
  return square ?? null;
}

// Representação do tabuleiro para o frontend: 8 linhas da 8ª para a 1ª fileira.
// Cada casa é null ou { square, type, color }.
export function serializeBoard(chess) {
  return chess.board().map((row) =>
    row.map((cell) =>
      cell
        ? { square: cell.square, type: cell.type, color: cell.color }
        : null,
    ),
  );
}

// Converte um registro + engine em DTO completo da partida.
export function serializeGame(record, chess) {
  const verboseHistory = chess.history({ verbose: true });
  const lastMove = verboseHistory.length ? toMoveDto(verboseHistory.at(-1)) : null;
  const state = describeStatus(chess);

  return {
    id: record.id,
    status: state.status,
    result: state.result,
    winner: state.winner,
    drawReason: state.drawReason,
    turn: chess.turn(),
    inCheck: chess.inCheck(),
    checkedKingSquare: findCheckedKingSquare(chess),
    fen: chess.fen(),
    pgn: chess.pgn(),
    board: serializeBoard(chess),
    moveCount: verboseHistory.length,
    lastMove,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
