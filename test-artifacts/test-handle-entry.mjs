import { chromium } from "file:///C:/Users/12515/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import assert from 'node:assert/strict';
const browser = await chromium.launch({channel:'msedge',headless:true});
try {
 for (const width of [1100,390]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/api/handle/**',r=>r.fulfill({json:{ok:true,data:{gameId:'test-hand',history:[],finish:false,ruleMode:'normal'}}}));
  await page.goto('http://127.0.0.1:5187');
  assert.equal(await page.locator('.mode-card').count(),3);
  assert.equal(await page.getByRole('button',{name:'进入猜手牌双人对战',exact:true}).count(),0);
  await page.getByRole('button',{name:'进入猜手牌',exact:true}).click();
  const entry=page.getByRole('button',{name:'双人对战',exact:true});
  await entry.waitFor(); await page.waitForTimeout(300);
  await page.screenshot({path:`test-artifacts/handle-entry-${width}.png`});
  const uid=new URL(page.url()).searchParams.get('userId');
  await entry.click(); await page.getByText('创建双人对战',{exact:true}).waitFor();
  assert.equal(new URL(page.url()).pathname,'/battle');
  assert.equal(new URL(page.url()).searchParams.get('userId'),uid);
  await page.screenshot({path:`test-artifacts/handle-lobby-${width}.png`});
  await page.goBack(); await entry.waitFor();
  assert.equal(new URL(page.url()).pathname,'/handle/test-hand');
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS: home cards, desktop/mobile entry, user identity, battle lobby and back navigation (mocked single-player API).');
} finally { await browser.close(); }
