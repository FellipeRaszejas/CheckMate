// Utilitários compartilhados pelos testes.

import { createInMemoryGameRepository } from '../src/repositories/gameRepository.js';
import { createGameService } from '../src/services/gameService.js';

// Serviço isolado com repositório próprio (cada teste começa do zero).
export function createTestService() {
  return createGameService({ repository: createInMemoryGameRepository() });
}

// Converte notação UCI ("e2e4", "e7e8q") em objeto de movimento.
export function uci(text) {
  return {
    from: text.slice(0, 2),
    to: text.slice(2, 4),
    promotion: text[4] ?? null,
  };
}

// Executa uma sequência de movimentos UCI e devolve o último estado.
export async function playUci(service, gameId, sequence) {
  let game = null;
  for (const text of sequence) {
    game = await service.makeMove(gameId, uci(text));
  }
  return game;
}

// Retorna o erro lançado por uma promessa (para inspecionar code/status).
export async function errorOf(promise) {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('Esperava um erro, mas a operação foi concluída');
}
