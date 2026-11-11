// Tela principal. Recebe a API por prop (injeção), o que permite testes com
// backend real; em produção usa a instância padrão de gameApi.

import { useChessGame } from './hooks/useChessGame.js';
import { computeSquareMarks } from './utils/board.js';
import { gameApi as defaultGameApi } from './services/gameApi.js';
import ChessBoard from './components/ChessBoard.jsx';
import GameStatus from './components/GameStatus.jsx';
import MoveHistory from './components/MoveHistory.jsx';
import PromotionDialog from './components/PromotionDialog.jsx';

export default function App({ gameApi = defaultGameApi }) {
  const chess = useChessGame(gameApi);
  const { game } = chess;

  const marks = game
    ? computeSquareMarks({
        selected: chess.selected,
        legalMoves: chess.legalMoves,
        lastMove: game.lastMove,
        checkedKingSquare: game.checkedKingSquare,
      })
    : new Map();

  const finished = game ? game.status !== 'active' : false;

  return (
    <main className="app">
      <header className="app-header">
        <h1>Xadrez</h1>
        <button type="button" onClick={chess.newGame} disabled={chess.busy}>
          Nova partida
        </button>
      </header>

      {chess.error && (
        <div className="alert" role="alert">
          <span>{chess.error}</span>
          <button type="button" className="secondary" onClick={chess.dismissError}>
            Fechar
          </button>
        </div>
      )}

      <div className="layout">
        <section className="board-area">
          {game ? (
            <ChessBoard
              board={game.board}
              marks={marks}
              turn={game.turn}
              disabled={chess.busy || finished}
              onSquareClick={chess.handleSquareClick}
            />
          ) : (
            <p className="muted">Conectando ao servidor…</p>
          )}
          {chess.busy && <p className="loading">Processando…</p>}
        </section>

        <aside className="sidebar">
          <GameStatus game={game} />
          <h2>Histórico</h2>
          <MoveHistory moves={chess.history} />
          {game && (
            <p className="muted small">Partida: {game.id}</p>
          )}
        </aside>
      </div>

      {chess.pendingPromotion && game && (
        <PromotionDialog
          options={chess.pendingPromotion.options}
          color={game.turn}
          onChoose={chess.choosePromotion}
          onCancel={chess.cancelPromotion}
        />
      )}
    </main>
  );
}
