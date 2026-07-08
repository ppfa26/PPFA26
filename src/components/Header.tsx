"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-5">
        {/* 로고 + 상호명 */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo/brand-header.png"
            alt="모두의공공조달 로고"
            width={40}
            height={40}
            className="h-9 w-9 shrink-0 rounded-[9px] sm:h-10 sm:w-10"
            priority
          />
          <span className="flex flex-col justify-center">
            <span className="text-[19px] font-extrabold leading-tight tracking-[-0.005em] text-brand-dark sm:text-[21px]">
              모두의공공조달
            </span>
            <span className="mt-[2px] block w-full break-keep text-[9px] font-semibold leading-tight text-brand-gray sm:text-[10px]">
              정부지원사업 통합 매칭 자문 플랫폼
            </span>
          </span>
        </Link>

        {/* 네비 + CTA */}
        <nav className="flex shrink-0 items-center gap-1.5 sm:gap-4">
          <Link
            href="/#pricing-section"
            className="hidden text-sm font-semibold text-brand-dark hover:text-brand-orange lg:block"
          >
            서비스
          </Link>
          <Link
            href="/pricing"
            className="hidden text-sm font-semibold text-brand-dark hover:text-brand-orange sm:block"
          >
            요금
          </Link>
          <Link
            href="/community"
            className="hidden text-sm font-semibold text-brand-dark hover:text-brand-orange sm:block"
          >
            후기
          </Link>
          <Link
            href="/signup"
            className="hidden text-sm font-semibold text-brand-dark hover:text-brand-orange sm:block"
          >
            로그인
          </Link>
          <Link
            href="/diagnosis"
            className="btn-brand whitespace-nowrap rounded-full px-3 py-2 text-xs sm:px-5 sm:text-sm"
          >
            무료 진단
          </Link>
        </nav>
      </div>
    </header>
  );
}
