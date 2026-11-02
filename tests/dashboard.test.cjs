const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const load = async () => ({core:await import('../dashboard/core.mjs'), D:JSON.parse(await fs.readFile(path.join(__dirname,'../dashboard/dados_alcar.json'),'utf8'))});
test('contrato, KPIs publicados e janelas não inventam valores', async () => {
  const {core:c,D} = await load(); c.validate(D);
  const f = c.defaults(D);
  assert.deepEqual(D.indicadores.map(i=>[i.codigo,c.summary(D,f,i.codigo).value]).sort(), [['E1',95.5],['E2',49.2],['E3',22.44],['O1',69.62],['O2',2.89],['O3',11.5]]);
  assert.equal(c.weeks(D,f).length,13);
  assert.equal(c.weeks(D,{...f,janela:'ANTERIOR'}).length,13);
  assert.equal(c.weeks(D,{...f,janela:'ANO'}).length,41);
  assert.equal(c.weeks(D,{...f,agricola:'entre'}).length,0);
  assert.equal(c.summary(D,{...f,agricola:'entre'},'E1').value,null);
  assert.equal(c.summary(D,{...f,janela:'ANTERIOR'},'E1').value,95.92);
});
test('política padrão é fiel ao contrato e simulação não altera a fonte',async()=>{
  const {core:c,D} = await load(); const original=JSON.stringify(D.itens);
  const items=c.simulate(D,95);
  assert.equal(items.filter(i=>i.risco==='crítico').length,23);
  assert.equal(items.filter(i=>i.risco==='atenção').length,13);
  assert.equal(JSON.stringify(D.itens),original);
  assert.ok(c.simulate(D,99.5).some((i,k)=>i.pp>D.itens[k].pp));
});
test('decisão valida justificativa, quantidade e prazo; CSV neutraliza fórmulas', async()=>{
  const {core:c,D} = await load(); const item=D.itens.find(i=>i.risco==='crítico');
  assert.throws(()=>c.decision(D,item,'ajustou',0,'motivo','analista',new Date()),/quantidade/i);
  assert.throws(()=>c.decision(D,item,'recusou',0,'','analista',new Date()),/justificativa/i);
  const r=c.decision(D,item,'aceitou',item.qtd,'','analista',new Date(D.meta.data_posicao+'T12:00:00-03:00'));
  assert.equal(r.decidido_no_prazo,1); assert.equal(r.cod,item.cod);
  assert.equal(c.decision(D,item,'aceitou',item.qtd,'','analista',new Date('2026-11-02T12:00:00-03:00')).decidido_no_prazo,0);
  assert.match(c.csv(['texto'],[['=1+1']]),/'=1\+1/);
  assert.deepEqual(c.moving([null,10,null,30],4),[null,10,null,20]);
});
