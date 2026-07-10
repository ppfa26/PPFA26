"use client";

import Link from "next/link";
import Image from "next/image";
import Editable from "./Editable";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-gray-100 bg-brand-dark px-4 py-10 text-gray-300">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          {/* 브랜드 */}
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <Image
                src="/logo/brand-footer-dark.png"
                alt="모두의공공조달"
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-lg"
              />
              <span className="text-base font-extrabold leading-none text-white">
                모두의공공조달
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
              className="mt-3 break-keep rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-brand-yellow"
            >
              ⚠️ 본 서비스는 정부지원사업 승인을 보장하지 않습니다.
              <br />
              정부지원사업 안내 및 신청 방법을 자문하는 플랫폼입니다.
            </Editable>
          </div>

          {/* 링크 */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            <Link href="/pricing" className="hover:text-white">
              요금 안내
            </Link>
            <Link href="/diagnosis" className="hover:text-white">
              무료 진단
            </Link>
            <Link href="/community" className="hover:text-white">
              커뮤니티
            </Link>
            <Link href="/sites" className="hover:text-white">
              공식 사이트 모음
            </Link>
            <Link href="/terms" className="hover:text-white">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:text-white">
              개인정보처리방침
            </Link>
            <Link href="/refund" className="hover:text-white">
              환불정책
            </Link>
            <Link href="/business-info" className="hover:text-white">
              사업자정보
            </Link>
          </div>
        </div>

        {/* 사업자 정보 */}
        <div className="mt-8 break-keep border-t border-white/10 pt-6 text-[11px] leading-relaxed text-gray-500">
          {/* 모바일: 항목별 줄바꿈 */}
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 sm:hidden">
            <dt className="shrink-0 text-gray-400">상호</dt>
            <dd className="text-gray-500">모두의공공조달</dd>
            <dt className="shrink-0 text-gray-400">대표자</dt>
            <dd className="text-gray-500">[대표자명]</dd>
            <dt className="shrink-0 text-gray-400">주소</dt>
            <dd className="text-gray-500">인천광역시 서해구 청라커낼로 288번길 26</dd>
            <dt className="shrink-0 text-gray-400">사업자등록번호</dt>
            <dd className="text-gray-500">597-12-02897</dd>
            <dt className="shrink-0 text-gray-400">통신판매업신고</dt>
            <dd className="text-gray-500">[신고번호]</dd>
            <dt className="shrink-0 text-gray-400">전화</dt>
            <dd className="text-gray-500">[전화번호]</dd>
            <dt className="shrink-0 text-gray-400">문의</dt>
            <dd className="break-all text-gray-500">biospartners@naver.com</dd>
          </dl>

          {/* PC: 기존 한 줄(가운뎃점) 형태 유지 */}
          <div className="hidden sm:block">
            <p>
              상호 : 모두의공공조달 · 대표자 : [대표자명] · 주소 : 인천광역시 서해구 청라커낼로 288번길 26
            </p>
            <p className="mt-1">
              사업자등록번호 : 597-12-02897 · 통신판매업신고 : [신고번호]
            </p>
            <p className="mt-1">전화 : [전화번호] · 문의 : biospartners@naver.com</p>
          </div>

          <p className="mt-3 text-gray-600">
            © 모두의공공조달. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
