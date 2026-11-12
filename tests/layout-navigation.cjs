const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const server = require('../serve.cjs');
(async () => {
  let browser;
  const external = process.env.PAINEL_URL;
  try {
    if (!external) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = external || `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
    const page = await browser.newPage({viewport: {width: 1366, height: 900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url}`); });
    for (const file of ['index.html', 'compras.html', 'decisoes.html', 'dashboard.html']) {
      await page.goto(`${base}/${file}`);
      await page.locator('.sidebar .navegacao').waitFor({timeout: 3000});
      assert.equal(await page.locator('.topo .navegacao').count(), 0);
      assert.equal(await page.locator('.sidebar a[aria-current="page"]').getAttribute('href'), file);
      assert.equal(await page.locator('.sidebar a[aria-current="page"]').count(), 1);
      const boxes = await page.evaluate(() => ({side: document.querySelector('.sidebar').getBoundingClientRect().right, main: document.querySelector('main').getBoundingClientRect().left}));
      assert.ok(boxes.main >= boxes.side, file);
      for (const width of [390, 820, 1366]) {
        await page.setViewportSize({width, height: 900});
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${file} ${width}`);
      }
      await page.setViewportSize({width: 390, height: 900});
      const menu = page.getByRole('button', {name: 'Menu', exact: true});
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('.sidebar').isVisible(), false);
      await menu.focus(); await page.keyboard.press('Enter');
      assert.equal(await menu.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('.sidebar').isVisible(), true);
      assert.equal(await page.locator('.sidebar a').first().evaluate(el => el === document.activeElement), true, 'Menu aberto deve focar primeiro link');
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      assert.equal(await menu.evaluate(el => el === document.activeElement), true);
      await page.setViewportSize({width: 1366, height: 900});
    }
    await page.locator('[data-kpi=E1]').waitFor();
    assert.equal(await page.locator('.topo .panel-nav a').count(), 6);
    assert.equal(await page.locator('#dashboard .panel-nav').count(), 0);
    assert.equal(await page.locator('.panel-nav a[aria-current="location"]').getAttribute('href'), '#painel-1');
    for (const n of [5, 3, 2, 4, 6, 1]) {
      const link = page.locator(`.panel-nav a[href="#painel-${n}"]`);
      await link.click();
      await page.waitForFunction(n => document.querySelector(`.panel-nav a[href="#painel-${n}"]`)?.getAttribute('aria-current') === 'location', n);
      const bounds = await page.evaluate(n => ({panel: document.querySelector(`#painel-${n}`).getBoundingClientRect().top, filters: document.querySelector('#filters').getBoundingClientRect().bottom}), n);
      assert.ok(bounds.panel >= bounds.filters - 2, `panel ${n} hidden by sticky header`);
      assert.deepEqual(await link.evaluate(el => ({background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color})), {background: 'rgb(21, 88, 176)', color: 'rgb(255, 255, 255)'});
    }
    await page.locator('.panel-nav a[href="#painel-3"]').click();
    await page.selectOption('#fam', 'ROL');
    assert.equal(await page.locator('.panel-nav a[aria-current="location"]').getAttribute('href'), '#painel-3');
    assert.match(page.url(), /fam=ROL/);
    await page.evaluate(() => document.querySelector('#painel-5').scrollIntoView());
    await page.waitForFunction(() => document.querySelector('.panel-nav a[href="#painel-5"]')?.getAttribute('aria-current') === 'location');
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => document.querySelector('.panel-nav a[href="#painel-1"]')?.getAttribute('aria-current') === 'location', null, {timeout: 3000});
    await page.setViewportSize({width: 390, height: 900});
    await page.locator('.panel-nav a[href="#painel-6"]').click();
    assert.equal(await page.locator('.panel-nav a[aria-current="location"]').getAttribute('href'), '#painel-6');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    console.log('OK: lateral nas quatro páginas; menu teclado/mobile; seis atalhos no header; seleção, rolagem e filtros preservados.');
  } finally {
    if (browser) await browser.close();
    if (!external) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
