// Diálogo para escolher a peça de promoção. As opções vêm da API
// (cada lance de promoção gerado pelo chess.js).

const LABELS = { q: 'Dama', r: 'Torre', b: 'Bispo', n: 'Cavalo' };

// Símbolos da peça na cor de quem promove (w = branco, b = preto).
const SYMBOLS = {
  w: { q: '♕', r: '♖', b: '♗', n: '♘' },
  b: { q: '♛', r: '♜', b: '♝', n: '♞' },
};

export default function PromotionDialog({ options, color, onChoose, onCancel }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="promo-title">
        <h2 id="promo-title">Escolha a peça de promoção</h2>
        <div className="promotion-options">
          {options.map((piece) => (
            <button key={piece} type="button" onClick={() => onChoose(piece)}>
              <span className="piece-large">{SYMBOLS[color][piece]}</span>
              <span>{LABELS[piece]}</span>
            </button>
          ))}
        </div>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
