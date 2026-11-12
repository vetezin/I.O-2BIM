import * as core from './core.mjs';
import * as panels from './paineis.mjs';
import {graph,table} from './charts.mjs';
let D,F,items,decisions=[],memoryOnly=false,lastFocus=null,activePanel='painel-1';
const $=s=>document.querySelector(s);
const storage=()=>{try{return window.localStorage;}catch{return undefined;}};
const sel=(id,label,options,value)=>`<label for="${id}">${label}<select id="${id}">${options.map(([v,l])=>`<option value="${core.esc(v)}" ${String(v)===String(value)?'selected':''}>${core.esc(l)}</option>`).join('')}</select></label>`;
function focusSelector(el=document.activeElement) {
  if(!el?.closest('#dashboard,#filters'))return null;
  if(el.id)return '#'+CSS.escape(el.id);
  const attrs=['data-table','data-csv','data-fam','data-ind','data-detail','data-decision','data-cod','data-page'].filter(k=>el.hasAttribute(k));
  if(!attrs.length)return null;
  const graph=el.closest('[data-graph]');
  return (graph?'#'+CSS.escape(graph.id)+' ':'')+attrs.map(k=>`[${k}="${CSS.escape(el.getAttribute(k))}"]`).join('');
}
function restoreFocus(selector) {
  if(!selector)return;
  let target=$(selector);
  if(target?.disabled&&target.hasAttribute('data-page'))target=$('#g33 [data-page]:not(:disabled)')||$('#g33 [data-detail]');
  target?.focus({preventScroll:true});
}
function fromHash() {
  const params=new URLSearchParams(location.hash.slice(1)),base=core.defaults(D);
  const choices={fam:['TOTAL',...D.familias.map(f=>f.id)],janela:['ATUAL','ANTERIOR','ANO'],agricola:['','safra','entre'],forn:['',...D.fornecedores.map(f=>f.id)],abc:['','A','B','C'],risco:['','crítico','atenção','sem risco'],padrao:['','suave','intermitente'],indicador:D.indicadores.map(i=>i.codigo)};
  for(const [k,list]of Object.entries(choices))if(list.includes(params.get(k)))base[k]=params.get(k);
  if(params.has('nivel')){const n=Number(params.get('nivel'));if(n>=90&&n<=99.5&&n*2===Math.round(n*2))base.nivel=n;}
  return base;
}
function filters() {
  const focus=focusSelector();
  $('#filters').innerHTML=`<div class="wrap"><div class="filter-grid">${sel('fam','Família',[['TOTAL','Todas (empresa)'],...D.familias.map(f=>[f.id,f.nome])],F.fam)}${sel('janela','Janela',[['ATUAL',`Atual (${D.meta.parametros.janela_semanas} semanas)`],['ANTERIOR',`Anterior (${D.meta.parametros.janela_semanas} semanas)`],['ANO',`Ano (${D.semanas.length} semanas)`]],F.janela)}${sel('agricola','Período agrícola',[['','Todos'],['safra','Safra'],['entre','Entressafra']],F.agricola)}${sel('forn','Fornecedor',[['','Todos'],...D.fornecedores.map(f=>[f.id,f.nome])],F.forn)}${sel('abc','Curva ABC',[['','Todas'],['A','A'],['B','B'],['C','C']],F.abc)}${sel('risco','Risco',[['','Todos'],['crítico','◆ crítico'],['atenção','▲ atenção'],['sem risco','● sem risco']],F.risco)}${sel('padrao','Padrão de demanda',[['','Todos'],['suave','Suave'],['intermitente','Intermitente']],F.padrao)}<label for="nivel">Nível de serviço (what-if): <output id="nivel-value">${core.num(F.nivel)}%</output><input id="nivel" type="range" min="90" max="99.5" step="0.5" value="${F.nivel}"></label></div><div class="filter-bottom"><button id="reset">Limpar filtros</button><span id="filter-summary">${core.weeks(D,F).length} semanas · posição ${core.date(D.meta.data_posicao)} · <a href="#painel-1">Voltar aos indicadores</a></span>${sel('perfil','Perfil da decisão',[['analista','Analista'],['compras','Compras'],['gestor','Gestor']],F.perfil)}</div></div>`;
  restoreFocus(focus);
}
function render() {
  const focus=focusSelector();
  items=core.simulate(D,F.nivel);
  const views=[
    ['p1',1,'Como estamos?'],
    ['p5',5,'Como nos comparamos?'],
    ['p3',3,'Riscos e compras'],
    ['p2',2,'Como estão as entregas?'],
    ['p4',4,'Previsão e aprovação'],
    ['p6',6,'O clima influencia?'],
  ].filter(([name])=>typeof panels[name]==='function');
  const steps=views.map(([,n,label])=>`<li><a href="#painel-${n}"${activePanel===`painel-${n}`?' aria-current="location"':''}>${label}</a></li>`).join('');
  $('#dashboard-panel-nav').innerHTML=`<ol role="list">${steps}</ol>`;
  $('#dashboard').innerHTML=`<p class="notice">${core.esc(D.meta.aviso)} Os indicadores desta aba vêm do contrato do DW, versão ${core.esc(D.meta.versao_contrato)}. As telas anteriores preservam o protótipo original.</p>${views.map(([name])=>panels[name](D,F,decisions,items)).join('')}${decisionHistory()}`;
  const params=new URLSearchParams();for(const k of ['fam','janela','agricola','forn','abc','risco','padrao','nivel','indicador'])if(F[k]!==''&&F[k]!=null)params.set(k,F[k]);
  history.replaceState(null,'','#'+params);
  $('#filter-summary').innerHTML=`${core.weeks(D,F).length} semanas · posição ${core.date(D.meta.data_posicao)} · <a href="#painel-1">Voltar aos indicadores</a>`;
  if(memoryOnly)$('#message').textContent='Armazenamento indisponível: decisões mantidas em memória nesta aba.';
  restoreFocus(focus);
}
function decisionHistory() {
  const headers=['Código','Data da sugestão','Data da decisão','Qtd. sugerida','Qtd. decidida','Decisão','Perfil','Justificativa','No prazo'];
  const rows=decisions.map(r=>[r.cod,r.data_sugestao,r.data_decisao,core.num(r.qtd_sugerida),core.num(r.qtd_decidida),r.decisao,r.perfil,r.justificativa,r.decidido_no_prazo?'sim':'não']);
  return `<section class="panel" id="dashboard-decisions"><h2>Decisões do Dashboard</h2><p id="storage-status">${memoryOnly?'Armazenamento indisponível: registros somente em memória nesta aba.':'Registros locais deste navegador, separados do protótipo anterior.'}</p>${graph('decision-log',`${decisions.length} decisões registradas`,headers,rows,table(headers,rows),'Não escreva dados pessoais nas justificativas.')}</section>`;
}
function download(id) {
  const table=document.getElementById(id)?.querySelector('.data-table table');if(!table)return;
  const rows=[...table.rows].map(r=>[...r.cells].map(c=>c.textContent.trim()));
  const blob=new Blob([core.csv(rows.shift(),rows)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=id+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function closeDialog(dialog) {dialog.close();if(lastFocus?.isConnected)lastFocus.focus();else $(`[data-detail="${dialog.dataset.cod}"]`)?.focus();}
function openDetail(cod) {
  const item=items.find(i=>i.cod===cod);if(!item)return;
  lastFocus=document.activeElement;$('#detail').dataset.cod=cod;
  $('#detail').innerHTML=`<button class="close" data-close="detail">Fechar (Esc)</button>${panels.detail?panels.detail(D,F,item):'<h2>'+core.esc(item.nome)+'</h2>'}`;
  $('#detail').showModal();$('#detail .close').focus();
}
function openDecision(cod,action) {
  const item=items.find(i=>i.cod===cod);if(!item)return;
  lastFocus=document.activeElement;$('#decision').dataset.cod=cod;
  $('#decision').innerHTML=`<button class="close" data-close="decision">Fechar (Esc)</button><h2 id="decision-title">${{aceitou:'Aceitar',ajustou:'Ajustar',recusou:'Recusar'}[action]}: ${core.esc(item.nome)}</h2><form id="decision-form" data-cod="${core.esc(cod)}" data-action="${action}"><p>Sugerido: ${core.num(item.qtd)} un · ${core.money(item.valor)} · ${core.esc(item.risco)}</p><label for="quantity">Quantidade decidida<input id="quantity" type="number" min="0.001" step="any" value="${action==='recusou'?0:item.qtd}" ${action!=='ajustou'?'disabled':''} required></label><label for="why">Justificativa ${action==='aceitou'?'(opcional)':'(obrigatória)'}<input id="why" maxlength="500" ${action!=='aceitou'?'required':''}></label><p class="note">não escreva dados pessoais</p><p class="note">Perfil: ${core.esc(F.perfil)}. Data da sugestão: ${D.meta.data_posicao}; prazo contado desde essa data.</p><p class="error" id="decision-error" role="alert"></p><div class="dialog-actions"><button type="submit">Confirmar decisão</button></div></form>`;
  $('#decision').showModal();$('#decision input:not([disabled])').focus();
}
function selectPanel(id) {
  activePanel=id;
  for(const link of document.querySelectorAll('#dashboard-panel-nav a')) {
    if(link.getAttribute('href')===`#${id}`)link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  }
}
function events() {
  let scrollPending=false;
  window.addEventListener('scroll',()=>{
    if(scrollPending)return;
    scrollPending=true;
    requestAnimationFrame(()=>{
      scrollPending=false;
      const offset=$('.topo').getBoundingClientRect().bottom+($('#filters')&&getComputedStyle($('#filters')).position==='sticky'?$('#filters').getBoundingClientRect().height:0)+20;
      const sections=[...document.querySelectorAll('#dashboard .panel[id^="painel-"]')];
      const current=sections.filter(section=>section.getBoundingClientRect().top<=offset).at(-1)||sections[0];
      if(current)selectPanel(current.id);
    });
  },{passive:true});
  $('#filters').addEventListener('change',e=>{const k=e.target.id;if(!(k in F))return;F[k]=k==='nivel'?Number(e.target.value):e.target.value;F.page=0;if(k==='nivel')$('#nivel-value').textContent=core.num(F.nivel)+'%';render();});
  $('#filters').addEventListener('click',e=>{if(e.target.closest('#reset')){F=core.defaults(D);filters();render();}});
  $('#dashboard').addEventListener('change',e=>{if(e.target.id==='indicador')F.indicador=e.target.value;else if(e.target.id==='item')F.item=e.target.value;else if(e.target.id==='pareto')F.pareto=e.target.value;else return;render();});
  document.addEventListener('click',e=>{
    const anchor=e.target.closest('a[href^="#painel-"]');
    if(anchor){e.preventDefault();const id=anchor.getAttribute('href').slice(1);selectPanel(id);document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'});return;}
    const b=e.target.closest('[data-table],[data-csv],[data-fam],[data-ind],[data-detail],[data-decision],[data-close],[data-page]');if(!b)return;
    if(b.dataset.table){const table=document.getElementById(b.dataset.table+'-table');table.hidden=!table.hidden;b.setAttribute('aria-expanded',String(!table.hidden));b.textContent=table.hidden?'Ver como tabela':'Ocultar tabela';}
    else if(b.dataset.csv)download(b.dataset.csv);
    else if(b.dataset.fam){F.fam=b.dataset.fam;F.page=0;filters();render();}
    else if(b.dataset.ind){F.indicador=b.dataset.ind;render();}
    else if(b.dataset.detail)openDetail(b.dataset.detail);
    else if(b.dataset.decision)openDecision(b.dataset.cod,b.dataset.decision);
    else if(b.dataset.close)closeDialog(document.getElementById(b.dataset.close));
    else if(b.dataset.page){F.page=Math.max(0,F.page+Number(b.dataset.page));render();$('#g33').scrollIntoView({block:'start'});}
  });
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('svg [data-fam]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  $('#decision').addEventListener('submit',e=>{e.preventDefault();const form=e.target,item=items.find(i=>i.cod===form.dataset.cod);try{
    const record=core.decision(D,item,form.dataset.action,$('#quantity').value,$('#why').value,F.perfil);decisions.push(record);memoryOnly=!core.saveDecisions(decisions,storage());D.decisoes=decisions;closeDialog($('#decision'));render();$('#message').textContent='Decisão registrada.';
  }catch(error){$('#decision-error').textContent=error.message;}});
  const showTip=e=>{const el=e.target.closest('[data-tip]');if(!el)return;const rect=el.getBoundingClientRect(),tt=$('#tooltip');tt.textContent=el.dataset.tip;tt.hidden=false;tt.style.left=Math.max(8,Math.min(innerWidth-330,e.clientX||rect.left))+'px';tt.style.top=Math.max(8,Math.min(innerHeight-100,(e.clientY||rect.top)+18))+'px';
    if(el.dataset.sync){document.querySelectorAll(`[data-sync="${el.dataset.sync}"]`).forEach(p=>p.classList.toggle('highlight',p.dataset.index===el.dataset.index));const points=[...document.querySelectorAll(`[data-sync="${el.dataset.sync}"][data-index="${el.dataset.index}"]`)];const target=$('#climate-cursor');if(target)target.textContent=points.map(p=>p.dataset.tip).join(' | ');}};
  document.addEventListener('pointerover',showTip);document.addEventListener('focusin',showTip);
  document.addEventListener('pointerout',()=>{if(!document.activeElement?.closest('[data-tip]'))$('#tooltip').hidden=true;});document.addEventListener('focusout',()=>$('#tooltip').hidden=true);
}
export async function init() {
  try{const response=await fetch('dashboard/dados_alcar.json',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status);D=core.validate(await response.json());F=fromHash();decisions=core.readDecisions(D,storage());D.decisoes=decisions;
    filters();render();events();$('#filters').hidden=false;$('#dashboard').hidden=false;$('#loading').hidden=true;
  }catch(e){const reason=e.name==='TimeoutError'?'o servidor não respondeu em 15 segundos. Verifique a conexão e tente novamente':e.message;$('#loading').innerHTML=`<p role="alert">Não foi possível carregar o Dashboard: ${core.esc(reason)}.</p><button id="retry">Tentar novamente</button>`;$('#retry').onclick=()=>location.reload();}
}
