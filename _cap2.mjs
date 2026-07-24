import { chromium } from "playwright-core";

const EXE = process.env.HOME + "/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";
const profile = {
  region: "인천", businessType: "개인사업자", industries: ["제조업"],
  years: "3년 미만", employees: "5명 이상", revenue: "3억 미만",
  age: "만 39세 이하", purposes: ["운전자금[운영자금]", "시설자금[기계/공장]"],
  credit: "839점 이상", certifications: ["벤처인증"], currentInstitutions: [],
  innovation: ["해당 없음"], policyFundGood: "예", name: "신주엽",
};

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
await page.addInitScript((p) => {
  localStorage.setItem("mpp_diagnosis", JSON.stringify(p));
  localStorage.setItem("mpp_diagnosis_savedAt", String(Date.now()));
  sessionStorage.setItem("mpp_result_seen", "1");
}, profile);

await page.goto("http://localhost:3000/matching-preview?admin=1", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(4000);

// 📢 공고 아코디언 헤더를 정확히 찾아 스크롤 후 클릭
const target = page.locator("button:has-text('열려있는 관련 정부지원사업')").first();
if (await target.count()) {
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await target.click({ force: true });
  await page.waitForTimeout(2500); // API fetch 대기
  const box = await target.boundingBox();
  if (box) {
    // 아코디언 헤더부터 아래 1400px 영역 캡처
    await page.screenshot({
      path: "_ann.png",
      clip: { x: 0, y: box.y - 10, width: 390, height: Math.min(1500, 844 * 3) },
    });
    console.log("CAPTURED _ann.png at y=" + box.y);
  }
} else {
  console.log("NOT FOUND announcement button");
}

await browser.close();
