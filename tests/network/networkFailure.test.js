/*
 * ============================================================
 * TESTES: Resiliência — Falhas de Rede e Erros de Servidor
 * ============================================================
 *
 * O que este arquivo testa?
 *   Simula condições de falha que não podem ser provocadas na
 *   instância pública do ServeRest (acesso ao backend necessário).
 *   O axios é mockado via jest.spyOn para injetar os erros.
 *
 * Por que mockar?
 *   Os serviços (services/) são o único ponto de integração com a
 *   API. Verificar que eles propagam erros corretamente garante que
 *   qualquer consumer (testes ou código) possa tratar falhas de forma
 *   previsível — mesmo sem acesso ao servidor real.
 *
 * Cenários cobertos:
 *   [5xx] 500 - Erro interno do servidor ao listar usuários
 *   [5xx] 503 - Serviço indisponível ao buscar usuário por ID
 *   [5xx] 500 - Erro interno do servidor ao criar usuário
 *   [429] Rate limit excedido ao listar usuários (100 req/min)
 *   [NET] Timeout de conexão (ECONNABORTED) ao realizar login
 *   [NET] Falha de rede (ECONNREFUSED) ao cadastrar usuário
 *   [NET] Falha de rede (ECONNREFUSED) ao excluir usuário
 * ============================================================
 */

const axios = require('axios');
const usuariosService = require('../../services/usuarios.service');
const authService = require('../../services/auth.service');

describe('Falhas de Rede e Erros de Servidor (simulados via mock)', () => {
  // Restaura os mocks após cada teste para não vazar entre testes
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ----------------------------------------------------------
  // [5xx] Servidor retorna 500 ao listar usuários (GET /usuarios)
  // Verifica que o serviço propaga o erro sem engolir ou alterar
  // o status code retornado pela API
  // ----------------------------------------------------------
  test('500 - Deve propagar erro interno do servidor ao listar usuários', async () => {
    expect.assertions(2);
    jest.spyOn(axios, 'get').mockRejectedValueOnce({
      response: { status: 500, data: { message: 'Internal Server Error' } },
    });

    try {
      await usuariosService.getUsuarios();
    } catch (error) {
      expect(error.response.status).toBe(500);
      expect(error.response.data.message).toBe('Internal Server Error');
    }
  });

  // ----------------------------------------------------------
  // [5xx] Servidor retorna 503 ao buscar usuário por ID (GET /usuarios/:id)
  // 503 é o código típico de manutenção ou sobrecarga do servidor
  // ----------------------------------------------------------
  test('503 - Deve propagar serviço indisponível ao buscar usuário por ID', async () => {
    expect.assertions(2);
    jest.spyOn(axios, 'get').mockRejectedValueOnce({
      response: { status: 503, data: { message: 'Service Unavailable' } },
    });

    try {
      await usuariosService.getUsuarioById('qualquerId');
    } catch (error) {
      expect(error.response.status).toBe(503);
      expect(error.response.data.message).toBe('Service Unavailable');
    }
  });

  // ----------------------------------------------------------
  // [5xx] Servidor retorna 500 ao criar usuário (POST /usuarios)
  // Simula falha de banco de dados ou exceção não tratada no backend
  // ----------------------------------------------------------
  test('500 - Deve propagar erro interno do servidor ao criar usuário', async () => {
    expect.assertions(2);
    jest.spyOn(axios, 'post').mockRejectedValueOnce({
      response: { status: 500, data: { message: 'Internal Server Error' } },
    });

    try {
      await usuariosService.createUsuario({
        nome: 'Teste',
        email: 'teste@qa.com',
        password: '123',
        administrador: 'true',
      });
    } catch (error) {
      expect(error.response.status).toBe(500);
      expect(error.response.data.message).toBe('Internal Server Error');
    }
  });

  // ----------------------------------------------------------
  // [429] Rate limit excedido — a API aceita no máximo 100 req/min
  // Quando o limite é ultrapassado, retorna 429 Too Many Requests.
  // A instância pública não expõe headers de rate limit, por isso
  // o cenário é simulado via mock.
  // ----------------------------------------------------------
  test('429 - Deve propagar erro de rate limit excedido', async () => {
    expect.assertions(2);
    jest.spyOn(axios, 'get').mockRejectedValueOnce({
      response: { status: 429, data: { message: 'Too Many Requests' } },
    });

    try {
      await usuariosService.getUsuarios();
    } catch (error) {
      expect(error.response.status).toBe(429);
      expect(error.response.data.message).toBe('Too Many Requests');
    }
  });

  // ----------------------------------------------------------
  // [NET] Timeout de conexão ao realizar login (POST /login)
  // ECONNABORTED ocorre quando o servidor não responde no prazo —
  // o erro NÃO tem response, pois a requisição nunca foi completada
  // ----------------------------------------------------------
  test('Timeout - Deve propagar ECONNABORTED ao realizar login', async () => {
    expect.assertions(3);
    const timeoutError = new Error('timeout of 30000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    jest.spyOn(axios, 'post').mockRejectedValueOnce(timeoutError);

    try {
      await authService.login({ email: 'fulano@qa.com', password: 'teste' });
    } catch (error) {
      expect(error.code).toBe('ECONNABORTED');
      expect(error.message).toMatch(/timeout/i);
      // Timeout não tem response — distingue de erros HTTP (4xx/5xx)
      expect(error.response).toBeUndefined();
    }
  });

  // ----------------------------------------------------------
  // [NET] Falha de rede total ao cadastrar usuário (POST /usuarios)
  // ECONNREFUSED ocorre quando nenhum processo está escutando na porta —
  // simula servidor completamente fora do ar
  // ----------------------------------------------------------
  test('Falha de rede - Deve propagar ECONNREFUSED ao cadastrar usuário', async () => {
    expect.assertions(3);
    const networkError = new Error('connect ECONNREFUSED 127.0.0.1:443');
    networkError.code = 'ECONNREFUSED';
    jest.spyOn(axios, 'post').mockRejectedValueOnce(networkError);

    try {
      await usuariosService.createUsuario({
        nome: 'Teste',
        email: 'teste@qa.com',
        password: '123',
        administrador: 'true',
      });
    } catch (error) {
      expect(error.code).toBe('ECONNREFUSED');
      expect(error.message).toMatch(/ECONNREFUSED/);
      // Falha de rede não tem response — distingue de erros HTTP (4xx/5xx)
      expect(error.response).toBeUndefined();
    }
  });

  // ----------------------------------------------------------
  // [NET] Falha de rede total ao excluir usuário (DELETE /usuarios/:id)
  // Garante que a camada de serviço propaga o erro sem tratamento silencioso,
  // independente do verbo HTTP utilizado
  // ----------------------------------------------------------
  test('Falha de rede - Deve propagar ECONNREFUSED ao excluir usuário', async () => {
    expect.assertions(3);
    const networkError = new Error('connect ECONNREFUSED 127.0.0.1:443');
    networkError.code = 'ECONNREFUSED';
    jest.spyOn(axios, 'delete').mockRejectedValueOnce(networkError);

    try {
      await usuariosService.deleteUsuario('qualquerId', 'Bearer token');
    } catch (error) {
      expect(error.code).toBe('ECONNREFUSED');
      expect(error.message).toMatch(/ECONNREFUSED/);
      expect(error.response).toBeUndefined();
    }
  });
});
