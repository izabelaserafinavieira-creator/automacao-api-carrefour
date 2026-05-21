/*
 * ============================================================
 * TESTES: Autenticação — POST /login
 * ============================================================
 *
 * O que este arquivo testa?
 *   Verifica se a API autentica corretamente com credenciais
 *   válidas e se rejeita credenciais inválidas.
 *
 * Fluxo de cada teste:
 *   1. Monta as credenciais (email e password)
 *   2. Envia a requisição POST /login
 *   3. Verifica o status HTTP e o conteúdo da resposta
 *
 * Cenários cobertos:
 *   [SUCESSO] Credenciais válidas retornam token JWT Bearer   → 200
 *   [FALHA]   Credenciais inválidas são rejeitadas            → 401
 * ============================================================
 */

const authService = require('../../services/auth.service');
const testData = require('../../data/usuarios.json');

describe('POST /login - Autenticação', () => {
  // ----------------------------------------------------------
  // [SUCESSO] Login com credenciais corretas: verifica que a resposta
  // contém um token JWT válido com o prefixo "Bearer "
  // ----------------------------------------------------------
  test('200 - Deve autenticar e retornar token JWT com credenciais válidas', async () => {
    const response = await authService.login(testData.credenciais.admin);

    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Login realizado com sucesso');
    // Token deve ser uma string não-vazia com o prefixo exato do padrão Bearer
    expect(typeof response.data.authorization).toBe('string');
    expect(response.data.authorization).toMatch(/^Bearer /);
  });

  // ----------------------------------------------------------
  // [FALHA] Credenciais incorretas devem ser rejeitadas com 401
  // A API não deve revelar qual campo está errado (email ou password)
  // Se retornar 200, o teste quebra (comportamento inesperado)
  // ----------------------------------------------------------
  test('401 - Deve rejeitar login com credenciais inválidas', async () => {
    expect.assertions(2);
    let errorCaught = false;

    try {
      await authService.login({ email: 'invalido@qa.com', password: 'senhaerrada' });
    } catch (error) {
      if (!error.response) throw error;
      if (!errorCaught) {
        errorCaught = true;
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toBe('Email e/ou senha inválidos');
      }
    }

    if (!errorCaught) {
      throw new Error('API retornou resposta inesperada para login inválido - era esperado status 401');
    }
  });
});
