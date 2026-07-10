"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  // 로그인 상태 추적
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // 최초 세션 확인
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
    });
    // 로그인/로그아웃 등 상태 변화 실시간 반영
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLoggedIn(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-2 pl-2.5 pr-2.5 xs:pl-4 xs:pr-3.5 sm:h-16 sm:gap-4 sm:px-6">
        {/* 로고 + 상호명 */}
        <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Image
            src="/logo/brand-header.png"
            alt="모두의공공조달 로고"
            width={40}
            height={40}
            className="h-9 w-9 shrink-0 rounded-[9px] sm:h-10 sm:w-10"
            priority
          />
          <span className="flex flex-col justify-center pr-1 sm:pr-0">
            <span className="block whitespace-nowrap text-[17px] font-extrabold leading-tight tracking-[-0.01em] text-brand-dark xs:text-[18px] sm:text-[21px]">
              모두의공공조달
            </span>
            {/* 모바일: 자연스러운 폭 */}
            <span className="mt-[2px] block whitespace-nowrap text-[9px] font-semibold leading-tight tracking-[-0.01em] text-brand-gray xs:text-[10px] sm:hidden">
              정부지원사업 통합 매칭 플랫폼
            </span>
            {/* PC: 브랜드명 폭에 맞춰 글자 양끝정렬 */}
            <span
              className="mt-[3px] hidden w-full whitespace-nowrap text-[11px] font-semibold leading-tight text-brand-gray sm:block"
              style={{ textAlignLast: "justify" }}
            >
              정부지원사업 통합 매칭 플랫폼
            </span>
          </span>
        </Link>

        {/* 네비 + CTA */}
        <nav className="flex shrink-0 items-center gap-2.5 xs:gap-3.5 sm:gap-5">
          <Link
            href="/community"
            className="whitespace-nowrap text-[12.5px] font-semibold text-brand-dark transition-colors hover:text-brand-orange sm:text-sm"
          >
            후기
          </Link>
          {loggedIn ? (
            <>
              <Link
                href="/mypage"
                className="whitespace-nowrap text-[12.5px] font-semibold text-brand-dark transition-colors hover:text-brand-orange sm:text-sm"
              >
                마이페이지
              </Link>
              {/* 로그아웃은 PC에서만 노출(모바일은 마이페이지 안에서 로그아웃) */}
              <button
                type="button"
                onClick={handleLogout}
                className="hidden whitespace-nowrap text-[12.5px] font-semibold text-brand-gray transition-colors hover:text-brand-orange sm:inline sm:text-sm"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/signup"
              className="whitespace-nowrap text-[12.5px] font-semibold text-brand-dark transition-colors hover:text-brand-orange sm:text-sm"
            >
              로그인
            </Link>
          )}
          <Link
            href="/diagnosis"
            className="btn-brand whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-bold sm:px-5 sm:py-2 sm:text-sm"
          >
            무료 진단
          </Link>
        </nav>
      </div>
    </header>
  );
}
