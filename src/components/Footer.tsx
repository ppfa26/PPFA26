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
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
        {/* ── 1줄: 브랜드 + 공식 채널을 로고 옆에 바로 이어 붙임(빈칸 제거) ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {/* 브랜드 (태그라인 제거 → 로고+이름만, 최대한 간결) */}
          <div className="flex shrink-0 items-center gap-2.5">
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

          {/* 공식 채널 - 라벨 없이 원형 아이콘만(미니멀). 로고 이름 바로 옆에 이어 붙임 */}
          <ul className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {CHANNELS.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={c.label}
                  aria-label={c.label}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-gray-300 transition sm:h-9 sm:w-9 ${c.hover}`}
                >
                  <span className="text-[15px] leading-none sm:text-[16px]" aria-hidden="true">
                    {c.icon ? <i className={c.icon} /> : c.emoji}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* ── 2줄: 메뉴 네비 (가운뎃점) ─────────────────────────────── */}
        <nav className="mt-5">
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

        {/* ── 3줄(법적 고지): 면책 + 사업자정보(항목별 줄바꿈) + 저작권 ───
            사업자정보는 항목 단위로 줄을 나눠(가운뎃점은 같은 줄 묶음만) 가독성 확보. 법적 항목 전부 유지. */}
        <div className="mt-5 break-keep border-t border-white/10 pt-5 text-[11px] leading-relaxed text-gray-500">
          <Editable
            id="footer-nowarranty"
            as="p"
            className="break-keep text-[11px] leading-relaxed text-gray-500"
          >
            ⚠️ 본 서비스는 안내·추천·매칭하는 AI 통합 매칭 서비스이며, 정부지원사업 승인을 보장하지 않습니다.
          </Editable>

          {/* 모바일: 항목별 줄바꿈(좁은 폭 → 가독성) */}
          <address className="mt-3 space-y-0.5 not-italic text-gray-500 sm:hidden">
            <p>상호명 : 모두의사업친구 <span className="text-white/15">·</span> 대표자 : 신주엽</p>
            <p>사업자등록번호 : 597-12-02897</p>
            <p>통신판매업신고 : 제2026-인천서해-0109호</p>
            <p>주소 : 인천광역시 서해구 청라커낼로288번길 26, 285호</p>
            <p>대표번호 : 1551-7886</p>
            <p>문의 : <span className="break-all">biospartners@naver.com</span></p>
            <p className="pt-1 text-gray-600">© 모두의사업친구. All rights reserved.</p>
          </address>

          {/* PC: 2줄로 묶어 간결하게(가운뎃점) */}
          <address className="mt-3 hidden space-y-0.5 not-italic text-gray-500 sm:block">
            <p>
              상호명 : 모두의사업친구 <span className="text-white/15">·</span> 대표자 : 신주엽 <span className="text-white/15">·</span> 사업자등록번호 : 597-12-02897 <span className="text-white/15">·</span> 통신판매업신고 : 제2026-인천서해-0109호
            </p>
            <p>
              주소 : 인천광역시 서해구 청라커낼로288번길 26, 285호 <span className="text-white/15">·</span> 대표번호 : 1551-7886 <span className="text-white/15">·</span> 문의 : biospartners@naver.com <span className="text-white/15">·</span> <span className="text-gray-600">© 모두의사업친구. All rights reserved.</span>
            </p>
          </address>
        </div>
      </div>
    </footer>
  );
}
