// Estado da partida no frontend. O estado oficial está no backend: este hook
// apenas guarda a última resposta da API e a seleção visual do jogador.

import { useCallback, useEffect, useRef, useState } from 'react';
import { promotionOptionsFor, isLegalTarget } from '../utils/board.js';

export function useChessGame(gameApi) {
  const [game, setGame] = useState(null);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Evita que respostas antigas de "legal-moves" sobrescrevam a seleção atual.
  const selectionToken = useRef(0);

  const runAction = useCallback(async (action) => {
    setBusy(true);
    setError(null);
    try {
      return await action();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    selectionToken.current += 1;
    setSelected(null);
    setLegalMoves([]);
    setPendingPromotion(null);
  }, []);

  const newGame = useCallback(async () => {
    clearSelection();
    setHistory([]);
    const created = await runAction(() => gameApi.createGame());
    if (created) setGame(created);
  }, [gameApi, runAction, clearSelection]);

  useEffect(() => {
    newGame();
  }, [newGame]);

  // Executa o lance e busca o histórico ANTES de atualizar a tela, para que
  // partida e histórico mudem juntos (nunca um status sem o lance correspondente).
  const executeMove = useCallback(
    async (from, to, promotion = null) => {
      const result = await runAction(async () => {
        const updated = await gameApi.makeMove(game.id, { from, to, promotion });
        const { moves } = await gameApi.getHistory(updated.id);
        return { updated, moves };
      });
      if (!result) return;
      setGame(result.updated);
      setHistory(result.moves);
      clearSelection();
    },
    [game, gameApi, runAction, clearSelection],
  );

  const selectSquare = useCallback(
    async (square) => {
      const token = ++selectionToken.current;
      setSelected(square);
      setLegalMoves([]);
      const data = await runAction(() => gameApi.getLegalMoves(game.id, square));
      // Descarta a resposta se o jogador já escolheu outra casa.
      if (data && token === selectionToken.current) {
        setLegalMoves(data.moves);
      }
    },
    [game, gameApi, runAction],
  );

  // Ponto de entrada para cliques em casas do tabuleiro.
  const handleSquareClick = useCallback(
    (square, pieceOfTurn) => {
      if (!game || busy || game.status !== 'active') return;

      if (selected && isLegalTarget(legalMoves, square)) {
        const options = promotionOptionsFor(legalMoves, square);
        if (options.length > 0) {
          setPendingPromotion({ from: selected, to: square, options });
          return;
        }
        executeMove(selected, square);
        return;
      }

      if (pieceOfTurn) {
        if (selected === square) {
          clearSelection();
        } else {
          selectSquare(square);
        }
        return;
      }

      clearSelection();
    },
    [game, busy, selected, legalMoves, executeMove, selectSquare, clearSelection],
  );

  const choosePromotion = useCallback(
    (piece) => {
      if (!pendingPromotion) return;
      const { from, to } = pendingPromotion;
      setPendingPromotion(null);
      executeMove(from, to, piece);
    },
    [pendingPromotion, executeMove],
  );

  const cancelPromotion = useCallback(() => clearSelection(), [clearSelection]);

  return {
    game,
    history,
    selected,
    legalMoves,
    pendingPromotion,
    busy,
    error,
    newGame,
    handleSquareClick,
    choosePromotion,
    cancelPromotion,
    dismissError: () => setError(null),
  };
}
