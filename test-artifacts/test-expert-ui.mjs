import { chromium } from "file:///C:/Users/12515/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto("http://127.0.0.1:5185/nonogram");
  await page.getByRole("button", { name: "极难", exact: true }).click();
  await page.getByRole("button", { name: "生成随机题目", exact: true }).click();
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).difficulty === "expert", { timeout: 15000 });
  const before = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert.equal(before.size, 10);
  await page.getByRole("button", { name: "红色", exact: true }).click();
  await page.locator('.nonogram-cell[data-row="0"][data-column="0"]').click();
  await page.reload();
  await page.waitForFunction(() => window.render_game_to_text && JSON.parse(window.render_game_to_text()).difficulty === "expert");
  const after = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert.deepEqual(after.rowClues, before.rowClues);
  assert.equal(after.board[0][0], "#");
  assert.equal(after.colors[0][0], "r");
  // Force a generator rejection in this isolated test page: the old puzzle and
  // colored moves must survive, and the generation control must become usable.
  await page.evaluate(() => {
    window.Worker = class {
      postMessage() { setTimeout(() => this.onmessage({ data: { error: "未找到符合极难标准的题目，请重新生成。" } }), 0); }
      terminate() {}
    };
  });
  await page.getByRole("button", { name: "生成随机题目", exact: true }).click();
  await page.getByText("未找到符合极难标准的题目，请重新生成。", { exact: true }).waitFor();
  const retained = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  assert.deepEqual(retained.board, after.board);
  assert.deepEqual(retained.rowClues, after.rowClues);
  assert.equal(await page.getByRole("button", { name: "生成随机题目", exact: true }).isEnabled(), true);
  await page.reload();
  await page.waitForFunction(() => window.render_game_to_text);
  await page.screenshot({ path: "test-artifacts/expert-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const button = page.getByRole("button", { name: "极难", exact: true });
  assert.equal(await button.isVisible(), true);
  await page.getByRole("button", { name: "普通", exact: true }).click();
  await button.click();
  await page.screenshot({ path: "test-artifacts/expert-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "双人对战", exact: true }).click();
  await page.getByRole("button", { name: "极难", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "极难", exact: true }).getAttribute("class"), "active");
  assert.deepEqual(errors, []);
  console.log("Desktop/mobile expert selection, worker generation, color save restore and battle selection passed.");
} finally {
  await browser.close();
}
