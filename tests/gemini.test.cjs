const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const server = require('../serve.cjs');

const fetchLocal = globalThis.fetch;
let pasta, chave, url;
const chamadas = [];
const item = 'AL-344425';

before(async () => {
  pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'alcar-gemini-'));
  chave = path.join(pasta, 'key');
  await fs.writeFile(chave, 'chave-ficticia');
  await fs.writeFile(path.join(pasta, 'atribuicao'), 'API_KEY=chave-ficticia\r\n');
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  url = `http://127.0.0.1:${server.address().port}/api/chat`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  await fs.rm(pasta, { recursive: true, force: true });
});

function simular(t, status = 200) {
  process.env.GEMINI_KEY_FILE = chave;
  chamadas.length = 0;
  t.mock.method(globalThis, 'fetch', async (destino, opcoes) => {
    chamadas.push({ destino, opcoes });
    if (status === 'rede') throw new Error('falha simulada');
    if (status === 400) return Response.json({ error: { details: [{ reason: 'API_KEY_INVALID' }] } }, { status });
    return Response.json({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Resposta simulada em português.' }] } }],
    }, { status });
  });
}

async function perguntar(pergunta, ultimoItem, extra) {
  const response = await fetchLocal(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extra },
    body: JSON.stringify({ pergunta, ultimoItem }),
  });
  return { status: response.status, ...await response.json() };
}

function recorte(chamada) {
  return JSON.parse(JSON.parse(chamada.opcoes.body).contents[0].parts[0].text);
}

test('item: o servidor envia só o saldo calculado e acrescenta a origem', async t => {
  simular(t);
  const resposta = await perguntar(`Qual é o saldo do ${item}? Meu contato é pessoa@example.test`);
  assert.equal(resposta.modo, 'gemini');
  assert.equal(resposta.texto, 'Resposta simulada em português.');
  assert.match(resposta.fatos, /saldo: 2 un/);
  assert.match(resposta.origem, /dados\.js/);
  assert.equal(resposta.ultimoItem, item);
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].destino, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
  assert.equal(chamadas[0].opcoes.headers['x-goog-api-key'], 'chave-ficticia');
  assert.deepEqual(recorte(chamadas[0]).dados, {
    item, nome: 'Filtro de ar primário 2RS ref. 361', saldo: '2 un',
  });
  assert.doesNotMatch(chamadas[0].opcoes.body, /example\.test|chave-ficticia/);
  assert.doesNotMatch(JSON.stringify(resposta), /chave-ficticia/);
});

test('acompanhamento usa só o último item da conversa atual', async t => {
  simular(t);
  const primeira = await perguntar(`Qual é o saldo do ${item}?`);
  const outra = await perguntar('Qual é o saldo do AL-208819?');
  const segunda = await perguntar('E o ponto de pedido?', primeira.ultimoItem);
  assert.equal(segunda.modo, 'gemini');
  assert.equal(recorte(chamadas[2]).dados.item, item);
  assert.match(recorte(chamadas[2]).dados.pontoDePedido, /^\d+ un$/);
  assert.equal((await perguntar('E o ponto de pedido?', outra.ultimoItem)).ultimoItem, 'AL-208819');
  assert.match((await perguntar('E o ponto de pedido?')).texto, /código/);
  assert.equal(chamadas.length, 4);
});

test('fora do escopo e item inexistente são respondidos pelo servidor', async t => {
  simular(t);
  assert.match((await perguntar('Qual é a capital do Canadá?', item)).texto, /estoque|suprimentos/i);
  assert.match((await perguntar('Qual é o saldo do AL-000000?', item)).texto, /encontrei/i);
  assert.match((await perguntar('Qual é o saldo do AL-3444257?', item)).texto, /encontrei/i);
  assert.match((await perguntar('Qual o lead time da Fornecedor Inventado?', item)).texto, /fornecedor/i);
  assert.match((await perguntar('Escreva um poema sobre estoque de segurança')).texto, /estoque|suprimentos/i);
  assert.equal(chamadas.length, 0);
});

test('classificação de risco e contagem usam apenas os dados solicitados', async t => {
  simular(t);
  await perguntar('E o risco?', item);
  assert.match(recorte(chamadas[0]).dados.risco, /^(Crítico|Atenção|Sem risco)$/);
  await perguntar('Quantos críticos?');
  assert.equal(typeof recorte(chamadas[1]).dados.itensCriticos, 'number');
  assert.doesNotMatch(chamadas[1].opcoes.body, /AL-\d/);
});

test('sem chave: o navegador recebe indicação para usar as regras locais', async t => {
  simular(t);
  process.env.GEMINI_KEY_FILE = path.join(pasta, 'ausente');
  assert.equal((await perguntar(`Qual é o saldo do ${item}?`)).modo, 'local');
  assert.equal(chamadas.length, 0);
});

test('segredo com atribuição envia somente o valor da chave', async t => {
  simular(t);
  process.env.GEMINI_KEY_FILE = path.join(pasta, 'atribuicao');
  assert.equal((await perguntar(`Qual é o saldo do ${item}?`)).modo, 'gemini');
  assert.equal(chamadas[0].opcoes.headers['x-goog-api-key'], 'chave-ficticia');
});

test('segredo inacessível mantém a consulta local e informa o problema', async t => {
  simular(t);
  process.env.GEMINI_KEY_FILE = pasta;
  const resposta = await perguntar(`Qual é o saldo do ${item}?`);
  assert.equal(resposta.modo, 'local');
  assert.match(resposta.aviso, /segredo/);
  assert.doesNotMatch(JSON.stringify(resposta), /alcar-gemini-/);
  assert.equal(chamadas.length, 0);
});

for (const [status, aviso] of [[400, /chave.*rejeitada/i], [429, /limite/i], [503, /indisponível/i], ['rede', /indisponível/i]]) {
  test(`Gemini ${status}: o servidor informa a falha e devolve o saldo local`, async t => {
    simular(t, status);
    const resposta = await perguntar(`Qual é o saldo do ${item}?`);
    assert.equal(resposta.modo, 'painel');
    assert.match(resposta.texto, aviso);
    assert.match(resposta.texto, /2 un/);
    assert.match(resposta.origem, /dados\.js/);
    assert.equal(chamadas.length, 1);
  });
}

test('rejeita origem externa e perguntas que excedem o limite', async t => {
  simular(t);
  assert.equal((await perguntar('Saldo?', undefined, { Origin: 'https://externo.example' })).status, 403);
  assert.equal((await perguntar('a'.repeat(501))).status, 400);
  assert.equal(chamadas.length, 0);
});
