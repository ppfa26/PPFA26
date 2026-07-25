"use client";

import { useEffect } from "react";

// 페이지 내 `.reveal` 요소를 스크롤 시 은은하게 등장시키는 컨트롤러.
// IntersectionObserver 기반이라 가볍고, 한 번 보이면 다시 숨기지 않는다.
export default function ScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (els.length === 0) return;

    const showAll = () => els.forEach((el) => el.classList.add("is-visible"));

    // 모션 최소화 선호 시, 또는 IntersectionObserver 미지원 시 즉시 표시
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      showAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      // threshold 0: 요소가 조금이라도 뷰포트에 걸치면 바로 표시.
      // (모바일에서 화면보다 세로로 긴 섹션이 12% 조건을 못 채워
      //  영영 opacity:0 으로 사라지던 버그 방지)
      { threshold: 0, rootMargin: "0px 0px -5% 0px" }
    );

    els.forEach((el) => observer.observe(el));

    // 안전장치: 혹시 관찰이 어떤 이유로든 동작하지 않아도
    // 1.2초 뒤에는 모든 요소를 반드시 보이게 한다(화면이 비는 것 방지).
    const failSafe = window.setTimeout(showAll, 1200);

    return () => {
      observer.disconnect();
      window.clearTimeout(failSafe);
    };
  }, []);

  return null;
}
