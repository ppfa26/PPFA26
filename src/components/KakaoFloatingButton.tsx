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
      aria-label="카카오톡 1:1 상담하기"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full bg-[#FEE500] px-5 py-3.5 shadow-lg ring-1 ring-black/5 transition hover:brightness-95 hover:shadow-xl sm:bottom-7 sm:right-7"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-dark/10 text-lg">
        💬
      </span>
      <span className="whitespace-nowrap text-sm font-extrabold text-brand-dark">
        카톡 1:1 상담
      </span>
    </a>
  );
}
