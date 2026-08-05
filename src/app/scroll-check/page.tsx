"use client";

// ─────────────────────────────────────────────────────────────
//  임시 진단 페이지 (/scroll-check)
//  목적: 실제 대표님 폰(삼성인터넷/사파리)에서 "스크롤이 어디서 막히는지"를
//        기기 내부 값으로 직접 확인한다. headless 도구로는 재현이 안 되기 때문.
//  사용법: 폰으로 /scroll-check 접속 → 맨 아래까지 스크롤 → 표시되는 값 캡처해서 알려주기.
//  (문제 해결 후 이 페이지는 삭제 예정)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

export default function ScrollCheckPage() {
  const [info, setInfo] = useState<Record<string, unknown>>({});
  const [maxScrollReached, setMaxScrollReached] = useState(0);

  useEffect(() => {
    const update = () => {
      const de = document.documentElement;
      const vv = (window as unknown as { visualViewport?: VisualViewport }).visualViewport;
      const y = Math.round(window.scrollY);
      setMaxScrollReached((prev) => (y > prev ? y : prev));
      setInfo({
        "화면폭 screen.width": window.screen?.width,
        "innerWidth": window.innerWidth,
        "clientWidth": de.clientWidth,
        "화면높이 screen.height": window.screen?.height,
        "innerHeight": window.innerHeight,
        "visualViewport.height": vv ? Math.round(vv.height) : "없음",
        "visualViewport.scale": vv ? vv.scale : "없음",
        "문서 전체높이 scrollHeight": de.scrollHeight,
        "이론상 최대 스크롤(scrollHeight-innerHeight)": de.scrollHeight - window.innerHeight,
        "현재 scrollY": y,
        "viewport meta": document.querySelector('meta[name=viewport]')?.getAttribute("content"),
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const iv = setInterval(update, 400);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      clearInterval(iv);
    };
  }, []);

  return (
    <main style={{ background: "#0b1020", color: "#fff", minHeight: "300vh", padding: "16px", fontFamily: "monospace" }}>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: "rgba(0,0,0,0.9)",
          padding: "12px",
          fontSize: "12px",
          lineHeight: 1.7,
          zIndex: 99999,
          borderBottom: "2px solid #ff6a00",
        }}
      >
        <div style={{ color: "#ff6a00", fontWeight: 900, marginBottom: 6 }}>
          📱 스크롤 진단 (이 화면 캡처해서 보내주세요)
        </div>
        <div style={{ color: "#ffd400", fontWeight: 900 }}>
          🔽 도달한 최대 scrollY: {maxScrollReached}px
        </div>
        {Object.entries(info).map(([k, v]) => (
          <div key={k}>
            {k}: <span style={{ color: "#7fffd4" }}>{String(v)}</span>
          </div>
        ))}
      </div>

      {/* 스크롤 테스트용 긴 콘텐츠: 200px마다 눈금 표시 */}
      <div style={{ height: "260px" }} />
      {Array.from({ length: 15 }).map((_, i) => (
        <section
          key={i}
          style={{
            height: "200px",
            margin: "0 0 8px",
            background: i % 2 ? "#152040" : "#1e2b52",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            fontWeight: 900,
            border: "1px dashed #4060a0",
          }}
        >
          블록 {i + 1} (약 {i * 200 + 260}px 지점)
        </section>
      ))}
      <section
        style={{
          height: "160px",
          background: "#ff6a00",
          color: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
          fontWeight: 900,
        }}
      >
        ⬇️ 여기가 맨 끝입니다 (여기까지 보이면 정상) ⬇️
      </section>
    </main>
  );
}
