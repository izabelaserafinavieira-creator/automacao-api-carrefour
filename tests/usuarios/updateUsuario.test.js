/*
 * ============================================================
 * TESTES: Editar Usuário — PUT /usuarios/:id
 * ============================================================
 *
 * O que este arquivo testa?
 *   Verifica se a API edita os dados de um usuário corretamente
 *   quando autenticada, e se rejeita requisições inválidas.
 *
 * Fluxo de cada teste:
 *   1. Monta o payload de atualização
 *   2. Envia a requisição PUT (com ou sem token)
 *   3. Verifica o status HTTP e a mensagem de resposta
 *   4. No teste de sucesso: confirma a persistência via GET
 *   5. Remove qualquer dado auxiliar criado durante o teste (cleanup)
 *
 * Cenários cobertos:
 *   [SUCESSO] Edição com token JWT válido + confirmação via GET  → 200
 *   [UPSERT]  ID inexistente cria novo usuário (ServeRest)       → 201
 *   [FALHA]   Email já em uso por outro usuário                  → 400
 * ============================================================
 */

const usuariosService = require('../../services/usuarios.service');
const { getToken } = require('../helpers/auth.helper');
const testData = require('../../data/usuarios.json');

describe('PUT /usuarios/:id - Editar Usuário', () => {
  let userId;
  let token;

  // Cria o usuário-alvo dos testes de edição antes de todos os testes
  // Timestamp no email evita conflito caso já exista usuário com mesmo endereço
  beforeAll(async () => {
    token = await getToken();
    const payload = {
      ...testData.payloads.usuarioValido,
      email: `update${Date.now()}@qa.com.br`,
    };
    const response = await usuariosService.createUsuario(payload);
    userId = response.data._id;
  });

  afterAll(async () => {
    if (userId) {
      try {
        await usuariosService.deleteUsuario(userId, token);
      } catch {
        // cleanup silencioso — token pode ter expirado ou usuário já removido
      }
    }
  });

  // ----------------------------------------------------------
  // [SUCESSO] Edição com token válido: além de verificar a resposta do PUT,
  // faz um GET para confirmar que os dados foram realmente alterados no banco
  // ----------------------------------------------------------
  test('200 - Deve editar usuário com token JWT válido', async () => {
    const payload = {
      ...testData.payloads.usuarioAtualizado,
      email: `atualizado${Date.now()}@qa.com.br`,
    };

    const response = await usuariosService.updateUsuario(userId, payload, token);

    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Registro alterado com sucesso');

    // Confirma que os dados foram realmente persistidos — não apenas aceitos pela API
    const verificacao = await usuariosService.getUsuarioById(userId);
    expect(verificacao.data.nome).toBe(payload.nome);
    expect(verificacao.data.email).toBe(payload.email);
    expect(verificacao.data.administrador).toBe(payload.administrador);
  });

  // Nota: a instância pública do ServeRest (serverest.dev) não exige
  // autenticação para PUT — requisições sem token retornam 200/201 normalmente.
  // Por isso o cenário de 401 não é aplicável a este ambiente.

  // ----------------------------------------------------------
  // [UPSERT] PUT com ID inexistente cria um novo usuário (201)
  // O ServeRest implementa upsert: se o ID não existe, insere o registro.
  // O usuário criado é removido no finally para não poluir a base.
  // ----------------------------------------------------------
  test('201 - Deve criar usuário via upsert quando ID não existe', async () => {
    const payload = {
      ...testData.payloads.usuarioAtualizado,
      email: `upsert${Date.now()}@qa.com.br`,
    };
    let upsertedId = null;

    try {
      const response = await usuariosService.updateUsuario('idInvalidoXYZ123', payload, token);
      upsertedId = response.data._id;

      expect(response.status).toBe(201);
      expect(response.data.message).toBe('Cadastro realizado com sucesso');
      expect(typeof response.data._id).toBe('string');
    } finally {
      if (upsertedId) {
        try {
          await usuariosService.deleteUsuario(upsertedId, token);
        } catch {
          // cleanup silencioso
        }
      }
    }
  });

  // ----------------------------------------------------------
  // [FALHA] Não é permitido atualizar para um email já usado por outro usuário
  // Cria um usuário auxiliar para "ocupar" o email e o remove no finally,
  // independente do resultado do teste
  // Se retornar 200, o teste quebra (comportamento inesperado)
  // ----------------------------------------------------------
  test('400 - Deve rejeitar edição com email já em uso', async () => {
    expect.assertions(2);
    const existingEmail = `existing${Date.now()}@qa.com.br`;
    let otherId = null;
    let errorCaught = false;

    try {
      const other = await usuariosService.createUsuario({
        ...testData.payloads.usuarioValido,
        email: existingEmail,
      });
      otherId = other.data._id;

      // Tenta atualizar o usuário-alvo com o email que já pertence ao usuário auxiliar
      await usuariosService.updateUsuario(userId, {
        ...testData.payloads.usuarioAtualizado,
        email: existingEmail,
      }, token);
    } catch (error) {
      // Se otherId for null, o cadastro auxiliar falhou — não era o cenário esperado
      if (!otherId) throw error;
      if (!error.response) throw error;
      if (!errorCaught) {
        errorCaught = true;
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('Este email já está sendo usado');
      }
    } finally {
      // Remove o usuário auxiliar independente do que aconteceu no try
      if (otherId) await usuariosService.deleteUsuario(otherId, token);
    }

    if (!errorCaught) {
      throw new Error('API retornou resposta inesperada para PUT com email duplicado - era esperado status 400');
    }
  });
});
