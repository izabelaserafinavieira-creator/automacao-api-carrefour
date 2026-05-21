/*
 * Helper de Autenticação
 *
 * Faz login na API ServeRest uma única vez e reutiliza o token JWT
 * em todos os testes que precisam de autenticação (PUT e DELETE).
 *
 * Por que usar um singleton (tokenPromise)?
 *   Evitar múltiplas chamadas de login quando vários arquivos de teste
 *   importam este helper ao mesmo tempo. O login acontece uma única vez
 *   e o resultado é compartilhado entre todos os testes.
 *
 * Como usar em um arquivo de teste:
 *   const { getToken } = require('../helpers/auth.helper');
 *   const token = await getToken(); // "Bearer eyJ..."
 */

const authService = require('../../services/auth.service');
const usuariosService = require('../../services/usuarios.service');
const testData = require('../../data/usuarios.json');

// Guarda a Promise do login para não chamar a API mais de uma vez
let tokenPromise = null;

const getToken = () => {
  if (!tokenPromise) {
    tokenPromise = (async () => {
      try {
        const response = await authService.login(testData.credenciais.admin);
        return response.data.authorization;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // Usuário admin não existe na instância da ServeRest — cria e tenta de novo
          await usuariosService.createUsuario({
            nome: 'Admin QA Automacao',
            email: testData.credenciais.admin.email,
            password: testData.credenciais.admin.password,
            administrador: 'true',
          }).catch(() => {}); // ignora se já existe (409 ou similar)
          const retry = await authService.login(testData.credenciais.admin);
          return retry.data.authorization;
        }
        throw error;
      }
    })();

    // Se falhar por completo, limpa o singleton para permitir nova tentativa
    tokenPromise.catch(() => { tokenPromise = null; });
  }
  return tokenPromise;
};

module.exports = { getToken };
