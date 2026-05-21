/*
 * Serviço de Usuários
 *
 * Centraliza todas as chamadas HTTP ao endpoint /usuarios da API ServeRest.
 * Cada função representa uma operação CRUD diferente.
 *
 * Endpoints públicos (não precisam de token):
 *   getUsuarios, createUsuario, getUsuarioById
 *
 * Endpoints protegidos (precisam de token JWT no header Authorization):
 *   updateUsuario, deleteUsuario
 *
 * Como usar:
 *   const service = require('./usuarios.service');
 *   const { getToken } = require('../tests/helpers/auth.helper');
 *
 *   const token = await getToken();
 *   await service.deleteUsuario('abc123', token);
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'https://serverest.dev';

// Monta o objeto de configuração com o header Authorization quando o token é informado
const authConfig = (token) => (token ? { headers: { Authorization: token } } : {});

module.exports = {
  // GET /usuarios?administrador=true|false — retorna { quantidade, usuarios[] }
  getUsuarios: (params) => axios.get(`${BASE_URL}/usuarios`, { params }),

  // POST /usuarios — cria um novo usuário; retorna { message, _id }
  createUsuario: (data) => axios.post(`${BASE_URL}/usuarios`, data),

  // GET /usuarios/:id — retorna os dados do usuário ou 400 se não encontrado
  getUsuarioById: (id) => axios.get(`${BASE_URL}/usuarios/${id}`),

  // PUT /usuarios/:id — atualiza os dados; exige token JWT no header Authorization
  updateUsuario: (id, data, token) =>
    axios.put(`${BASE_URL}/usuarios/${id}`, data, authConfig(token)),

  // DELETE /usuarios/:id — exclui o usuário; exige token JWT no header Authorization
  deleteUsuario: (id, token) =>
    axios.delete(`${BASE_URL}/usuarios/${id}`, authConfig(token)),
};
