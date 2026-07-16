"use client";

/* ────────────────────────────────────────────
   디지털 명함 페이지  (/card)
   - 대표님 기존 IBSC(혁신사업지원센터) 명함을 그대로 웹으로 옮긴 페이지
   - 명함 이미지 + 탭 한 번으로 전화/문자/이메일/지도/연락처 저장
   - QR·링크로 공유하면 상대방이 바로 저장할 수 있음
   - 카드 이미지 원본: /card/ibsc-card-print.png (인쇄소용 고해상도와 동일)
──────────────────────────────────────────── */

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";

const INFO = {
  name: "신주엽",
  title: "혁신사업지원센터 · 대표",
  org: "혁신사업지원센터 (IBSC)",
  tel: "1551-7886",
  fax: "010-3032-9388",
  email: "biospartners@naver.com",
  addr: "인천 서구 청라커낼로 288번길 26, 청라썬앤빌더테라스 285호",
  kakao: "http://pf.kakao.com/_VxfWxan/chat",
};

// 연락처 저장용 vCard (탭하면 폰 주소록에 바로 저장됨)
function buildVCard() {
  const v = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:;${INFO.name};;;`,
    `FN:${INFO.name}`,
    `ORG:${INFO.org}`,
    `TITLE:대표`,
    `TEL;TYPE=WORK,VOICE:${INFO.tel}`,
    `TEL;TYPE=CELL:${INFO.fax}`,
    `EMAIL;TYPE=WORK:${INFO.email}`,
    `ADR;TYPE=WORK:;;${INFO.addr};;;;`,
    "END:VCARD",
  ].join("\n");
  return "data:text/vcard;charset=utf-8," + encodeURIComponent(v);
}

export default function CardPage() {
  const mapUrl =
    "https://map.naver.com/p/search/" + encodeURIComponent(INFO.addr);

  return (
    <PageShell pageKey="card">
      <Header />
      <main className="min-h-[70vh] bg-brand-dark px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-md">
          {/* ── 명함 이미지 ── */}
          <section
            id="card-image"
            className="overflow-hidden rounded-2xl bg-white shadow-card"
          >
            <img
              src="/card/ibsc-card-print.png"
              alt="혁신사업지원센터 신주엽 대표 명함"
              className="block w-full"
            />
          </section>

          {/* ── 빠른 실행 버튼 (모바일에서 탭 한 번) ── */}
          <section id="card-actions" className="mt-5 grid grid-cols-2 gap-3">
            <a
              href={`tel:${INFO.tel}`}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white px-3 py-4 text-center shadow-card transition hover:brightness-95"
            >
              <span className="text-2xl">📞</span>
              <span className="text-sm font-extrabold text-brand-dark">
                전화 걸기
              </span>
              <span className="text-[11px] text-brand-gray">{INFO.tel}</span>
            </a>
            <a
              href={INFO.kakao}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-[#FEE500] px-3 py-4 text-center shadow-card transition hover:brightness-95"
            >
              <span className="text-2xl">💬</span>
              <span className="text-sm font-extrabold text-brand-dark">
                1:1 채널톡
              </span>
              <span className="text-[11px] text-brand-dark/60">카카오 상담</span>
            </a>
            <a
              href={`mailto:${INFO.email}`}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white px-3 py-4 text-center shadow-card transition hover:brightness-95"
            >
              <span className="text-2xl">✉️</span>
              <span className="text-sm font-extrabold text-brand-dark">
                이메일
              </span>
              <span className="max-w-full truncate text-[11px] text-brand-gray">
                {INFO.email}
              </span>
            </a>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white px-3 py-4 text-center shadow-card transition hover:brightness-95"
            >
              <span className="text-2xl">📍</span>
              <span className="text-sm font-extrabold text-brand-dark">
                지도 보기
              </span>
              <span className="text-[11px] text-brand-gray">청라 오피스</span>
            </a>
          </section>

          {/* ── 연락처 저장 (vCard) ── */}
          <a
            id="card-save"
            href={buildVCard()}
            download="신주엽_혁신사업지원센터.vcf"
            className="btn-brand mt-3 block rounded-2xl py-3.5 text-center text-base font-bold shadow-card"
          >
            📇 연락처 저장하기
          </a>

          {/* ── 정보 요약 (복사·확인용) ── */}
          <section
            id="card-info"
            className="mt-5 rounded-2xl bg-white/5 p-5 text-sm leading-relaxed text-gray-200"
          >
            <p className="text-lg font-black text-white">{INFO.name}</p>
            <p className="mt-0.5 text-gray-300">{INFO.title}</p>
            <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
              <p>
                <span className="font-bold text-brand-yellow">T.</span>{" "}
                {INFO.tel}
                <span className="mx-2 text-white/30">|</span>
                <span className="font-bold text-brand-yellow">F.</span>{" "}
                {INFO.fax}
              </p>
              <p>
                <span className="font-bold text-brand-yellow">E.</span>{" "}
                {INFO.email}
              </p>
              <p className="break-keep">
                <span className="font-bold text-brand-yellow">P.</span>{" "}
                {INFO.addr}
              </p>
            </div>
          </section>

          {/* ── 홈으로 ── */}
          <a
            href="/"
            className="mt-5 block text-center text-xs text-gray-400 underline"
          >
            모두의사업친구 홈으로 →
          </a>
        </div>
      </main>
      <Footer />
    </PageShell>
  );
}
