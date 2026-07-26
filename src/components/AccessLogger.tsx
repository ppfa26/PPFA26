"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logAccess } from "@/lib/deviceGuard";

/**
 * 접속(IP) 로거 - 대표님 요청(A안)
 *
 *  왜 필요한가?
 *   - 예전엔 결과 화면(/matching-preview)에서, 그것도 '로그인한 사람'만 IP가
 *     기록됐다. → 회원가입도 진단도 안 하고 그냥 둘러보다 나가는 '염탐꾼'은
 *     관리자 화면에 아무 흔적도 안 남았다.
 *   - 이 컴포넌트는 루트 레이아웃에 심겨 '모든 페이지'에서 돌기 때문에,
 *     회원/비회원 가리지 않고 방문자가 페이지를 열 때마다 IP를 기록한다.
 *     → 관리자 '최근 접속 로그 / IP별 집계'에서 자주 오는 IP를 눈으로 보고,
 *       의심되면 직접 IP 차단하면 된다. (비회원은 이메일 칸에 "-" 로 표시)
 *
 *  주의(스팸 방지):
 *   - 관리자 페이지(/admin)는 대표님 본인이라 기록 제외.
 *   - 정적 리소스/내부 경로(_next, favicon 등)는 제외.
 *   - 같은 경로를 짧은 시간 안에 중복 기록하지 않도록 방금 찍은 경로는 건너뛴다.
 *
 *  화면에 아무것도 그리지 않는 유틸 컴포넌트입니다.
 *  (logAccess 는 실패해도 조용히 무시하므로 사용자 경험엔 영향 없음)
 */
export default function AccessLogger() {
  const pathname = usePathname();
  const lastLogged = useRef<string>("");

  useEffect(() => {
    if (!pathname) return;
    // 관리자 본인/내부 경로는 로그를 남기지 않는다.
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname === "/favicon.ico"
    ) {
      return;
    }
    // 같은 경로 연속 중복 기록 방지
    if (lastLogged.current === pathname) return;
    lastLogged.current = pathname;

    // 접속 기록(회원/비회원 공통). 실패는 내부에서 조용히 무시된다.
    logAccess(pathname).catch(() => {
      /* noop */
    });
  }, [pathname]);

  return null;
}
