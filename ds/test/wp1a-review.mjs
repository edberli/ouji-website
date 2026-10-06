// Focused rendered checks for WP1a. Outputs stay in ds/qa/wp1a-review on the SSD.
// PW_NODE_MODULES=/path/to/node_modules CHROME=/path/to/chrome-headless-shell node ds/test/wp1a-review.mjs
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(path.join(process.env.PW_NODE_MODULES || '/Volumes/core/.npm/_npx/9833c18b2d85bc59/node_modules', 'package.json'));
const {chromium} = require('playwright-core');
const out = path.join(root, 'ds/qa/wp1a-review');
const guard = () => execFileSync('python3', ['/Volumes/core/claude-work/bin/agent-browser-guard.py', '--check'], {stdio: 'pipe'});
const report = {status: 'running', views: []};
let browser;
try {
  guard();
  fs.mkdirSync(out, {recursive: true});
  browser = await chromium.launch({executablePath: process.env.CHROME || undefined, args: ['--allow-file-access-from-files']});
  for (const [name, width, height, mobile] of [['desktop', 1440, 900, false], ['mobile', 375, 812, true]]) {
    guard();
    const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: 'zh-HK'});
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.BASE ? `${process.env.BASE}/ds/index.html` : new URL('ds/index.html', `file://${root}`).href, {waitUntil: 'load'});
      await page.waitForFunction(() => document.querySelectorAll('.o-shelf__spine').length > 0);
      await page.evaluate(() => document.fonts.ready);
      const view = {name, width, height, errors, checks: [], contrast: []};
      report.views.push(view);
      const check = (name, pass, details) => {view.checks.push({name, pass, details}); if (!pass) throw Error(`${view.name}: ${name}`);};
      check('one working page', context.pages().length === 1);
      check('no page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      guard();
      await page.screenshot({path: path.join(out, `${name}-hero.png`)});
      const boxes = await page.evaluate(() => {
        const hero = document.querySelector('.o-demo-hero').getBoundingClientRect();
        return ['.o-demo-hero__copy .o-latin', '.o-demo-hero h1', '.o-demo-hero__copy p'].map(selector => {
          const el = document.querySelector(selector), box = el.getBoundingClientRect(), css = getComputedStyle(el);
          const rgb = css.color.match(/\d+/g).slice(0, 3).map(Number);
          return {selector, x: Math.floor(box.x - hero.x), y: Math.floor(box.y - hero.y), width: Math.ceil(box.right - hero.x) - Math.floor(box.x - hero.x), height: Math.ceil(box.bottom - hero.y) - Math.floor(box.y - hero.y), text: '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join(''), minimum: parseFloat(css.fontSize) < 24 ? 7 : 4.5};
        });
      });
      // Hide HTML foreground only; capture the actual cover crop and painted CSS wash.
      const foreground = await page.addStyleTag({content: '.o-demo-hero__inner,.o-demo-hero__caption {visibility:hidden !important}'});
      const plate = path.join(out, `${name}-hero-background.png`);
      await page.locator('.o-demo-hero').screenshot({path: plate});
      await foreground.evaluate(el => el.remove());
      for (const box of boxes) {
        const args = [path.join(root, 'scripts/scene_contrast.py'), plate, box.x, box.y, box.width, box.height, '--text', box.text, '--minimum', box.minimum].map(String);
        let result;
        try {result = execFileSync('python3', args, {encoding: 'utf8'}).trim();}
        catch (error) {result = String(error.stdout || error.message).trim(); view.contrast.push({...box, pass: false, result}); throw Error(result);}
        view.contrast.push({...box, pass: true, result}); console.log(`${name} ${box.selector}: ${result}`);
      }
      await page.locator('#o-brand-tiles').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => Array.from(document.querySelectorAll('.o-brand__logo')).every(img => img.complete && img.naturalWidth > 0 && img.dataset.logoArea));
      const logos = await page.locator('.o-brand__logo').evaluateAll(images => images.map(img => ({src: img.getAttribute('src'), area: Number(img.dataset.logoArea), aspect: Number(img.dataset.logoAspect), visible: !img.hidden && getComputedStyle(img).visibility === 'visible'})));
      check('logos fit equal-area safe boxes', logos.every(img => img.visible && img.area > 0 && img.area <= 1800.1), logos);
      await page.locator('#o-shelf').scrollIntoViewIfNeeded();
      const shelf = await page.locator('.o-shelf__spine').evaluateAll(books => books.map(book => {const r = book.getBoundingClientRect(); return {width: r.width, bottom: r.bottom, label: book.getAttribute('aria-label'), dark: book.dataset.surface === 'dark', href: book.getAttribute('href')};}));
      check('all spines share one baseline', new Set(shelf.map(book => book.bottom.toFixed(2))).size === 1);
      check('uniform spine widths', shelf.every(book => Math.abs(book.width - (mobile ? 28 : 34)) < .1));
      check('deepest five dark', shelf.filter(book => book.dark).length === 5);
      check('exact brand routes', shelf.every(book => book.href.startsWith('/shop?brand=')));
      check('accessible list mirrors shelf order', await page.evaluate(() => {
        const visible = [...document.querySelectorAll('.o-shelf__spine')].map(el => el.getAttribute('aria-label'));
        const mirror = [...document.querySelectorAll('#o-shelf-list li')].map(el => el.textContent);
        return JSON.stringify(visible) === JSON.stringify(mirror);
      }));
      await page.locator('.o-shelf__spine').first().focus();
      await page.waitForTimeout(240);
      check('keyboard lift and tooltip', await page.locator('.o-shelf__spine').first().evaluate(el => getComputedStyle(el).transform === 'matrix(1, 0, 0, 1, 0, -6)' && getComputedStyle(el.nextElementSibling).opacity === '1'));
      await page.locator('#o-shelf').screenshot({path: path.join(out, `${name}-shelf-focus.png`)});
      await page.locator('#o-brand-tiles').screenshot({path: path.join(out, `${name}-logos.png`)});
      const hits = await page.locator('.o-card__add,.o-card__wishlist').evaluateAll(buttons => buttons.map(el => {const r = el.getBoundingClientRect(); return [r.width, r.height];}));
      check('44px card hit areas', hits.every(([w, h]) => w >= 44 && h >= 44));
      check('ratings have no repeated source', await page.locator('.o-card__rating').evaluateAll(lines => lines.every(el => !el.textContent.includes('Olive'))));
      check('two-line card names', await page.locator('.o-card__name').evaluateAll(lines => lines.every(el => getComputedStyle(el).webkitLineClamp === '2')));
      check('price groups fit each card', await page.locator('.o-card__prices').evaluateAll(lines => lines.every(el => el.getBoundingClientRect().width <= el.closest('.o-card').getBoundingClientRect().width)));
      const toolbarStart = await page.locator('.o-demo-toolbar-context').evaluate(el => el.getBoundingClientRect().top + scrollY);
      for (const offset of [0, 16, 80, 160]) {
        await page.evaluate(y => scrollTo(0, y), toolbarStart + offset);
        await page.waitForTimeout(80);
        check(`toolbar never overlaps photos at +${offset}`, await page.evaluate(() => document.querySelector('.o-toolbar').getBoundingClientRect().bottom <= document.querySelector('.o-card__media').getBoundingClientRect().top));
      }
      await page.locator('.o-demo-products').screenshot({path: path.join(out, `${name}-products.png`)});
      check('no runtime errors', errors.length === 0, errors);
    } finally {await context.close();}
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'blocked-or-failed'; report.error = error.message; process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (fs.existsSync(out)) fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
