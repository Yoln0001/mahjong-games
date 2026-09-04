// Run the unmodified skill action loop using this machine's bundled Playwright
// and installed Edge, since the default package/browser are not installed.
import { readFile } from "node:fs/promises";
const modulePath = "file:///C:/Users/12515/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const source = (await readFile("C:/Users/12515/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js", "utf8"))
  .replace('from "playwright"', 'from "' + modulePath + '"')
  .replace("chromium.launch({", 'chromium.launch({ channel: "msedge",');
await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
