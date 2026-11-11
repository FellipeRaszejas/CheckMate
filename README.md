# Plataforma de Xadrez — Sprint 01

Monorepo com backend (Node.js + Express) e frontend (React + Vite + JavaScript).
As regras do xadrez são executadas exclusivamente pelo **chess.js**. O backend é a
autoridade sobre todos os lances; o frontend apenas exibe o estado que recebe da API.

## Estrutura

```
xadrez/
├── server/
│   ├── src/
│   │   ├── server.js                  # ponto de entrada (sobe o HTTP)
│   │   ├── app.js                     # monta o Express (injeção de dependências)
│   │   ├── config/index.js            # PORT e CORS_ORIGIN via ambiente
│   │   ├── routes/                    # mapeia URL → controller + middlewares
│   │   ├── controllers/               # lê a requisição e devolve a resposta
│   │   ├── middlewares/               # validação de entrada e tratamento de erros
│   │   ├── services/
│   │   │   ├── chessRules.js          # ÚNICO ponto que fala com o chess.js
│   │   │   └── gameService.js         # regras de orquestração das partidas
│   │   ├── repositories/
│   │   │   └── gameRepository.js      # armazenamento em memória (troca futura por PostgreSQL)
│   │   └── utils/                     # ApiError e formato de resposta
│   └── test/                          # 60 testes (regras + API HTTP)
└── client/
    ├── src/
    │   ├── services/                  # única camada que faz HTTP
    │   │   ├── apiClient.js           # fetch, formato de erro, falhas de rede
    │   │   └── gameApi.js             # endpoints de partida + URL via VITE_API_URL
    │   ├── hooks/useChessGame.js      # estado da partida e seleção visual
    │   ├── utils/board.js             # só exibição (destaques, símbolos)
    │   ├── components/                # tabuleiro, status, histórico, promoção
    │   └── App.jsx
    └── test/                          # 18 testes (unitários + integração com backend real)
```

## Como executar

Pré-requisito: Node.js 22 (versão em que o projeto foi testado).

**Backend** (porta 3001):
```bash
cd server
npm install
npm start          # ou: npm run dev (reinicia ao salvar)
```

**Frontend** (porta 5173):
```bash
cd client
npm install
cp .env.example .env.local   # opcional: VITE_API_URL já tem o padrão correto
npm run dev
```
Abra `http://localhost:5173`.

**Variáveis de ambiente**
| Variável | Onde | Padrão | Função |
|---|---|---|---|
| `PORT` | server | `3001` | porta do backend |
| `CORS_ORIGIN` | server | `http://localhost:5173,http://127.0.0.1:5173` | origens liberadas (separadas por vírgula) |
| `VITE_API_URL` | client | `http://localhost:3001/api` | URL base da API |

## Testes

```bash
cd server && npm test     # 60 testes: regras do xadrez e endpoints HTTP
cd client && npm test     # 18 testes: utilitários, integração e interface com backend real
```

Os testes de integração do frontend sobem o Express real (porta efêmera) e
usam o cliente HTTP do React contra ele. Nenhuma resposta é simulada.

## Endpoints

Todas as respostas seguem o formato `{ "success": true, "data": ... }` ou
`{ "success": false, "error": { "code", "message", "details" } }`.

| Método | Endpoint | Função | Sucesso |
|---|---|---|---|
| POST | `/api/games` | cria partida | 201 |
| GET | `/api/games/:id` | consulta partida | 200 |
| GET | `/api/games/:id/legal-moves?square=e2` | lances legais da casa (sem `square`: todos de quem tem a vez) | 200 |
| POST | `/api/games/:id/moves` | executa lance `{from, to, promotion?}` | 200 |
| GET | `/api/games/:id/history` | histórico e PGN | 200 |

