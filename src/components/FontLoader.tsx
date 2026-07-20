"use client";

// ─────────────────────────────────────────────────────────────
//  FontLoader — Pretendard 폰트 CSS 를 '렌더 블로킹 없이' 비동기 로딩
//  ---------------------------------------------------------------
//  기법: media="print" 로 먼저 받아오면 브라우저가 화면 렌더를 막지 않는다.
//        로드가 끝나는 순간(onLoad) media 를 "all" 로 바꿔 실제 화면에 적용한다.
//        (구글이 권장하는 표준 async-CSS 패턴)
//  · 서버 컴포넌트가 아닌 클라이언트 컴포넌트라 함수형 onLoad 가 정상 작동한다.
//  · 폰트 도착 전에는 globals.css 의 system-ui 스택으로 즉시 렌더된다.
// ─────────────────────────────────────────────────────────────

const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css";

export default function FontLoader() {
  return (
    <link
      rel="stylesheet"
      href={PRETENDARD_CSS}
      media="print"
      onLoad={(e) => {
        (e.currentTarget as HTMLLinkElement).media = "all";
      }}
    />
  );
}
