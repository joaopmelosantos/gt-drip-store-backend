class AppError extends Error {
  /**
   * Erro operacional controlado para respostas HTTP consistentes.
   * @param {number} statusCode Código HTTP da resposta
   * @param {string} message Mensagem descritiva do erro
   * @param {unknown} [details] Detalhes adicionais opcionais
   */
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = AppError;
