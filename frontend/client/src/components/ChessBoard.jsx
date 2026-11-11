// Tabuleiro 8 x 8. Recebe o tabuleiro já calculado pelo backend e as marcações
// de exibição; não sabe nada sobre regras de xadrez.

import { FILES, pieceSymbol, squareName, PIECE_NAMES } from '../utils/board.js';

const MARK_CLASSES = {
  selected: 'sq-selected',
  target: 'sq-target',
  capture: 'sq-capture',
  lastMove: 'sq-last',
  check: 'sq-check',
};

function describeSquare(square, cell) {
  if (!cell) return `Casa ${square}, vazia`;
  return `Casa ${square}, ${PIECE_NAMES[cell.type]} ${cell.color === 'w' ? 'branco' : 'preto'}`;
}

export default function ChessBoard({ board, marks, turn, disabled, onSquareClick }) {
  return (
    <div className="board" role="grid" aria-label="Tabuleiro de xadrez">
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const square = cell?.square ?? squareName(rowIndex, colIndex);
          const squareMarks = marks.get(square) ?? {};
          const classes = [
            'square',
            (rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark',
            ...Object.entries(squareMarks)
              .filter(([, active]) => active)
              .map(([flag]) => MARK_CLASSES[flag]),
          ].join(' ');

          const isOwnPiece = cell !== null && cell.color === turn;

          return (
            <button
              key={square}
              type="button"
              role="gridcell"
              className={classes}
              aria-label={describeSquare(square, cell)}
              disabled={disabled}
              onClick={() => onSquareClick(square, isOwnPiece)}
            >
              {colIndex === 0 && <span className="rank-label">{8 - rowIndex}</span>}
              {rowIndex === 7 && <span className="file-label">{FILES[colIndex]}</span>}
              {cell && (
                <span className={`piece ${cell.color === 'w' ? 'white' : 'black'}`}>
                  {pieceSymbol(cell)}
                </span>
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}
