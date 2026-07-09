"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-2 pl-4 pr-3.5 sm:h-16 sm:gap-4 sm:px-6">
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
          <span className="flex flex-col justify-center pr-3 sm:pr-0">
            <span className="whitespace-nowrap text-[17px] font-extrabold leading-tight tracking-[-0.01em] text-brand-dark xs:text-[18px] sm:text-[21px]">
              모두의공공조달
            </span>
            <span className="mt-[2px] whitespace-nowrap text-[9px] font-semibold leading-tight tracking-[-0.01em] text-brand-gray xs:text-[10px] sm:text-[9.5px] sm:tracking-normal">
              정부지원사업 통합 매칭 자문 플랫폼
            </span>
          </span>
        </Link>

        {/* 네비 + CTA */}
        <nav className="flex shrink-0 items-center gap-3.5 xs:gap-4 sm:gap-6">
          <Link
            href="/community"
            className="whitespace-nowrap text-[12.5px] font-semibold text-brand-dark transition-colors hover:text-brand-orange sm:text-sm"
          >
            후기
          </Link>
          <Link
            href="/signup"
            className="whitespace-nowrap text-[12.5px] font-semibold text-brand-dark transition-colors hover:text-brand-orange sm:text-sm"
          >
            로그인
          </Link>
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
