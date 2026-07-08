"use client";

import Link from "next/link";
import Image from "next/image";
import Editable from "./Editable";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-100 bg-brand-dark px-4 py-10 text-gray-300">
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
              정부지원사업 브로커 수수료 5% 대신,
              <br />
              직접 배워서 무료로 신청하세요.
              <br />
              저희는 사업장에 알맞는 정부지원사업을
              <br />
              안내하고 신청 방법을 자문해드립니다.
            </Editable>
            <Editable
              id="footer-nowarranty"
              as="p"
              className="mt-3 break-keep rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-brand-yellow"
            >
              ⚠️ 본 서비스는 신청 가능 상품 안내 및 자문 서비스이며
              <br />
              정부지원사업 승인을 보장하지 않습니다.
              <br />
              행정대행을 하지 않으며,
              <br />
              승인 후 추가 수수료를 요구하지 않습니다.
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
        <div className="mt-8 border-t border-white/10 pt-6 text-xs leading-relaxed text-gray-500">
          <Editable id="footer-bizinfo" as="p">
            상호: 모두의공공조달 (Public Procurement For All) · 대표: 신주엽 · 사업자등록번호: 597-12-02897
          </Editable>
          <Editable id="footer-bizinfo2" as="p" className="mt-1">
            주소: 인천광역시 서구 청라커낼로 288번길 26 285호 · 통신판매업신고: [신고번호] · 문의: biospartners@naver.com
          </Editable>
          <p className="mt-3 text-gray-600">
            © {new Date().getFullYear()} 모두의공공조달. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
