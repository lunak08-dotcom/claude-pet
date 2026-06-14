// Claude Code 훅이 호출하는 상태 기록기.
// 사용법:  node write-status.js <state>
//   state: idle | thinking | working | waiting | resting | sleeping
const fs = require("fs");
const os = require("os");
const path = require("path");

const dir = path.join(os.homedir(), ".claude");
try {
  fs.mkdirSync(dir, { recursive: true });
} catch {}

const state = (process.argv[2] || "idle").trim();
const payload = JSON.stringify({ state, ts: Date.now() });

try {
  fs.writeFileSync(path.join(dir, "pet-status.json"), payload);
} catch (e) {
  // 훅이 수업/작업을 막지 않도록 조용히 실패
}
