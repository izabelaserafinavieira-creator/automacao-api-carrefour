/*
 * ============================================================
 * TESTES: Listar Usuários — GET /usuarios
 * ============================================================
 *
 * O que este arquivo testa?
 *   Verifica se a API retorna a listagem de usuários com a
 *   estrutura correta e se o filtro por tipo de usuário funciona.
 *
 * Fluxo de cada teste:
 *   1. Envia a requisição (com ou sem parâmetro de filtro)
 *   2. Verifica o status HTTP e a estrutura da resposta
 *   3. Confere campos obrigatórios ou valores do filtro em cada item
 *
 * Cenários cobertos:
 *   [SUCESSO] Listagem geral retorna "quantidade" e array "usuarios"  → 200
 *   [SUCESSO] Campos obrigatórios presentes em cada usuário retornado → 200
 *   [SUCESSO] Filtro administrador=true retorna somente admins        → 200
 *   [SUCESSO] Filtro administrador=false retorna somente não-admins   → 200
 *
 * Observação sobre o beforeAll:
 *   Um usuário não-administrador é criado antes dos testes para
 *   garantir que o filtro administrador=false sempre encontre ao menos
 *   um resultado — sem isso o teste seria inútil (lista vazia passaria).
 * ============================================================
 */

const usuariosService = require('../../services/usuarios.service');
const { getToken } = require('../helpers/auth.helper');
const testData = require('../../data/usuarios.json');

describe('GET /usuarios - Listar Usuários', () => {
  let nonAdminId;
  let token;

  // Cria um usuário não-administrador antes dos testes para garantir
  // resultado no filtro administrador=false e remove após todos os testes
  beforeAll(async () => {
    token = await getToken();
    const response = await usuariosService.createUsuario({
      ...testData.payloads.usuarioValido,
      administrador: 'false',
      email: `nonadmin${Date.now()}@qa.com.br`,
    });
    nonAdminId = response.data._id;
  });

  afterAll(async () => {
    if (nonAdminId) {
      try {
        await usuariosService.deleteUsuario(nonAdminId, token);
      } catch {
        // cleanup silencioso — token pode ter expirado ou usuário já removido
      }
    }
  });

  // ----------------------------------------------------------
  // [SUCESSO] Resposta deve conter "quantidade" e array "usuarios"
  // O campo "quantidade" deve refletir exatamente o tamanho do array
  // ----------------------------------------------------------
  test('200 - Deve retornar lista com quantidade e array de usuários', async () => {
    const response = await usuariosService.getUsuarios();

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('quantidade');
    expect(response.data).toHaveProperty('usuarios');
    expect(Array.isArray(response.data.usuarios)).toBe(true);
    // Consistência: o campo "quantidade" deve bater com o tamanho real do array
    expect(response.data.quantidade).toBe(response.data.usuarios.length);
  });

  // ----------------------------------------------------------
  // [SUCESSO] Contrato do objeto usuário — todos os campos devem existir
  // Lista vazia tornaria este teste um falso positivo; o beforeAll
  // garante que sempre há ao menos um usuário para validar
  // ----------------------------------------------------------
  test('200 - Cada usuário deve conter os campos obrigatórios', async () => {
    const response = await usuariosService.getUsuarios();

    expect(response.status).toBe(200);
    // Exige ao menos um usuário — lista vazia não prova que o contrato está correto
    expect(response.data.usuarios.length).toBeGreaterThan(0);

    response.data.usuarios.forEach((usuario) => {
      expect(usuario).toHaveProperty('_id');
      expect(usuario).toHaveProperty('nome');
      expect(usuario).toHaveProperty('email');
      expect(usuario).toHaveProperty('password');
      expect(usuario).toHaveProperty('administrador');
    });
  });

  // ----------------------------------------------------------
  // [SUCESSO] Filtro administrador=true: todos os itens retornados
  // devem ter o campo administrador igual a "true"
  // ----------------------------------------------------------
  test('200 - Deve filtrar usuários por administrador=true', async () => {
    const response = await usuariosService.getUsuarios({ administrador: 'true' });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.usuarios)).toBe(true);
    // Lista vazia não prova que o filtro funciona — exige ao menos um resultado
    expect(response.data.usuarios.length).toBeGreaterThan(0);
    response.data.usuarios.forEach((usuario) => {
      expect(usuario.administrador).toBe('true');
    });
  });

  // ----------------------------------------------------------
  // [SUCESSO] Filtro administrador=false: o usuário criado no beforeAll
  // garante que a lista nunca estará vazia ao aplicar este filtro
  // ----------------------------------------------------------
  test('200 - Deve filtrar usuários por administrador=false', async () => {
    const response = await usuariosService.getUsuarios({ administrador: 'false' });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.usuarios)).toBe(true);
    // beforeAll criou um não-admin, portanto este filtro deve retornar ao menos 1
    expect(response.data.usuarios.length).toBeGreaterThan(0);
    response.data.usuarios.forEach((usuario) => {
      expect(usuario.administrador).toBe('false');
    });
  });
});
