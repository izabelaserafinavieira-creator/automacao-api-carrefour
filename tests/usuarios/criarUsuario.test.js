/*
 * ============================================================
 * TESTES: Cadastrar Usuário — POST /usuarios
 * ============================================================
 *
 * O que este arquivo testa?
 *   Verifica se a API cria usuários corretamente e se rejeita
 *   dados inválidos com os erros esperados.
 *
 * Fluxo de cada teste:
 *   1. Monta o payload (dados a enviar para a API)
 *   2. Envia a requisição
 *   3. Verifica o status HTTP e o conteúdo da resposta
 *   4. Remove qualquer dado criado durante o teste (cleanup)
 *
 * Cenários cobertos:
 *   [SUCESSO] Payload completo e válido                → 201
 *   [FALHA]   Email já existe na base                  → 400
 *   [FALHA]   Campo obrigatório "nome" ausente         → 400
 *   [FALHA]   Campo obrigatório "email" ausente        → 400
 *   [FALHA]   Email com formato inválido (sem @)       → 400
 *   [FALHA]   Campo obrigatório "password" ausente     → 400
 * ============================================================
 */

const usuariosService = require('../../services/usuarios.service');
const { getToken } = require('../helpers/auth.helper');
const testData = require('../../data/usuarios.json');

describe('POST /usuarios - Cadastrar Usuário', () => {
  let createdUserId;
  let token;

  // Obtém o token JWT uma vez antes de todos os testes deste arquivo
  // O token é usado apenas no cleanup (DELETE) após os testes
  beforeAll(async () => {
    token = await getToken();
  });

  // Após todos os testes: remove o usuário criado no teste de sucesso
  // try/catch garante que uma falha no cleanup não reprova o suite inteiro
  afterAll(async () => {
    if (createdUserId) {
      try {
        await usuariosService.deleteUsuario(createdUserId, token);
      } catch {
        // cleanup silencioso — token pode ter expirado ou usuário já removido
      }
    }
  });

  // ----------------------------------------------------------
  // [SUCESSO] Cadastro com todos os campos preenchidos corretamente
  // Verifica não apenas a resposta do POST, mas confirma via GET
  // que os dados foram realmente salvos no banco
  // ----------------------------------------------------------
  test('201 - Deve cadastrar usuário com dados válidos', async () => {
    const payload = {
      ...testData.payloads.usuarioValido,
      // Timestamp garante email único a cada execução (evita conflito de dados)
      email: `criar${Date.now()}@qa.com.br`,
    };

    const response = await usuariosService.createUsuario(payload);
    createdUserId = response.data._id;

    // Verifica a resposta do cadastro
    expect(response.status).toBe(201);
    expect(response.data.message).toBe('Cadastro realizado com sucesso');
    expect(typeof response.data._id).toBe('string');
    expect(response.data._id.length).toBeGreaterThan(0);

    // Confirma que os dados foram persistidos consultando o usuário pelo ID
    const verificacao = await usuariosService.getUsuarioById(createdUserId);
    expect(verificacao.data._id).toBe(createdUserId);
    expect(verificacao.data.nome).toBe(payload.nome);
    expect(verificacao.data.email).toBe(payload.email);
    expect(verificacao.data.administrador).toBe(payload.administrador);
  });

  // ----------------------------------------------------------
  // [FALHA] Tentativa de cadastrar com email que já existe na base
  // A API deve rejeitar e informar que o email está em uso
  // Se o cadastro duplicado retornar 200, o teste quebra (comportamento inesperado)
  // ----------------------------------------------------------
  test('400 - Deve rejeitar cadastro com email já existente', async () => {
    expect.assertions(2);
    const email = `duplicado${Date.now()}@qa.com.br`;
    const payload = { ...testData.payloads.usuarioValido, email };
    let firstId = null;
    let errorCaught = false;

    try {
      // Primeiro cadastro: deve funcionar normalmente
      const first = await usuariosService.createUsuario(payload);
      firstId = first.data._id;

      // Segundo cadastro com o mesmo email: deve falhar com 400
      await usuariosService.createUsuario(payload);
    } catch (error) {
      // Se firstId for null, o primeiro cadastro falhou — não era o cenário esperado
      if (!firstId) throw error;
      // Erros de rede (sem resposta da API) devem ser relançados, não mascarados
      if (!error.response) throw error;
      if (!errorCaught) {
        errorCaught = true;
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe('Este email já está sendo usado');
      }
    } finally {
      if (firstId) {
        try {
          await usuariosService.deleteUsuario(firstId, token);
        } catch {
          // cleanup silencioso
        }
      }
    }

    if (!errorCaught) {
      throw new Error('API retornou resposta inesperada para cadastro duplicado - era esperado status 400');
    }
  });

  // ----------------------------------------------------------
  // [FALHA] Payload enviado sem o campo "nome"
  // A API deve informar qual campo está faltando
  // Se retornar 200, o teste quebra (comportamento inesperado)
  // ----------------------------------------------------------
  test('400 - Deve rejeitar cadastro sem campo nome', async () => {
    expect.assertions(2);
    const payload = {
      ...testData.payloads.usuarioSemNome,
      email: `semnome${Date.now()}@qa.com.br`,
    };
    let errorCaught = false;

    try {
      await usuariosService.createUsuario(payload);
    } catch (error) {
      if (!error.response) throw error;
      if (!errorCaught) {
        errorCaught = true;
        expect(error.response.status).toBe(400);
        // A API retorna o nome do campo inválido como chave da resposta
        expect(error.response.data.nome).toBe('nome é obrigatório');
      }
    }

    if (!errorCaught) {
      throw new Error('API retornou resposta inesperada para payload sem nome - era esperado status 400');
    }
  });

  // ----------------------------------------------------------
  // [FALHA] Payload enviado sem o campo "email"
  // A API deve informar qual campo está faltando
  // Se retornar 200, o teste quebra (comportamento inesperado)
  // ----------------------------------------------------------
  test('400 - Deve rejeitar cadastro sem campo email', async () => {
    expect.assertions(2);
    let errorCaught = false;

    try {
      await usuariosService.createUsuario(testData.payloads.usuarioSemEmail);
    } catch (error) {
      if (!error.response) throw error;
      if (!errorCaught) {
        errorCaught = true;
        expect(error.response.status).toBe(400);
        expect(error.response.data.email).toBe('email é obrigatório');
      }
    }

    if (!errorCaught) {
      throw new Error('API retornou resposta inesperada para payload sem email - era esperado status 400');
    }
  });

  // ----------------------------------------------------------
  // [FALHA] Email enviado sem o símbolo "@" (formato inválido)
  // A API deve rejeitar antes de tentar salvar no banco
  // Se retornar 200, o teste quebra (comportamento inesperado)
  // ----------------------------------------------------------
  test('400 - Deve rejeitar cadastro com email inválido', async () => {
    expect.assertions(2);
    let errorCaught = false;

    try {
      await usuariosService.createUsuario(testData.payloads.usuarioEmailInvalido);
    } catch (error) {
      if (!error.response) throw error;
      if (!errorCaught) {
        errorCaught = true;
        expect(error.response.status).toBe(400);
        expect(error.response.data.email).toBe('email deve ser um email válido');
      }
    }

    if (!errorCaught) {
      throw new Error('API retornou resposta inesperada para email inválido - era esperado status 400');
    }
  });

  // ----------------------------------------------------------
  // [FALHA] Payload enviado sem o campo "password"
  // A API deve informar qual campo está faltando
  // Se retornar 200, o teste quebra (comportamento inesperado)
  // ----------------------------------------------------------
  test('400 - Deve rejeitar cadastro sem campo password', async () => {
    expect.assertions(2);
    const payload = {
      ...testData.payloads.usuarioSemPassword,
      email: `sempasswd${Date.now()}@qa.com.br`,
    };
    let errorCaught = false;

    try {
      await usuariosService.createUsuario(payload);
    } catch (error) {
      if (!error.response) throw error;
      if (!errorCaught) {
        errorCaught = true;
        expect(error.response.status).toBe(400);
        expect(error.response.data.password).toBe('password é obrigatório');
      }
    }

    if (!errorCaught) {
      throw new Error('API retornou resposta inesperada para payload sem password - era esperado status 400');
    }
  });
});
