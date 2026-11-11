// Repositório de partidas.
//
// Nesta sprint o armazenamento é em memória. A interface é assíncrona de
// propósito: quando o PostgreSQL entrar (sprint futura), basta criar outra
// implementação com os mesmos métodos, sem alterar services/controllers.
//
// Cada registro guarda apenas dados persistíveis:
//   { id, moves: [{from, to, promotion?}], createdAt, updatedAt }
// O estado do tabuleiro NÃO é guardado: é reconstruído pelo chess.js a partir
// dos movimentos, evitando divergência entre dados armazenados e regras.

export function createInMemoryGameRepository() {
  const games = new Map();

  return {
    async create(record) {
      games.set(record.id, record);
      return record;
    },

    async findById(id) {
      return games.get(id) ?? null;
    },

    async update(record) {
      if (!games.has(record.id)) return null;
      games.set(record.id, record);
      return record;
    },
  };
}
