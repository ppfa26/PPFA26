"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { DiagnosisProfile } from "@/lib/matching";
import { loadDiagnosisRaw } from "@/lib/diagnosisStore";
import AdvancedScreeningPanel from "@/components/AdvancedScreeningPanel";
import ViewCreditGate from "@/components/ViewCreditGate";
import { ADVISORY_DISCLAIMER, REVALIDATION_NOTICE } from "@/lib/advancedScreening";

export default function DashboardPage() {
  // 진단 프로필 원본 — 헤더 안내 문구 등에 사용.
  //  (기관·상품 + 추가 지원제도 판정은 AdvancedScreeningPanel이 자체적으로 수행)
  const [, setProfileData] = useState<DiagnosisProfile>({});

  useEffect(() => {
    const recompute = () => {
      try {
        const raw = loadDiagnosisRaw();
        setProfileData(raw ? JSON.parse(raw) : {});
      } catch {
        setProfileData({});
      }
    };

    recompute();
    // 정밀진단 완료 시 발신되는 이벤트를 받아 즉시 재계산
    window.addEventListener("mpp-advanced-applied", recompute);
    return () => window.removeEventListener("mpp-advanced-applied", recompute);
  }, []);

  return (
    <PageShell pageKey="dashboard">
      <Header />
      <main className="bg-gray-50 px-4 py-8">
        <ViewCreditGate>
        <div className="mx-auto max-w-4xl">
          {/* 헤더 — 기관·상품 안내 중심 */}
          <section id="dashboard-hero" className="text-center">
            <div className="inline-block break-keep rounded-full bg-brand-yellow px-4 py-2.5 text-sm font-extrabold leading-snug text-brand-dark sm:px-5 sm:text-xl">
              🏦 대표님 맞춤 신청 가능 기관 및 상품 안내
            </div>
            <p className="mx-auto mt-3 max-w-2xl break-keep text-[13px] leading-relaxed text-brand-gray sm:text-base">
              대표님 진단 정보를 기준으로 실제 신청 자격이 열리는
              {/* 모바일: '열리는' 뒤 줄바꿈 (3줄) */}
              <br className="sm:hidden" />{" "}
              <b className="text-brand-orange">정책금융 기관·상품</b>과{" "}
              {/* PC: '기관·상품과' 뒤 줄바꿈 (2줄) */}
              <br className="hidden sm:inline" />
              <b className="text-brand-green">추가로 신청 가능한 지원사업</b>을
              {/* 모바일: '지원사업을' 뒤 줄바꿈 (3줄) */}
              <br className="sm:hidden" />{" "}
              <span className="whitespace-nowrap">대표님의 사업장 기준으로</span> 정리해 드렸습니다.
            </p>
          </section>

          {/* 기관·상품 안내 — 결제 전 진단값으로 자동 판독(추가 질문 없음) */}
          {/*  추가 지원제도(🎁)는 이 패널 박스 안에 함께 노출됩니다. (하단 분리 X) */}
          <div className="mt-6">
            <AdvancedScreeningPanel autoRun />
          </div>

          {/* 면책조항 + 재검증 안내 — 최하단 */}
          {/*  ※ 🎁 추가 감면 혜택·🗓️ 챙기는 순서는 AdvancedScreeningPanel 내부(소요기간 아래)로 이동함 */}
          <div className="mt-7 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
            <p className="break-keep text-xs leading-relaxed text-brand-dark/60">⚠️ {ADVISORY_DISCLAIMER}</p>
            <p className="mt-1 break-keep text-xs leading-relaxed text-brand-dark/60">🗓️ {REVALIDATION_NOTICE}</p>
          </div>

          {/* 상담 채널 안내 — 어두운 카드 + 1:1 채널톡만 (대표님 요청: 단톡방 제거, 2번째 사진 스타일 통일) */}
          <section
            id="consult-channels"
            className="mt-10 rounded-3xl bg-brand-dark p-8 text-center shadow-card sm:p-10"
          >
            <h2 className="break-keep text-xl font-black leading-snug text-white sm:text-2xl">
              더 궁금한 점이 있으신가요?
            </h2>
            <p className="mx-auto mt-3 max-w-md break-keep text-sm leading-relaxed text-gray-300">
              서비스 이용에 어려움을 겪고 있으시다면 1:1 채널톡 상담하기를 클릭하세요.
            </p>
            <div className="mt-7 flex justify-center">
              <a
                href="http://pf.kakao.com/_VxfWxan/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-red w-full rounded-full px-8 py-3.5 text-base font-bold sm:w-auto"
              >
                💬 1:1 채널톡 상담하기
              </a>
            </div>
            <p className="mt-6 break-keep text-xs leading-relaxed text-gray-400">
              ⚠️ 본 서비스는 정부지원사업을 안내·추천하는 매칭 서비스이며 정부지원사업
              승인을 보장하지 않습니다.
            </p>
          </section>
        </div>
        </ViewCreditGate>
      </main>
      <Footer />
    </PageShell>
  );
}
