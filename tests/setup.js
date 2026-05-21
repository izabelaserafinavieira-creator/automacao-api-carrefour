/*
 * Configuração Global dos Testes (Jest setupFilesAfterEnv)
 *
 * Este arquivo é executado automaticamente pelo Jest antes de cada
 * arquivo de teste. Ele registra dois interceptores no Axios que
 * imprimem no console cada requisição enviada e cada resposta recebida.
 *
 * Isso permite que qualquer pessoa que rode os testes veja exatamente:
 *   - Qual método e URL foram chamados
 *   - Qual payload foi enviado
 *   - Qual status e corpo a API retornou
 *
 * Campos sensíveis (password, authorization) são substituídos por "****"
 * para não expor credenciais reais no terminal.
 */

const axios = require('axios');

// Campos que nunca devem aparecer em texto puro no terminal
const CAMPOS_SENSIVEIS = ['password', 'authorization'];

// Substitui os valores dos campos sensíveis por "****" antes de exibir
function sanitizar(data) {
  if (!data || typeof data !== 'object') return data;
  return Object.fromEntries(
    Object.entries(data).map(([chave, valor]) => [
      chave,
      CAMPOS_SENSIVEIS.includes(chave.toLowerCase()) ? '****' : valor,
    ])
  );
}

// Antes de enviar: exibe o método HTTP, a URL e o corpo da requisição
axios.interceptors.request.use((config) => {
  const corpo = config.data
    ? `\n         Payload   : ${JSON.stringify(sanitizar(config.data))}`
    : '';
  console.log(`\n         Requisição: ${config.method.toUpperCase()} ${config.url}${corpo}`);
  return config;
});

// Após receber: exibe o status e o corpo da resposta (tanto sucesso quanto erro)
axios.interceptors.response.use(
  (response) => {
    console.log(`         Resposta  : ${response.status} ${JSON.stringify(sanitizar(response.data))}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.log(`         Resposta  : ${error.response.status} ${JSON.stringify(sanitizar(error.response.data))}`);
    }
    return Promise.reject(error);
  }
);
