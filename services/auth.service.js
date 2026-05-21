/*
 * Serviço de Autenticação
 *
 * Responsável por fazer login na API ServeRest e obter o token JWT.
 * O token retornado é necessário para chamar os endpoints protegidos:
 * PUT /usuarios/:id e DELETE /usuarios/:id.
 *
 * Como usar:
 *   const authService = require('./auth.service');
 *   const resposta = await authService.login({ email: '...', password: '...' });
 *   const token = resposta.data.authorization; // "Bearer eyJ..."
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'https://serverest.dev';

module.exports = {
  // POST /login — retorna { message, authorization: "Bearer <token>" }
  login: (credentials) => axios.post(`${BASE_URL}/login`, credentials),
};
