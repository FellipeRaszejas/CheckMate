// Formato padronizado de respostas da API.
// Sucesso: { success: true, data }
// Erro:    { success: false, error: { code, message, details } }

export function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function sendError(res, status, code, message, details = null) {
  return res.status(status).json({
    success: false,
    error: { code, message, details },
  });
}
