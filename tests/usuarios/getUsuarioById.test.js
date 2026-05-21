/*
 * ============================================================
 * TESTES: Buscar Usuário por ID — GET /usuarios/:id
 * ============================================================
 *
 * O que este arquivo testa?
 *   Verifica se a API retorna os dados corretos de um usuário
 *   ao buscá-lo pelo ID, e se rejeita IDs que não existem.
 *
 * Fluxo de cada teste:
 *   1. Envia a requisição com o ID do usuário na URL
 *   2. Verifica o status HTTP e o conteúdo da resposta
 *   3. Compara os dados retornados com o que foi cadastrado no beforeAll
 *
 * Cenários cobertos:
 *   [SUCESSO] ID válido retorna o usuário com os dados corretos    → 200
 *   [FALHA]   ID inexistente retorna mensagem de não encontrado    → 400
 * ============================================================
 */

const usuariosService = require('../../services/usuarios.service');
const { getToken } = require('../helpers/auth.helper');
const testData = require('../../data/usuarios.json');

describe('GET /usuarios/:id - Buscar Usuário por ID', () => {
  let userId;
  let token;
  let payloadCriado;

  // Cria um usuário com dados conhecidos para poder comparar cada campo
  // na resposta do GET — sem isso não dá para saber se os valores estão corretos
  beforeAll(async () => {
    token = await getToken();
    payloadCriado = {
      ...testData.payloads.usuarioValido,
      email: `getbyid${Date.now()}@qa.com.br`,
    };
    const response = await usuariosService.createUsuario(payloadCriado);
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
  // [SUCESSO] Busca por ID existente: verifica que os dados retornados
  // batem exatamente com o que foi enviado no momento do cadastro
  // ----------------------------------------------------------
  test('200 - Deve retornar usuário pelo ID correto', async () => {
    const response = await usuariosService.getUsuarioById(userId);

    expect(response.status).toBe(200);
    // O _id retornado deve ser o mesmo ID enviado na URL
    expect(response.data._id).toBe(userId);
    // Valida os valores dos campos, não apenas se as chaves existem
    expect(typeof response.data.nome).toBe('string');
    expect(response.data.nome).toBe(payloadCriado.nome);
    expect(typeof response.data.email).toBe('string');
    expect(response.data.email).toBe(payloadCriado.email);
    expect(['true', 'false']).toContain(response.data.administrador);
    expect(response.data.administrador).toBe(payloadCriado.administrador);
  });

  // ----------------------------------------------------------
  // [FALHA] ID que não existe na base deve retornar 400 com mensagem específica
  // Se a API retornar 200 ou outro status, o teste quebra (comportamento inesperado)
  // A guarda !error.response evita mascarar erros de rede como falhas da API
  // ----------------------------------------------------------
  test('400 - Deve retornar erro para ID inválido', async () => {
    expect.assertions(2);
    let errorCaught = false;

    try {
      await usuariosService.getUsuarioById('idInvalidoXYZ123');
    } catch (error) {
      if (!error.response) throw error;
      errorCaught = true;
      expect(error.response.status).toBe(400);
      expect(error.response.data.message).toBe('Usuário não encontrado');
    }

    if (!errorCaught) {
      throw new Error('API retornou resposta inesperada para ID inválido - era esperado status 400');
    }
  });
});
