"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  /** 최종 도달할 목표 숫자 */
  end: number;
  /** 애니메이션 길이(ms) */
  duration?: number;
  /** 숫자 앞에 붙는 문자열 (예: "₩") */
  prefix?: string;
  /** 숫자 뒤에 붙는 문자열 (예: "개+", "명") */
  suffix?: string;
  className?: string;
};

// 화면에 보이면 0 → end 까지 부드럽게 올라가는 숫자 카운터.
// - IntersectionObserver 기반이라 가볍고, 한 번 실행되면 다시 실행하지 않는다.
// - prefers-reduced-motion 또는 IO 미지원 시 즉시 목표값을 표시(숫자가 비는 사고 방지).
export default function CountUp({
  end,
  duration = 1400,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const ref = useRef<HTMLElement>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const runAnimation = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      const startTime = performance.now();
      // easeOutCubic: 처음엔 빠르게, 끝에서 부드럽게 감속
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        setValue(Math.round(easeOut(progress) * end));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    // 모션 최소화 선호 / IO 미지원 → 즉시 목표값 표시
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      startedRef.current = true;
      setValue(end);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            runAnimation();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -5% 0px" }
    );
    observer.observe(el);

    // 안전장치: 1.5초 뒤에도 시작 안 됐으면 강제로 목표값 표시
    const failSafe = window.setTimeout(() => {
      if (!startedRef.current) {
        startedRef.current = true;
        setValue(end);
      }
    }, 1500);

    return () => {
      observer.disconnect();
      window.clearTimeout(failSafe);
    };
  }, [end, duration]);

  return (
    <b ref={ref} className={className}>
      {prefix}
      {value.toLocaleString("ko-KR")}
      {suffix}
    </b>
  );
}