**Códigos de erro**
| Código HTTP | `error.code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | id, casa ou campo com formato inválido |
| 400 | `INVALID_JSON` | corpo não é JSON válido |
| 400 | `PROMOTION_REQUIRED` | lance de promoção sem peça informada |
| 400 | `INVALID_PROMOTION` | peça de promoção não aplicável a este lance |
| 404 | `GAME_NOT_FOUND` | partida inexistente |
| 404 | `ROUTE_NOT_FOUND` | rota inexistente |
| 409 | `GAME_OVER` | tentativa de jogar após o encerramento |
| 422 | `ILLEGAL_MOVE` | lance que as regras não permitem |

**Exemplo de estado (`GET /api/games/:id`)**
```json
{
  "id": "…", "status": "active", "result": null, "winner": null, "drawReason": null,
  "turn": "b", "inCheck": false, "checkedKingSquare": null,
  "fen": "…", "pgn": "…", "board": [[…8 casas…], …], "moveCount": 1,
  "lastMove": { "from": "e2", "to": "e4", "san": "e4", "flags": { "capture": false, "…": "…" } }
}
```
`status` assume `active`, `checkmate` ou `draw`. Em empate, `drawReason` é
`stalemate`, `insufficient_material`, `threefold_repetition` ou `fifty_moves`.

## Decisões técnicas

**chess.js 1.4.0 como única fonte de regras.** O código não reimplementa nenhuma
regra. Verificamos antes de usar: `move()` **lança exceção** em lance inválido (não
retorna `null`); `moves({ square, verbose: true })` devolve objetos com
`isCapture()`, `isEnPassant()`, `isKingsideCastle()` etc.; a propriedade `flags` está
deprecada e não é usada. Os métodos usados estão todos na API tipada da versão instalada.

**Partida guardada como lista de lances, não como FEN.** O repositório armazena apenas
`moves: [{from, to, promotion}]`. A cada requisição, o `Chess` é reconstruído
reexecutando os lances. Isso garante que o estado nunca diverge das regras e facilita a
persistência futura: basta gravar a sequência de jogadas.

**Repositório assíncrono.** A interface (`create`, `findById`, `update`) retorna
promessas mesmo em memória. Quando o PostgreSQL entrar, troca-se só a implementação;
services e controllers permanecem iguais.

**Separação em camadas.** Rota → middleware de validação → controller → service →
chessRules/repositório. O service não conhece HTTP; o controller não contém regra.
`app.js` recebe dependências por parâmetro, o que permite testes com repositório isolado.

**Validação em duas etapas.** Os middlewares validam *formato* (`e2`, `q/r/b/n`).
As *regras* (legalidade, promoção obrigatória, turno) são decididas pelo serviço,
com base no chess.js. Por isso `PROMOTION_REQUIRED` e `INVALID_PROMOTION` existem:
o frontend precisa saber o motivo exato de uma recusa.

**Estado do tabuleiro enviado pronto.** A API devolve `board` (matriz 8×8) e
`checkedKingSquare`. Assim o React não interpreta FEN nem calcula xeque.

**Frontend sem lógica de regras.** `utils/board.js` só decide cores de destaque. Os
destinos de cada peça vêm de `GET legal-moves`; o clique só envia o lance e aguarda a
resposta. O diálogo de promoção aparece porque a API informa que existem opções de
promoção para aquela casa.

**Atualização atômica da tela.** Após um lance, o frontend busca partida e histórico
antes de atualizar a interface. Sem isso, a tela mostrava "Xeque-mate" antes do lance
final aparecer na lista (defeito encontrado pelos testes de interface e corrigido).

**CORS com `localhost` e `127.0.0.1`.** São origens diferentes para o navegador. O
padrão libera as duas. Sem isso, abrir o Vite por `127.0.0.1` bloqueia toda a
comunicação; a mensagem de erro de conexão aparece, mas o jogo não funciona.

**Respostas padronizadas.** Erros de domínio são `ApiError` com status e código.
Erros inesperados viram 500 sem vazar stack trace.

**Versões de teste.** O servidor usa Vitest 5.1 e o cliente usa Vitest 3.2 com Vite 5.4.
Cada pacote tem a sua versão, e as duas suítes passam com essas versões no Node 22.
Unificar as versões é uma tarefa possível para a próxima sprint, se houver motivo.

## Limitações conhecidas

- **Persistência:** a partida fica só em memória. Ao reiniciar o backend, as partidas se perdem.
  A interface do repositório está pronta para o PostgreSQL, mas o banco não foi configurado.
- **PostgreSQL:** não havia instância no ambiente de desenvolvimento e nenhum projeto
  existente foi encontrado. Nada relacionado ao banco foi implementado.
- **Empate por acordo** (oferta de empate entre jogadores) não existe: não é regra do
  xadrez, é funcionalidade de jogo. O empate implementado é o previsto pelas regras.
- **Desistência, abandono e relógio** não existem nesta sprint.
- **Design:** visual funcional e provisório. As peças brancas têm pouco contraste sobre as
  casas claras; isso será tratado no redesenho.
- **Histórico de lances:** a lista é reconstruída a cada consulta. Em partidas muito longas
  isso ainda é barato, mas merece atenção se o número de lances crescer muito.

## O que está pronto para a Sprint 02

- Interface de repositório assíncrona, pronta para trocar a implementação por PostgreSQL.
- Partida guardada como sequência de lances, o formato mais simples de persistir.
- Camada de serviços HTTP no frontend, pronta para receber autenticação e socket.
- Regras de jogo isoladas em `chessRules.js` e `gameService.js`, reutilizáveis por Socket.IO.
- Formato de erro e de sucesso padronizado, usado por todos os clientes.
