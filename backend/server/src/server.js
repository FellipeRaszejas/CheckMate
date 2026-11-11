// Ponto de entrada do servidor HTTP.

import { createApp } from './app.js';
import { config } from './config/index.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`API de xadrez em execução: http://localhost:${config.port}/api`);
});
