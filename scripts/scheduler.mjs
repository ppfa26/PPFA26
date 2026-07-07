// ============================================================
// 크롤링 스케줄러 - 매일 새벽 03:00 자동 실행
// 실행: node scripts/scheduler.mjs (PM2로 상시 구동)
// ============================================================
import cron from "node-cron";
import { spawn } from "node:child_process";
import path from "node:path";

function runCrawler() {
  console.log("[스케줄러] 크롤링 시작:", new Date().toLocaleString("ko-KR"));
  const child = spawn("node", [path.resolve(process.cwd(), "scripts/crawler.mjs")], {
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    console.log(`[스케줄러] 크롤링 종료 (code=${code})`);
  });
}

// 매일 새벽 3시 (한국 시간 기준 서버 TZ 설정 필요)
cron.schedule("0 3 * * *", runCrawler, { timezone: "Asia/Seoul" });

console.log("[스케줄러] 시작됨 — 매일 새벽 03:00(KST) 크롤링 예약");
// 시작 시 1회 즉시 실행 여부 (환경변수로 제어)
if (process.env.CRAWL_ON_START === "1") runCrawler();
