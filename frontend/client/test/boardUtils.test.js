// Testes unitários das funções de exibição do tabuleiro (sem regras de xadrez).

import { describe, it, expect } from 'vitest';
import {
  squareName,
  pieceSymbol,
  computeSquareMarks,
  promotionOptionsFor,
  isLegalTarget,
} from '../src/utils/board.js';

describe('squareName', () => {
  it('converte posição da grade em nome de casa (linha 0 = 8ª fileira)', () => {
    expect(squareName(0, 0)).toBe('a8');
    expect(squareName(7, 7)).toBe('h1');
    expect(squareName(6, 4)).toBe('e2');
  });
});

describe('pieceSymbol', () => {
  it('usa símbolos distintos para brancas e pretas', () => {
    expect(pieceSymbol({ color: 'w', type: 'k' })).toBe('♔');
    expect(pieceSymbol({ color: 'b', type: 'k' })).toBe('♚');
    expect(pieceSymbol(null)).toBe('');
  });
});

describe('computeSquareMarks', () => {
  const legalMoves = [
    { to: 'e3', flags: { capture: false } },
    { to: 'e4', flags: { capture: false } },
    { to: 'd5', flags: { capture: true } },
  ];

  it('marca seleção, destinos e capturas separadamente', () => {
    const marks = computeSquareMarks({ selected: 'e2', legalMoves, lastMove: null, checkedKingSquare: null });
    expect(marks.get('e2')).toEqual({ selected: true });
    expect(marks.get('e3')).toEqual({ target: true });
    expect(marks.get('d5')).toEqual({ capture: true });
  });

  it('marca última jogada (origem e destino) e rei em xeque', () => {
    const marks = computeSquareMarks({
      selected: null,
      legalMoves: [],
      lastMove: { from: 'e7', to: 'e5' },
      checkedKingSquare: 'e1',
    });
    expect(marks.get('e7')).toEqual({ lastMove: true });
    expect(marks.get('e5')).toEqual({ lastMove: true });
    expect(marks.get('e1')).toEqual({ check: true });
  });

  it('sem seleção não marca destinos', () => {
    const marks = computeSquareMarks({ selected: null, legalMoves, lastMove: null, checkedKingSquare: null });
    expect(marks.size).toBe(0);
  });
});

describe('promoção e destinos legais', () => {
  const moves = [
    { to: 'h8', promotion: 'q' },
    { to: 'h8', promotion: 'r' },
    { to: 'h8', promotion: 'b' },
    { to: 'h8', promotion: 'n' },
    { to: 'h7', promotion: null },
  ];

  it('lista as peças de promoção disponíveis para a casa de destino', () => {
    expect(promotionOptionsFor(moves, 'h8')).toEqual(['q', 'r', 'b', 'n']);
    expect(promotionOptionsFor(moves, 'h7')).toEqual([]);
  });

  it('identifica se a casa é destino legal', () => {
    expect(isLegalTarget(moves, 'h7')).toBe(true);
    expect(isLegalTarget(moves, 'a1')).toBe(false);
  });
});
