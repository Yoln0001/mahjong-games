import { chromium } from "file:///C:/Users/12515/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = "http://127.0.0.1:5186";
const errors = [];
async function connect(page) {
  page.on("pageerror", error => errors.push(String(error)));
  await page.route("**/api/nonogram-*/**", proxy);
  await page.route("**/api/nonogram-share", proxy);
  async function proxy(route) {
    const target = new URL(route.request().url());
    const response = await route.fetch({ url: "http://127.0.0.1:8105" + target.pathname + target.search });
    await route.fulfill({ response });
  }
}
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
try {
  const ownerContext = await browser.newContext({ viewport: { width: 1100, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const owner = await ownerContext.newPage();
  await connect(owner);
  await owner.goto(base + "/nonogram");
  const original = await state(owner);
  assert.equal(await owner.locator(".nonogram-heading").getByRole("button", { name: "分享题目" }).count(), 1);
  assert.equal(await owner.locator(".nonogram-toolbar").getByRole("button", { name: "分享题目" }).count(), 0);
  await owner.locator('.nonogram-cell[data-row="0"][data-column="0"]').click();
  await owner.getByRole("button", { name: "分享题目", exact: true }).click();
  await owner.getByText("分享链接已复制").waitFor();
  const link = await owner.evaluate(() => navigator.clipboard.readText());
  assert.match(link, /^http:\/\/127\.0\.0\.1:5186\/nonogram\/share\/[0-9a-f]{20}$/);

  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const guest = await guestContext.newPage();
  await connect(guest);
  await guest.goto(link);
  await guest.waitForFunction(() => window.render_game_to_text);
  assert.equal(await guest.locator(".nonogram-heading").getByRole("button", { name: "分享题目" }).count(), 1);
  const received = await state(guest);
  assert.equal(received.size, original.size);
  assert.equal(received.difficulty, original.difficulty);
  assert.deepEqual(received.rowClues, original.rowClues);
  assert.deepEqual(received.columnClues, original.columnClues);
  assert.ok(received.board.every(row => !row.includes("#") && !row.includes("x")), "recipient starts blank");
  await guest.getByRole("button", { name: "绿色", exact: true }).tap();
  await guest.locator('.nonogram-cell[data-row="0"][data-column="0"]').tap();
  await guest.reload();
  await guest.waitForFunction(() => window.render_game_to_text);
  assert.equal((await state(guest)).colors[0][0], "green");
  await guest.screenshot({ path: "test-artifacts/nonogram-share-mobile.png", fullPage: true });

  await owner.goto(base + "/nonogram/daily");
  await owner.waitForFunction(() => window.render_game_to_text);
  assert.equal(await owner.locator(".nonogram-heading").getByRole("button", { name: "分享题目" }).count(), 1);
  await owner.getByRole("button", { name: "分享题目", exact: true }).click();
  await owner.getByText("分享链接已复制").waitFor();
  assert.match(await owner.evaluate(() => navigator.clipboard.readText()), /\/nonogram\/share\/[0-9a-f]{20}$/);
  await owner.goto(base + "/nonogram/share/aaaaaaaaaaaaaaaaaaaa");
  await owner.getByRole("alert").filter({ hasText: "分享题目不存在" }).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS: random/daily sharing, stable shared puzzle, blank independent progress, reload, mobile touch and missing link.");
} finally { await browser.close(); }
