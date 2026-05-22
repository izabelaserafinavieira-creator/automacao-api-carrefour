# Automação de Testes — API Usuários

Projeto de automação de testes da API REST [ServeRest](https://serverest.dev), cobrindo o módulo de **Usuários** com testes funcionais, de falha e autenticação JWT.

---

## O que cada ferramenta faz neste projeto

### Jest
Jest é o framework de testes utilizado para escrever e executar os testes automatizados em JavaScript.

Neste projeto o Jest é responsável por:
- Executar todos os arquivos `*.test.js` dentro da pasta `tests/`
- Organizar os testes em grupos (`describe`) e casos individuais (`test`)
- Verificar as respostas da API através de asserções (`expect`)
- Gerenciar o ciclo de vida dos testes com `beforeAll` e `afterAll` para criar e excluir dados de teste
- Gerar o relatório de cobertura de código em `reports/coverage/`

Os testes Jest fazem chamadas HTTP diretamente à API usando o **Axios** (via camada de serviço em `services/`), sem depender do Postman.

Além dos testes de integração contra a API real, o projeto inclui testes de resiliência que usam `jest.spyOn` para mockar o Axios e simular condições de falha impossíveis de provocar na instância pública: erros 5xx (500, 503), rate limiting (429) e falhas de rede (timeout, ECONNREFUSED).

### Postman
Postman é a ferramenta de design e documentação de coleções de requisições HTTP.

Neste projeto o Postman foi utilizado para:
- Criar e organizar a coleção de requisições da API (`collections/usuarios/usuarios.postman_collection.json`)
- Definir scripts de teste (`pm.test`) que validam as respostas de cada requisição
- Encadear requisições em sequência (Login → Criar → Listar → Buscar → Editar → Excluir)
- Gerenciar variáveis de coleção como `token`, `userId` e `baseUrl` entre as requisições
- Cobrir cenários negativos com `pm.sendRequest` dentro dos próprios scripts de teste

A coleção exportada pelo Postman é o arquivo JSON que o Newman executa.

### Newman
Newman é o executor de linha de comando para coleções do Postman.

Neste projeto o Newman é responsável por:
- Rodar a coleção Postman diretamente no terminal, sem abrir a interface gráfica
- Exibir o resultado de cada teste no console (reporter `cli`)
- Gerar o relatório HTML em `reports/usuarios.html` (reporter `html`)
- Ser executado na pipeline de CI como etapa independente dos testes Jest

Newman permite que a coleção Postman seja executada de forma automatizada em ambientes como GitHub Actions, sem necessidade de interação humana.

---

## Estrutura de Pastas

```plaintext
automacao-api-usuarios/
├── .github/
│   └── workflows/
│       └── ci.yml                        # Pipeline GitHub Actions
├── collections/
│   └── usuarios/
│       └── usuarios.postman_collection.json  # Coleção Postman executada pelo Newman
├── data/
│   └── usuarios.json                     # Payloads e credenciais de teste
├── reports/
│   ├── usuarios.html                     # Relatório Newman (gerado ao executar)
│   └── coverage/                         # Relatório de cobertura Jest (gerado ao executar)
├── services/
│   ├── auth.service.js                   # Serviço de autenticação (login JWT)
│   └── usuarios.service.js               # Serviço CRUD de usuários (usado pelo Jest)
├── tests/
│   ├── setup.js                          # Interceptadores Axios: log de requisições e mascaramento de dados sensíveis
│   ├── helpers/
│   │   └── auth.helper.js                # Helper para obter e cachear token JWT
│   ├── network/
│   │   └── networkFailure.test.js        # Simulados via mock
│   └── usuarios/
│       ├── criarUsuario.test.js          # POST /usuarios
│       ├── deleteUsuario.test.js         # DELETE /usuarios/:id
│       ├── getUsuarioById.test.js        # GET /usuarios/:id
│       ├── getUsuarios.test.js           # GET /usuarios
│       ├── login.test.js                 # POST /login
│       └── updateUsuario.test.js         # PUT /usuarios/:id
├── package.json
└── README.md
```

---

## API Testada

**Base URL:** `https://serverest.dev`

| Método | Endpoint      | Descrição             | Auth JWT | Arquivo de teste         |
|--------|---------------|-----------------------|----------|--------------------------|
| POST   | /login        | Gerar token JWT       | Não      | login.test.js            |
| GET    | /usuarios     | Listar usuários       | Não      | getUsuarios.test.js      |
| POST   | /usuarios     | Cadastrar usuário     | Não      | criarUsuario.test.js     |
| GET    | /usuarios/:id | Buscar por ID         | Não      | getUsuarioById.test.js   |
| PUT    | /usuarios/:id | Editar usuário        | **Sim**  | updateUsuario.test.js    |
| DELETE | /usuarios/:id | Excluir usuário       | **Sim**  | deleteUsuario.test.js    |

---

## Casos de Teste Cobertos

### POST /login
| Cenário | Status Esperado |
|---------|----------------|
| Login com email e senha corretos retorna token JWT | 200 |
| Login com email ou senha incorretos é rejeitado | 401 |

### POST /usuarios
| Cenário | Status Esperado |
|---------|----------------|
| Criação com todos os campos preenchidos corretamente | 201 |
| Tentativa de cadastro com email já existente na base | 400 |
| Envio do formulário sem o campo `nome` | 400 |
| Envio do formulário sem o campo `email` | 400 |
| Envio com `email` em formato inválido (sem @) | 400 |
| Envio do formulário sem o campo `password` | 400 |
| Envio do formulário sem o campo `administrador` | 400 |

### GET /usuarios
| Cenário | Status Esperado |
|---------|----------------|
| Listagem retorna total de registros e array de usuários | 200 |
| Cada usuário retornado possui todos os campos obrigatórios | 200 |
| Filtro `?administrador=true` retorna somente administradores | 200 |
| Filtro `?administrador=false` retorna somente usuários comuns | 200 |

### GET /usuarios/:id
| Cenário | Status Esperado |
|---------|----------------|
| Busca com ID existente retorna os dados do usuário | 200 |
| Busca com ID inexistente ou inválido retorna erro | 400 |

### PUT /usuarios/:id
| Cenário | Status Esperado |
|---------|----------------|
| Atualização com token JWT válido altera os dados | 200 |
| Atualização com ID inexistente cria um novo usuário (upsert) | 201 |
| Atualização com email já utilizado por outro usuário é rejeitada | 400 |

### DELETE /usuarios/:id
| Cenário | Status Esperado |
|---------|----------------|
| Exclusão com token JWT válido remove o usuário | 200 |
| Exclusão com ID inexistente retorna "nenhum registro excluído" | 200 |
| Exclusão sem token com ID inexistente retorna "nenhum registro excluído" | 200 |

### Falhas de Rede e Erros de Servidor (simulados via mock)
| Cenário | Status Esperado |
|---------|----------------|
| Servidor retorna erro interno ao listar usuários | 500 |
| Servidor retorna serviço indisponível ao buscar usuário por ID | 503 |
| Servidor retorna erro interno ao criar usuário | 500 |
| Limite de 100 requisições por minuto é ultrapassado | 429 |
| Servidor não responde dentro do prazo ao realizar login | ECONNABORTED |
| Servidor inacessível ao tentar cadastrar usuário | ECONNREFUSED |
| Servidor inacessível ao tentar excluir usuário | ECONNREFUSED |

---

## Configuração do Ambiente

**Pré-requisitos:** Node.js >= 18

```bash
# Clone o repositório
git clone https://github.com/izabelaserafinavieira-creator/automacao-api-carrefour.git

# Instale as dependências
npm install

# Caso o newman-reporter-html apresente conflito de peer deps
npm install -D newman-reporter-html --legacy-peer-deps
```

---

## Como Executar os Testes

### Jest (com cobertura de código)

```bash
npm test
```

Relatório de cobertura gerado em `reports/coverage/index.html`.

### Newman (coleção Postman)

```bash
npm run newman:usuarios
```

Relatório HTML gerado em `reports/usuarios.html`.

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm test` | Executa todos os testes Jest com cobertura |
| `npm run test:coverage` | Alias explícito para Jest com cobertura |
| `npm run newman:usuarios` | Executa a coleção Postman via Newman |

---

## Pipeline de CI (GitHub Actions)

O arquivo [.github/workflows/ci.yml](.github/workflows/ci.yml) executa automaticamente a cada `push` ou `pull request` para `main`/`master`:

1. Instala as dependências com `npm ci`
2. Executa os testes Jest com cobertura
3. Executa a coleção Newman
4. Publica os relatórios como artefatos (disponíveis por 30 dias na aba **Actions** do repositório)

---

## Referências

- [ServeRest — API de testes](https://serverest.dev/)
- [Jest — framework de testes](https://jestjs.io/)
- [Newman — CLI do Postman](https://www.npmjs.com/package/newman)
- [Postman — criação de coleções](https://learning.postman.com/docs/getting-started/introduction/)
