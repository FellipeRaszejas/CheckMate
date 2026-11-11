// Configurações centralizadas, lidas de variáveis de ambiente.
// Mantém o restante do código livre de acesso direto a process.env.

// localhost e 127.0.0.1 são origens distintas para o navegador: liberamos ambas.
const DEFAULT_CORS_ORIGIN = 'http://localhost:5173,http://127.0.0.1:5173';

export const config = Object.freeze({
  port: Number(process.env.PORT) || 3001,
  // Lista separada por vírgula, ex.: "http://localhost:5173,https://meuapp.com"
  corsOrigins: (process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
});
