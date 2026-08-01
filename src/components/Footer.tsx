"use client";

import Link from "next/link";
import Image from "next/image";
import Editable from "./Editable";

export default function Footer({ topGap = "mt-8" }: { topGap?: string } = {}) {
  return (
    <footer className={`${topGap} border-t border-gray-100 bg-brand-dark px-8 py-8 text-gray-300 sm:px-12`}>
      {/* 회사정보↔메뉴가 양끝으로 과하게 벌어지지 않게 최대폭을 살짝 좁혀
          가운데로 모은다(대표님 요청). max-w-6xl→max-w-5xl */}
      <div className="mx-auto max-w-5xl">
        {/* 공식 채널을 브랜드↔메뉴 사이 '가운데 칸'으로 배치한 3단 레이아웃.
            세 컬럼 모두 items-start로 상단 정렬축을 맞추고, 소제목 스타일을
            통일해(채널/바로가기) 위계·무게 균형을 잡는다. */}
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          {/* ① 브랜드 */}
          <div className="sm:w-[34%] sm:max-w-sm">
            <div className="flex items-center gap-2">
              <Image
                src="/logo/brand-footer-dark.png"
                alt="모두의사업친구"
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-lg"
              />
              <span className="text-base font-extrabold leading-none text-white">
                모두의사업친구
              </span>
            </div>
            <Editable
              id="footer-tagline"
              as="p"
              className="mt-3 break-keep text-sm leading-relaxed text-gray-400"
            >
              내 사업장에 알맞은 정부지원사업을 찾는 가장 빠른 방법
            </Editable>
            <Editable
              id="footer-nowarranty"
              as="p"
              className="mt-4 break-keep rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-brand-yellow"
            >
              ⚠️ 본 서비스는 안내·추천·매칭하는 AI 통합 매칭 서비스이며,
              <br />
              정부지원사업 승인을 보장하지 않습니다.
            </Editable>
          </div>

          {/* ② 공식 채널 (가운데) - 유입 주력 스레드·인스타·당근을 앞에.
              컴팩트한 세로 2열 버튼. 각 채널 고유 브랜드 컬러 hover. */}
          <div className="sm:w-[40%]">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
              공식 채널
            </p>
            <ul className="grid grid-cols-2 gap-1.5">
              {[
                { href: "https://www.threads.com/@ppfa25", label: "스레드", icon: "fa-brands fa-threads", cls: "hover:border-white/70 hover:text-white" },
                { href: "https://www.instagram.com/ppfa25", label: "인스타그램", icon: "fa-brands fa-instagram", cls: "hover:border-[#E1306C]/80 hover:text-[#E1306C]" },
                { href: "https://www.daangn.com/kr/local-profile/8j96yjujtkqy/?referrer=share", label: "당근", emoji: "🥕", cls: "hover:border-[#FF8A3D]/80 hover:text-[#FF8A3D]" },
                { href: "https://pf.kakao.com/_VxfWxan/chat", label: "카카오톡 상담", emoji: "💬", cls: "hover:border-[#FEE500]/80 hover:text-[#FEE500]" },
                { href: "https://blog.naver.com/biospartners", label: "네이버 블로그", icon: "fa-solid fa-blog", cls: "hover:border-[#03C75A]/80 hover:text-[#03C75A]" },
                { href: "https://map.naver.com/p/entry/place/1118269039", label: "네이버 지도", icon: "fa-solid fa-location-dot", cls: "hover:border-[#03C75A]/80 hover:text-[#03C75A]" },
                { href: "https://pf.kakao.com/_VxfWxan", label: "카카오톡 채널", emoji: "📢", cls: "hover:border-[#FEE500]/80 hover:text-[#FEE500]" },
                { href: "https://link.inpock.co.kr/ppfa25", label: "전체 링크·후기", icon: "fa-solid fa-link", cls: "hover:border-brand-orange/80 hover:text-brand-orange" },
              ].map((c) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[12.5px] font-medium text-gray-300 transition ${c.cls}`}
                  >
                    <span className="flex w-4 shrink-0 justify-center text-[15px] leading-none" aria-hidden="true">
                      {c.icon ? <i className={c.icon} /> : c.emoji}
                    </span>
                    <span className="break-keep">{c.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ③ 메뉴 링크 - 채널과 대칭되도록 소제목 부여 */}
          <div className="sm:w-[22%]">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
              바로가기
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13.5px] sm:grid-cols-1">
              <Link href="/pricing" className="text-gray-300 transition hover:text-white">
                요금 안내
              </Link>
              <Link href="/diagnosis-chat" className="text-gray-300 transition hover:text-white">
                무료 진단
              </Link>
              <Link href="/community" className="text-gray-300 transition hover:text-white">
                커뮤니티
              </Link>
              <Link href="/sites" className="text-gray-300 transition hover:text-white">
                공식 사이트 모음
              </Link>
              <Link href="/terms" className="text-gray-300 transition hover:text-white">
                이용약관
              </Link>
              <Link href="/privacy" className="text-gray-300 transition hover:text-white">
                개인정보처리방침
              </Link>
              <Link href="/refund" className="text-gray-300 transition hover:text-white">
                환불정책
              </Link>
              <Link href="/business-info" className="text-gray-300 transition hover:text-white">
                사업자정보
              </Link>
            </div>
          </div>
        </div>

        {/* 사업자 정보 */}
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

          {/* PC: 기존 한 줄(가운뎃점) 형태 유지 */}
          <div className="hidden sm:block">
            <p>
              상호명 : 모두의사업친구 · 대표자 : 신주엽 · 주소 : 인천광역시 서해구 청라커낼로288번길 26, 285호
            </p>
            <p className="mt-1">
              사업자등록번호 : 597-12-02897 · 통신판매업신고 : 제2026-인천서해-0109호
            </p>
            <p className="mt-1">대표번호 : 1551-7886 · 문의 : biospartners@naver.com</p>
          </div>

          <p className="mt-3 text-gray-600">
            © 모두의사업친구. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
