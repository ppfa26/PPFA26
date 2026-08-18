"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { logAccess } from "@/lib/deviceGuard";

/**
 * 접속(IP) 로거 + IP 차단 실행 (대표님 요청)
 *
 *  ① 접속 기록(A안)
 *   - 루트 레이아웃에 심겨 '모든 페이지'에서 돌기 때문에, 회원/비회원 가리지 않고
 *     방문자가 페이지를 열 때마다 IP를 기록한다.
 *   - 관리자 '최근 접속 로그 / IP별 집계'에서 자주 오는 IP를 눈으로 보고,
 *     의심되면 직접 IP 차단하면 된다. (비회원은 이메일 칸에 "-" 로 표시)
 *
 *  ② IP 차단 실행(A안 - 클라이언트 차단)
 *   - 관리자 페이지에서 IP/이메일을 차단하면 log_access RPC 가 blocked=true 를
 *     내려준다. 이 신호를 받으면 화면 전체를 차단 안내로 덮어 서비스 이용을 막는다.
 *   - 서버(엣지) 차단이 아니라 브라우저 차단이므로, 기술적으로 우회는 가능하나
 *     일반 어뷰저(무료진단 반복·스팸 접속)는 충분히 막힌다. 지금 규모(오픈 베타)에
 *     적합하고, 매 요청마다 DB를 조회하는 서버 미들웨어의 속도/비용 부담이 없다.
 *
 *  주의(스팸 방지):
 *   - 관리자 페이지(/admin)는 대표님 본인이라 기록/차단 대상에서 제외.
 *   - 정적 리소스/내부 경로(_next, favicon 등)는 제외.
 *   - 같은 경로를 짧은 시간 안에 중복 기록하지 않도록 방금 찍은 경로는 건너뛴다.
 */
export default function AccessLogger() {
  const pathname = usePathname();
  const lastLogged = useRef<string>("");
  // 차단 여부 - true 가 되면 화면 전체를 차단 안내로 덮는다.
  const [blocked, setBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    // 관리자 본인/내부 경로는 로그를 남기지 않는다.(대표님 차단 방지)
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

    // 접속 기록(회원/비회원 공통) + 차단 여부 확인.
    logAccess(pathname)
      .then((res) => {
        if (res?.blocked) {
          setBlocked(true);
          setBlockReason(res.reason ?? null);
        }
      })
      .catch(() => {
        /* noop - 실패는 조용히 무시(정상 고객을 막지 않기 위해) */
      });
  }, [pathname]);

  // 차단된 IP - 화면 전체를 덮는 안내(서비스 이용 불가)
  if (blocked) {
    return (
      <div
        id="access-blocked-overlay"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-brand-dark px-6"
        role="alertdialog"
        aria-label="접속이 제한되었습니다"
      >
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-card">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-red/15 text-3xl">
            🚫
          </div>
          <h1 className="break-keep text-xl font-black text-white sm:text-2xl">
            접속이 제한되었습니다
          </h1>
          <p className="mx-auto mt-3 max-w-sm break-keep text-sm leading-relaxed text-gray-300">
            비정상적인 이용이 감지되어 현재 접속이 제한된 상태입니다.
            {blockReason ? (
              <>
                <br />
                <span className="text-gray-400">사유: {blockReason}</span>
              </>
            ) : null}
          </p>
          <p className="mx-auto mt-5 max-w-sm break-keep text-[13px] leading-relaxed text-gray-400">
            착오로 제한되었다고 판단되시면 아래로 문의해 주세요.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2.5">
            <a
              href="http://pf.kakao.com/_VxfWxan/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-red w-full rounded-full px-8 py-3 text-sm font-bold"
            >
              💬 1:1 카카오톡 문의
            </a>
            <a
              href="tel:1551-7886"
              className="w-full rounded-full border border-white/25 bg-transparent px-8 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              📞 1551-7886
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 평소엔 화면에 아무것도 그리지 않는 유틸 컴포넌트.
  return null;
}
