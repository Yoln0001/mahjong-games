import { generatePuzzle } from "./generator";
import type { NonogramDifficulty } from "./types";

self.onmessage = (event: MessageEvent<{ size: number; difficulty: NonogramDifficulty }>) => {
  try {
    self.postMessage({ puzzle: generatePuzzle(event.data.size, event.data.difficulty) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "生成失败，请重试。" });
  }
};
