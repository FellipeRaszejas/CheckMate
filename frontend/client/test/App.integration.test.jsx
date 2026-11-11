// @vitest-environment jsdom
// Teste de interface completa: React renderizado + HTTP + backend Express real.
// Nenhuma resposta é simulada; o tabuleiro só muda porque a API aceitou o lance.

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { createApp } from '../../server/src/app.js';
import { createInMemoryGameRepository } from '../../server/src/repositories/gameRepository.js';
import { createApiClient } from '../src/services/apiClient.js';
import { createGameApi } from '../src/services/gameApi.js';
import App from '../src/App.jsx';

let server;
let gameApi;

beforeAll(async () => {
  const app = createApp({ repository: createInMemoryGameRepository(), corsOrigins: [] });
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  gameApi = createGameApi(createApiClient({ baseUrl: `http://127.0.0.1:${port}/api` }));
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

afterEach(() => cleanup());

const cell = (square) => document.querySelector(`[aria-label^="Casa ${square},"]`);
const isHighlightedTarget = (square) =>
  cell(square).classList.contains('sq-target') || cell(square).classList.contains('sq-capture');
const plyCount = () => document.querySelectorAll('.history .move-san').length;

// Clica na origem, espera a API devolver os destinos e então clica no destino.
async function playClicks(from, to) {
  fireEvent.click(cell(from));
  await waitFor(() => expect(isHighlightedTarget(to)).toBe(true));
  fireEvent.click(cell(to));
}

async function renderGame() {
  render(<App gameApi={gameApi} />);
  await waitFor(() => expect(cell('e2')).toBeTruthy());
  await waitFor(() => expect(screen.getByText('Vez das Brancas')).toBeTruthy());
}

describe('App com backend real', () => {
  it('carrega o tabuleiro inicial vindo da API', async () => {
    await renderGame();
    expect(cell('e1').textContent).toContain('♔');
    expect(cell('e8').textContent).toContain('♚');
  });

  it('seleção destaca destinos legais e a jogada atualiza turno e histórico', async () => {
    await renderGame();
    fireEvent.click(cell('e2'));
    await waitFor(() => expect(isHighlightedTarget('e4')).toBe(true));
    expect(cell('e2').classList.contains('sq-selected')).toBe(true);
    expect(isHighlightedTarget('e5')).toBe(false);

    fireEvent.click(cell('e4'));
    await waitFor(() => expect(screen.getByText('Vez das Pretas')).toBeTruthy());
    await waitFor(() => expect(plyCount()).toBe(1));
    expect(document.querySelector('.history').textContent).toContain('e4');
    expect(cell('e4').classList.contains('sq-last')).toBe(true);
  });

  it('clique em casa ilegal apenas desfaz a seleção, sem enviar jogada', async () => {
    await renderGame();
    fireEvent.click(cell('e2'));
    await waitFor(() => expect(isHighlightedTarget('e4')).toBe(true));
    fireEvent.click(cell('a5'));
    await waitFor(() => expect(isHighlightedTarget('e4')).toBe(false));
    expect(screen.getByText('Vez das Brancas')).toBeTruthy();
    expect(plyCount()).toBe(0);
  });

  it('partida completa com captura, xeque-mate e encerramento (mate do louco)', async () => {
    await renderGame();
    await playClicks('f2', 'f3');
    await waitFor(() => expect(plyCount()).toBe(1));
    await playClicks('e7', 'e5');
    await waitFor(() => expect(plyCount()).toBe(2));
    await playClicks('g2', 'g4');
    await waitFor(() => expect(plyCount()).toBe(3));
    await playClicks('d8', 'h4');

    await waitFor(() => expect(screen.getByText(/Xeque-mate! Vitória das Pretas/)).toBeTruthy());
    expect(document.querySelector('.history').textContent).toContain('Qh4#');
    // Após o encerramento, o tabuleiro fica desabilitado.
    expect(cell('a2').disabled).toBe(true);
  });

  it('promoção de peão abre o diálogo com 4 opções e aplica a peça escolhida', async () => {
    await renderGame();
    const sequencia = [
      ['h2', 'h4'], ['a7', 'a6'], ['h4', 'h5'], ['a6', 'a5'],
      ['h5', 'h6'], ['a5', 'a4'], ['h6', 'g7'], ['a4', 'a3'],
    ];
    for (const [index, [from, to]] of sequencia.entries()) {
      await playClicks(from, to);
      await waitFor(() => expect(plyCount()).toBe(index + 1));
    }

    await playClicks('g7', 'h8');
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Escolha a peça de promoção');
    const opcoes = [...dialog.querySelectorAll('.promotion-options button')].map((b) => b.textContent);
    expect(opcoes).toHaveLength(4);

    fireEvent.click([...dialog.querySelectorAll('.promotion-options button')]
      .find((b) => b.textContent.includes('Dama')));

    await waitFor(() => expect(plyCount()).toBe(9));
    expect(document.querySelector('.history').textContent).toContain('gxh8=Q');
    expect(cell('h8').textContent).toContain('♕');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
