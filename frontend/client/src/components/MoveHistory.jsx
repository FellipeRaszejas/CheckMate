// Histórico de jogadas agrupado por número de lance (brancas e pretas lado a lado).
// Só renderiza lances que existem: não há células vazias para o lance ainda não jogado.

export default function MoveHistory({ moves }) {
  if (moves.length === 0) {
    return <p className="muted">Nenhum lance ainda.</p>;
  }

  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ number: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  }

  return (
    <ol className="history" aria-label="Histórico de jogadas">
      {rows.map((row) => (
        <li key={row.number}>
          <span className="move-number">{row.number}.</span>
          <span className="move-san">{row.white.san}</span>
          {row.black && <span className="move-san">{row.black.san}</span>}
        </li>
      ))}
    </ol>
  );
}
