// Mostra de quem é a vez e o estado da partida, conforme o DTO do backend.

const DRAW_LABELS = {
  stalemate: 'Empate por afogamento',
  insufficient_material: 'Empate por material insuficiente',
  threefold_repetition: 'Empate por repetição tripla',
  fifty_moves: 'Empate pela regra dos 50 lances',
};

export function describeGameStatus(game) {
  if (!game) return { title: 'Carregando partida…', tone: 'info' };

  if (game.status === 'checkmate') {
    const winner = game.winner === 'w' ? 'Brancas' : 'Pretas';
    return { title: `Xeque-mate! Vitória das ${winner} (${game.result}).`, tone: 'over' };
  }

  if (game.status === 'draw') {
    return { title: `${DRAW_LABELS[game.drawReason] ?? 'Empate'} (1/2-1/2).`, tone: 'over' };
  }

  const turnLabel = game.turn === 'w' ? 'Brancas' : 'Pretas';
  if (game.inCheck) {
    return { title: `Vez das ${turnLabel}: XEQUE!`, tone: 'check' };
  }
  return { title: `Vez das ${turnLabel}`, tone: 'info' };
}

export default function GameStatus({ game }) {
  const { title, tone } = describeGameStatus(game);
  return (
    <section className={`status status-${tone}`} aria-live="polite">
      <p className="status-title">{title}</p>
      {game && <p className="status-meta">Lances: {game.moveCount}</p>}
    </section>
  );
}
