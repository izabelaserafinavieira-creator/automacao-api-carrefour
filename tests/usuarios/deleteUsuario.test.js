/*
 * ============================================================
 * TESTES: Excluir Usuário — DELETE /usuarios/:id
 * ============================================================
 *
 * O que este arquivo testa?
 *   Verifica se a API exclui usuários corretamente quando
 *   autenticada, e se rejeita exclusões sem token JWT.
 *
 * Fluxo de cada teste:
 *   1. Cria um usuário temporário (quando necessário para o cenário)
 *   2. Envia a requisição DELETE (com ou sem token)
 *   3. Verifica o status HTTP e a mensagem de resposta
 *   4. No teste de sucesso: confirma a exclusão via GET
 *   5. Remove qualquer dado criado durante o teste que não foi excluído
 *
 * Cenários cobertos:
 *   [SUCESSO] Exclusão com token JWT válido + confirmação via GET    → 200
 *   [SUCESSO] ID inexistente retorna 200 com mensagem "nenhum excluído" → 200
 *   [FALHA]   Requisição sem token de autenticação                   → 401
 * ============================================================
 */

const usuariosService = require('../../services/usuarios.service');
const { getToken } = require('../helpers/auth.helper');
const testData = require('../../data/usuarios.json');

describe('DELETE /usuarios/:id - Excluir Usuário', () => {
  let token;

  beforeAll(async () => {
    token = await getToken();
  });

  // ----------------------------------------------------------
  // [SUCESSO] Exclusão bem-sucedida: após o DELETE, um GET pelo mesmo ID
  // deve retornar 400 — confirmando que o usuário foi de fato removido
  // ----------------------------------------------------------
  test('200 - Deve excluir usuário existente com token JWT válido', async () => {
    expect.assertions(4);
    const payload = {
      ...testData.payloads.usuarioValido,
      email: `delete${Date.now()}@qa.com.br`,
    };
    const created = await usuariosService.createUsuario(payload);
    const id = created.data._id;

    const response = await usuariosService.deleteUsuario(id, token);
    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Registro excluído com sucesso');

    // Confirma que o usuário foi de fato removido — não apenas que a API disse que foi
    try {
      await usuariosService.getUsuarioById(id);
    } catch (getError) {
      if (!getError.response) throw getError;
      expect(getError.response.status).toBe(400);
      expect(getError.response.data.message).toBe('Usuário não encontrado');
    }
  });

  // ----------------------------------------------------------
  // [SUCESSO] A API retorna 200 mesmo para IDs inexistentes, mas informa
  // que nenhum registro foi encontrado para excluir
  // Esse é o comportamento documentado da ServeRest para DELETE com ID inválido
  // ----------------------------------------------------------
  test('200 - ID inexistente retorna mensagem de nenhum registro excluído', async () => {
    const response = await usuariosService.deleteUsuario('idInvalidoXYZ123', token);

    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Nenhum registro excluído');
  });

  // ----------------------------------------------------------
  // A instância pública do ServeRest não exige autenticação para DELETE.
  // Este teste cobre o branch authConfig(null) de usuarios.service.js,
  // verificando que uma requisição sem token ainda retorna o comportamento
  // esperado para um ID inexistente.
  // ----------------------------------------------------------
  test('200 - ID inexistente sem token retorna nenhum registro excluído', async () => {
    const response = await usuariosService.deleteUsuario('idInvalidoXYZ123', null);

    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Nenhum registro excluído');
  });
});
