const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const server=require('../serve.cjs');
(async()=>{
  let browser;
  try{
    if(!process.env.PAINEL_URL)await new Promise(r=>server.listen(0,'127.0.0.1',r));
    browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
    const page=await (await browser.newContext()).newPage({viewport:{width:1366,height:900}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text());});
    const url=(process.env.PAINEL_URL||`http://127.0.0.1:${server.address().port}`)+'/dashboard.html';
    await page.goto(url);await page.locator('[data-kpi=E1]').waitFor();

    // P2: glossário único por página
    assert.match(await page.locator('.glossario').innerText(),/● dentro da meta.*◆ fora da meta.*▲ melhora.*▼ piora.*■ estável/s);

    // P2: seta coerente com o rótulo nos cartões (nunca ▲ piora nem ▼ melhora)
    for(const cod of ['E1','E2','E3','O1','O2','O3']){
      const txt=await page.locator(`#g11-${cod}`).innerText();
      assert.doesNotMatch(txt,/▲ piora|▼ melhora/,`${cod} com seta inconsistente`);
    }

    // P4: botão "i" nos seis cartões com tooltip de cálculo
    assert.equal(await page.locator('.kpi-info').count(),6);
    await page.locator('.kpi-info').first().focus();
    assert.match(await page.locator('#tooltip').innerText(),/fonte:/);

    // P3: frase curta de escopo, sem "não se aplica a este gráfico"
    const g22scope=await page.locator('#g22 .scope').innerText();
    assert.match(g22scope,/Família/);assert.doesNotMatch(g22scope,/não se aplica/);

    // P1: g22 sem "sem eixo duplo"; g23 e g61 com amostras de cor reais
    assert.doesNotMatch(await page.locator('#g22 .note').innerText(),/sem eixo duplo/);
    assert.match(await page.locator('#g23 .legend i').first().getAttribute('style'),/var\(--oliva\)/);
    assert.equal(await page.locator('#g61 .legend span[style*="background:var("]').count(),4);

    // P1: g31 nota em três linhas
    assert.equal(await page.locator('#g31 .note').count(),3);

    // P5: header compacto (títulos na mesma linha)
    const row=await page.locator('.topo-titulos h1').boundingBox(),sub=await page.locator('.topo-titulos p').boundingBox();
    assert.ok(Math.abs(row.y-sub.y)<sub.height,'h1 e subtítulo devem compartilhar a linha');

    // P5: filtros recolhíveis com contagem de ativos
    assert.equal(await page.locator('#filters-toggle').getAttribute('aria-expanded'),'true');
    await page.selectOption('#fam','ROL');
    assert.match(await page.locator('#filters-count').innerText(),/\(1 ativo\)/);
    await page.locator('#filters-toggle').click();
    assert.equal(await page.locator('#filters-body').evaluate(el=>el.hidden),true);
    assert.equal(await page.locator('#filters-toggle').getAttribute('aria-expanded'),'false');
    await page.locator('#filters-toggle').click();
    assert.equal(await page.locator('#filters-body').evaluate(el=>el.hidden),false);

    // P3: avisos de origem DW vão para o tooltip da linha de escopo
    await page.selectOption('#janela','ANO');
    await page.locator('#g22 .scope[data-tip]').focus();
    assert.match(await page.locator('#tooltip').innerText(),/contrato do DW/);
    assert.doesNotMatch(await page.locator('#g22 .note').innerText(),/contrato/);
    assert.match(await page.locator('#g23 .scope[data-tip]').getAttribute('data-tip'),/duas janelas/);
    assert.doesNotMatch(await page.locator('#g23 .note').innerText(),/não é agregado/);
    assert.match(await page.locator('#g24 .scope[data-tip]').getAttribute('data-tip'),/exibindo/);
    assert.doesNotMatch(await page.locator('#g24 .note').innerText(),/Sem agregado anual/);
    await page.locator('#reset').click();

    // P6: resumo textual oculto no desktop, visível no celular
    assert.equal(await page.locator('.chart-summary').count(),4);    for(const el of await page.locator('.chart-summary').all())assert.equal(await el.evaluate(n=>getComputedStyle(n).display),'none');
    await page.setViewportSize({width:390,height:844});
    const visible=await page.locator('.chart-summary').first().evaluate(n=>getComputedStyle(n).display);
    assert.equal(visible,'block');
    assert.match(await page.locator('.chart-summary').first().innerText(),/Maiores: 1º/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow 390');
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('OK: glossário, setas coerentes, botão i, escopo curto, legendas com cor real, g31 em 3 notas, header compacto, filtros recolhíveis e resumo mobile.');
  }finally{if(browser)await browser.close();if(server.listening)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
