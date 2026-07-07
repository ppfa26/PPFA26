"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-5">
        {/* 로고 + 상호명 */}
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Image
            src="/logo/app-icon-white.png"
            alt="모두의공공조달 로고"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-lg"
            priority
          />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-[15px] font-extrabold text-brand-dark sm:text-base">
              모두의공공조달
            </span>
            <span className="hidden truncate text-[10px] text-brand-gray sm:block">
              Public Procurement For All
            </span>
          </span>
        </Link>

        {/* 네비 + CTA */}
        <nav className="flex shrink-0 items-center gap-1.5 sm:gap-4">
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
