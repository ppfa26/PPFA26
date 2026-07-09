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
        <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Image
            src="/logo/brand-header.png"
            alt="모두의공공조달 로고"
            width={40}
            height={40}
            className="h-8 w-8 shrink-0 rounded-[9px] xs:h-9 xs:w-9 sm:h-10 sm:w-10"
            priority
          />
          <span className="flex flex-col justify-center">
            <span className="text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-brand-dark xs:text-[18px] sm:text-[21px]">
              모두의공공조달
            </span>
            <span
              className="mt-[2px] block w-full break-keep text-[8.5px] font-semibold leading-tight text-brand-gray sm:text-[9.5px]"
              style={{ textAlignLast: "justify" }}
            >
              정부지원사업 통합 매칭 자문 플랫폼
            </span>
          </span>
        </Link>

        {/* 네비 + CTA */}
        <nav className="flex shrink-0 items-center gap-2 xs:gap-2.5 sm:gap-4">
          <Link
            href="/#pricing-section"
            className="whitespace-nowrap text-[13px] font-semibold text-brand-dark hover:text-brand-orange sm:text-sm"
          >
            서비스
          </Link>
          <Link
            href="/community"
            className="whitespace-nowrap text-[13px] font-semibold text-brand-dark hover:text-brand-orange sm:text-sm"
          >
            후기
          </Link>
          <Link
            href="/signup"
            className="whitespace-nowrap text-[13px] font-semibold text-brand-dark hover:text-brand-orange sm:text-sm"
          >
            로그인
          </Link>
          <Link
            href="/diagnosis"
            className="btn-brand whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] sm:px-5 sm:text-sm"
          >
            무료 진단
          </Link>
        </nav>
      </div>
    </header>
  );
}
