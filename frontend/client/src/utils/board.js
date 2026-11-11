// Utilitários de EXIBIÇÃO do tabuleiro. Nenhuma regra de xadrez aqui:
// a validade dos lances vem sempre da API (chess.js no backend).

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// Símbolos Unicode das peças, indexados por cor + tipo.
const PIECE_SYMBOLS = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

export function pieceSymbol(piece) {
  return piece ? PIECE_SYMBOLS[`${piece.color}${piece.type}`] : '';
}

// Nome da casa a partir da posição na grade (linha 0 = 8ª fileira).
// Usado para casas vazias, que o backend devolve como null.
export function squareName(rowIndex, colIndex) {
  return `${FILES[colIndex]}${8 - rowIndex}`;
}

export const PIECE_NAMES = {
  p: 'Peão', n: 'Cavalo', b: 'Bispo', r: 'Torre', q: 'Dama', k: 'Rei',
};

// Calcula as marcações visuais de cada casa.
// Recebe apenas dados já validados pelo backend.
//   selected:          casa selecionada pelo jogador (ou null)
//   legalMoves:        lances legais da casa selecionada (vindos da API)
//   lastMove:          último lance executado (ou null)
//   checkedKingSquare: casa do rei em xeque (ou null)
export function computeSquareMarks({ selected, legalMoves = [], lastMove, checkedKingSquare }) {
  const marks = new Map();
  const mark = (square, flag) => {
    marks.set(square, { ...(marks.get(square) ?? {}), [flag]: true });
  };

  if (lastMove) {
    mark(lastMove.from, 'lastMove');
    mark(lastMove.to, 'lastMove');
  }

  if (checkedKingSquare) {
    mark(checkedKingSquare, 'check');
  }

  if (selected) {
    mark(selected, 'selected');
    for (const move of legalMoves) {
      // Em en passant, a casa capturada não é a de destino: o destino ainda recebe marcação.
      mark(move.to, move.flags?.capture ? 'capture' : 'target');
    }
  }

  return marks;
}

// Agrupa lances de promoção por casa de destino, para o diálogo de escolha.
export function promotionOptionsFor(legalMoves, to) {
  return legalMoves
    .filter((move) => move.to === to && move.promotion)
    .map((move) => move.promotion);
}

// Verdadeiro se a casa de destino corresponde a algum lance legal da seleção.
export function isLegalTarget(legalMoves, to) {
  return legalMoves.some((move) => move.to === to);
}
