const fs = require('node:fs/promises');
const { consultarChat } = require('./js/app.js');

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';
const INSTRUCAO = 'Redija uma resposta curta em português do Brasil sobre suprimentos. Use somente os fatos do JSON recebido. Mantenha números, unidades e códigos como fornecidos. Se houver várias informações, destaque os valores e o que representam. Responda em texto simples. O painel acrescenta a fonte.';

function enviar(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(dados));
}

async function lerConsulta(req) {
  const partes = [];
  let tamanho = 0;
  for await (const parte of req.iterator({ destroyOnReturn: false })) {
    tamanho += parte.length;
    if (tamanho > 8192) {
      req.resume();
      return null;
    }
    partes.push(parte);
  }
  try {
    const consulta = JSON.parse(Buffer.concat(partes).toString('utf8'));
    if (typeof consulta?.pergunta === 'string' && consulta.pergunta.trim() && consulta.pergunta.length <= 500) return consulta;
  } catch { /* JSON inválido */ }
  return null;
}

async function redigir(chave, dados) {
  const resposta = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCAO }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify({ dados }) }] }],
      generationConfig: { maxOutputTokens: 1024 },
    }),
    redirect: 'error',
    signal: AbortSignal.timeout(12000),
  });
  if (resposta.status === 429) {
    await resposta.body?.cancel();
    return { aviso: 'O Gemini atingiu o limite de consultas.' };
  }
  if ([400, 401, 403].includes(resposta.status)) {
    const { error } = await resposta.json();
    if (resposta.status === 401 || resposta.status === 403 ||
        error?.details?.some(detalhe => detalhe.reason === 'API_KEY_INVALID')) {
      return { aviso: 'A chave do Gemini foi rejeitada. Confira a chave e as permissões no Google AI Studio.' };
    }
  }
  if (!resposta.ok) {
    if (!resposta.bodyUsed) await resposta.body?.cancel();
    throw new Error('Gemini indisponível');
  }
  const { candidates } = await resposta.json();
  const candidato = candidates?.[0];
  const texto = candidato?.content?.parts?.filter(p => !p.thought && typeof p.text === 'string')
    .map(p => p.text).join('').trim();
  if (!texto || candidato.finishReason !== 'STOP') throw new Error('Gemini indisponível');
  return { texto };
}

module.exports = async function chat(req, res) {
  const { host, origin } = req.headers;
  if (!/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(host) || (origin && origin !== `http://${host}`)) {
    return enviar(res, 403, { texto: 'Consulta disponível apenas no painel local.' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return enviar(res, 405, { texto: 'Use POST para consultar o chat.' });
  }
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    return enviar(res, 415, { texto: 'Envie a consulta em JSON.' });
  }
  const consulta = await lerConsulta(req);
  if (!consulta) return enviar(res, 400, { texto: 'Envie uma pergunta de até 500 caracteres.' });

  let chave;
  try {
    const arquivo = process.env.GEMINI_KEY_FILE || '/run/secrets/gemini_api_key';
    chave = (await fs.readFile(arquivo, 'utf8')).trim().replace(/^(?:GEMINI_)?API_KEY[ \t]*=[ \t]*/, '');
  } catch (erro) {
    if (erro.code !== 'ENOENT') return enviar(res, 200, { modo: 'local', aviso: 'Não foi possível ler o segredo do Gemini. Usando a consulta local.' });
  }
  if (!chave) return enviar(res, 200, { modo: 'local' });

  const { dados, texto, origem, ultimoItem } = consultarChat(consulta.pergunta.trim(), consulta.ultimoItem, consulta.filtros);
  if (!dados) return enviar(res, 200, { modo: 'painel', texto });

  let resultado;
  try { resultado = await redigir(chave, dados); }
  catch { resultado = { aviso: 'O Gemini está indisponível.' }; }
  if (resultado.texto) return enviar(res, 200, { modo: 'gemini', texto: resultado.texto, fatos: texto, origem, ultimoItem });
  return enviar(res, 200, { modo: 'painel', texto: `${resultado.aviso} Consulta pelas regras do painel:\n${texto}`, origem, ultimoItem });
};
