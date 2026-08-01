"use client";

import Link from "next/link";
import Image from "next/image";
import Editable from "./Editable";

/* 공식 채널 - 유입 주력(스레드·인스타·당근)을 앞쪽에.
   라벨 없는 원형 아이콘으로 압축해 깔끔하게, hover 시 브랜드 컬러 + 툴팁(title). */
const CHANNELS = [
  { href: "https://www.threads.com/@ppfa25", label: "스레드", icon: "fa-brands fa-threads", hover: "hover:border-white/60 hover:bg-white/10 hover:text-white" },
  { href: "https://www.instagram.com/ppfa25", label: "인스타그램", icon: "fa-brands fa-instagram", hover: "hover:border-[#E1306C]/70 hover:bg-[#E1306C]/15 hover:text-[#E1306C]" },
  { href: "https://www.daangn.com/kr/local-profile/8j96yjujtkqy/?referrer=share", label: "당근", emoji: "🥕", hover: "hover:border-[#FF8A3D]/70 hover:bg-[#FF8A3D]/15 hover:text-[#FF8A3D]" },
  { href: "https://pf.kakao.com/_VxfWxan/chat", label: "카카오톡 상담", emoji: "💬", hover: "hover:border-[#FEE500]/70 hover:bg-[#FEE500]/15 hover:text-[#FEE500]" },
  { href: "https://blog.naver.com/biospartners", label: "네이버 블로그", icon: "fa-solid fa-blog", hover: "hover:border-[#03C75A]/70 hover:bg-[#03C75A]/15 hover:text-[#03C75A]" },
  { href: "https://map.naver.com/p/entry/place/1118269039", label: "네이버 지도", icon: "fa-solid fa-location-dot", hover: "hover:border-[#03C75A]/70 hover:bg-[#03C75A]/15 hover:text-[#03C75A]" },
  { href: "https://pf.kakao.com/_VxfWxan", label: "카카오톡 채널", emoji: "📢", hover: "hover:border-[#FEE500]/70 hover:bg-[#FEE500]/15 hover:text-[#FEE500]" },
  { href: "https://link.inpock.co.kr/ppfa25", label: "전체 링크·후기", icon: "fa-solid fa-link", hover: "hover:border-brand-orange/70 hover:bg-brand-orange/15 hover:text-brand-orange" },
];

const MENU = [
  { href: "/pricing", label: "요금 안내" },
  { href: "/diagnosis-chat", label: "무료 진단" },
  { href: "/community", label: "커뮤니티" },
  { href: "/sites", label: "공식 사이트 모음" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/refund", label: "환불정책" },
  { href: "/business-info", label: "사업자정보" },
];

export default function Footer({ topGap = "mt-8" }: { topGap?: string } = {}) {
  return (
    <footer className={`${topGap} border-t border-white/10 bg-brand-dark text-gray-300`}>
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-8">
        {/* ── 상단: 브랜드(좌) + 공식 채널(우) ───────────────────────── */}
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          {/* 브랜드 */}
          <div className="max-w-md">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo/brand-footer-dark.png"
                alt="모두의사업친구"
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-lg"
              />
              <span className="text-lg font-extrabold leading-none text-white">
                모두의사업친구
              </span>
            </div>
            <Editable
              id="footer-tagline"
              as="p"
              className="mt-4 break-keep text-sm leading-relaxed text-gray-400"
            >
              내 사업장에 알맞은 정부지원사업을 찾는 가장 빠른 방법
            </Editable>
          </div>

          {/* 공식 채널 - 원형 아이콘 바 */}
          <div className="sm:text-right">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 sm:text-right">
              공식 채널
            </p>
            <ul className="flex flex-wrap gap-2.5 sm:justify-end">
              {CHANNELS.map((c) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={c.label}
                    aria-label={c.label}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-300 transition ${c.hover}`}
                  >
                    <span className="text-[18px] leading-none" aria-hidden="true">
                      {c.icon ? <i className={c.icon} /> : c.emoji}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── 중단: 메뉴 네비 (가운뎃점 한 줄) + 면책 고지 ─────────────
            브랜드/채널과 같은 '위 블록'으로 묶어 구분선 없이 이어붙인다
            (세로 2칸: 위 블록 / 아래 사업자정보). */}
        <nav className="mt-8">
          <ul className="flex flex-wrap items-center gap-x-1 gap-y-2 text-[13.5px] text-gray-400">
            {MENU.map((m, i) => (
              <li key={m.href} className="flex items-center">
                {i > 0 && <span className="mx-2 text-white/15" aria-hidden="true">·</span>}
                <Link href={m.href} className="transition hover:text-white">
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 면책 고지 - 컴팩트 */}
        <Editable
          id="footer-nowarranty"
          as="p"
          className="mt-4 break-keep text-xs leading-relaxed text-gray-500"
        >
          ⚠️ 본 서비스는 안내·추천·매칭하는 AI 통합 매칭 서비스이며, 정부지원사업 승인을 보장하지 않습니다.
        </Editable>

        {/* ── 하단: 사업자 정보 + 저작권 ───────────────────────────── */}
        <div className="mt-8 break-keep border-t border-white/10 pt-6 text-[11px] leading-relaxed text-gray-500">
          {/* 모바일: 항목별 줄바꿈 */}
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 sm:hidden">
            <dt className="shrink-0 text-gray-400">상호명</dt>
            <dd className="text-gray-500">모두의사업친구</dd>
            <dt className="shrink-0 text-gray-400">대표자</dt>
            <dd className="text-gray-500">신주엽</dd>
            <dt className="shrink-0 text-gray-400">주소</dt>
            <dd className="text-gray-500">인천광역시 서해구 청라커낼로288번길 26, 285호</dd>
            <dt className="shrink-0 text-gray-400">사업자등록번호</dt>
            <dd className="text-gray-500">597-12-02897</dd>
            <dt className="shrink-0 text-gray-400">통신판매업신고</dt>
            <dd className="text-gray-500">제2026-인천서해-0109호</dd>
            <dt className="shrink-0 text-gray-400">대표번호</dt>
            <dd className="text-gray-500">1551-7886</dd>
            <dt className="shrink-0 text-gray-400">문의</dt>
            <dd className="break-all text-gray-500">biospartners@naver.com</dd>
          </dl>

          {/* PC: 한 줄(가운뎃점) 형태 */}
          <div className="hidden sm:block">
            <p>
              상호명 : 모두의사업친구 · 대표자 : 신주엽 · 주소 : 인천광역시 서해구 청라커낼로288번길 26, 285호
            </p>
            <p className="mt-1">
              사업자등록번호 : 597-12-02897 · 통신판매업신고 : 제2026-인천서해-0109호
            </p>
            <p className="mt-1">대표번호 : 1551-7886 · 문의 : biospartners@naver.com</p>
          </div>

          <p className="mt-4 text-gray-600">
            © 모두의사업친구. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
