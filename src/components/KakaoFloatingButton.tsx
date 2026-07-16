"use client";

/**
 * 화면 오른쪽 하단에 고정되는 카카오톡 1:1 상담 플로팅 버튼.
 * (대표님 요청: 첫 페이지 오른쪽 하단에 카카오톡 채널 버튼 → 1:1 상담 링크)
 * - 스크롤해도 항상 같은 자리에 떠 있음 (position: fixed)
 * - 링크: 카카오톡 채널 1:1 채팅
 */
export default function KakaoFloatingButton() {
  return (
    <a
      id="kakao-floating-consult"
      href="http://pf.kakao.com/_VxfWxan/chat"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="1:1 채널톡 상담하기"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-1.5 rounded-full border border-brand-dark/15 bg-white px-3.5 py-2.5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition hover:bg-white/90 hover:shadow-xl sm:bottom-7 sm:right-7"
    >
      <span className="whitespace-nowrap text-[13px] font-extrabold text-brand-dark">
        💬 1:1 채널톡 상담하기
      </span>
    </a>
  );
}
