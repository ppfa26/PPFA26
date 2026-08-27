"use client";

import { useState, type ReactNode } from "react";

/**
 * 진단 결과 리포트용 아코디언 카드.
 * 제목 줄을 누르면 내용이 접혔다/펼쳐졌다 합니다. (대표님 요청: 결과 리포트가 세로로 너무 길어서 접기)
 *
 * - 기존 결과 박스의 겉모양(둥근 테두리 + 흰 배경 + 그림자)을 그대로 유지합니다.
 * - title 영역은 큰 볼드 제목, subtitle은 그 아래 작은 설명(선택).
 * - defaultOpen 으로 처음 열림/닫힘 상태를 지정합니다.
 */
export default function AccordionCard({
  emoji,
  title,
  subtitle,
  peek,
  defaultOpen = false,
  children,
}: {
  emoji?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** 접힌 상태에서도 보이는 '미리보기 한 줄' (예: "청년창업사관학교 외 4건"). 펼치면 사라짐 */
  peek?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    // 세련화(무료진단 톤 통일): 더 둥근 모서리(3xl) + 얇고 은은한 테두리 + 부드러운 그림자.
    <div className="overflow-hidden rounded-3xl border border-brand-dark/10 bg-white shadow-card transition-shadow duration-200">
      {/* 헤더 (토글 버튼) - 무료진단 옵션처럼 부드러운 눌림감(active:scale) + 차분한 트랜지션 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition duration-150 hover:bg-brand-orange/5 active:scale-[0.99]"
      >
        <span className="min-w-0 flex-1">
          {/* 제목 - 16px, 아이콘·글자 세로 중앙 정렬로 깔끔하게 */}
          <span className="flex items-center gap-2 text-[16px] font-extrabold leading-snug text-brand-dark">
            {emoji && <span className="shrink-0">{emoji}</span>}
            <span className="min-w-0 break-keep">{title}</span>
          </span>
          {/* 부제 + 미리보기 - 한 줄에 나란히 (대표님 요청: 미리보기를 설명 '옆으로').
              부제 오른쪽에 '✓ 초기창업패키지 외 3건'처럼 인라인 배치. 좁은 화면에선 자연스럽게 다음 줄로 줄바꿈.
              미리보기는 접힌 상태에서만 노출(펼치면 실제 내용이 나오므로 중복 방지). */}
          {(subtitle || (peek && !open)) && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {/* 미리보기(✓)를 '앞'에, 부제를 '뒤'에 (대표님 요청: 앞뒤 순서 교체). 접힌 상태에서만 미리보기 노출 */}
              {peek && !open && (
                <span className="inline-flex items-center gap-1 break-keep text-[12px] font-semibold leading-relaxed text-brand-orange">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  <span className="min-w-0">{peek}</span>
                </span>
              )}
              {subtitle && (
                <span className="break-keep text-[12px] leading-relaxed text-brand-dark/50">
                  {peek && !open && <span className="mr-1 text-brand-dark/30" aria-hidden>·</span>}
                  {subtitle}
                </span>
              )}
            </span>
          )}
        </span>
        {/* 닫혀 있을 때만 '클릭 👆' 라벨 노출 (대표님 요청: 결과창 닫힌 아코디언 화살표 옆에 귀엽게). 펼치면 사라짐 */}
        {!open && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-orange/10 px-2 py-0.5 text-[11px] font-bold text-brand-orange animate-pulse">
            클릭 👆
          </span>
        )}
        {/* 펼침/접힘 화살표 - 무료진단 톤: 부드러운 회전 트랜지션 */}
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange transition-transform duration-300 ease-out ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* 내용 - PC·모바일 동일 좌우 여백 */}
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
}
