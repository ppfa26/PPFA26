"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageShell from "@/components/PageShell";
import { DiagnosisProfile } from "@/lib/matching";
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
        const raw = sessionStorage.getItem("mpp_diagnosis");
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
            <div className="inline-block break-keep rounded-full bg-brand-yellow px-5 py-2.5 text-base font-extrabold text-brand-dark sm:text-xl">
              🏦 대표님 맞춤 신청 가능 기관 및 상품 안내
            </div>
            <p className="mt-3 break-keep text-sm text-brand-gray sm:text-base">
              대표님 진단 정보를 기준으로 실제 신청 자격이 열리는 <b className="text-brand-orange">정책금융 기관·상품</b>과{" "}
              <b className="text-brand-green">추가로 신청 가능한 지원제도</b>를 정리해 드렸습니다.
            </p>
          </section>

          {/* 기관·상품 안내 — 결제 전 진단값으로 자동 판독(추가 질문 없음) */}
          {/*  추가 지원제도(🎁)는 이 패널 박스 안에 함께 노출됩니다. (하단 분리 X) */}
          <div className="mt-6">
            <AdvancedScreeningPanel autoRun />
          </div>

          {/* 면책조항 + 재검증 안내 — 최하단 */}
          {/*  ※ 🎁 4가지 추가 혜택·🗓️ 챙기는 순서는 AdvancedScreeningPanel 내부(소요기간 아래)로 이동함 */}
          <div className="mt-7 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
            <p className="break-keep text-xs leading-relaxed text-brand-dark/60">⚠️ {ADVISORY_DISCLAIMER}</p>
            <p className="mt-1 break-keep text-xs leading-relaxed text-brand-dark/60">🗓️ {REVALIDATION_NOTICE}</p>
          </div>

          {/* 상담 채널 안내 */}
          <section
            id="consult-channels"
            className="mt-10 rounded-3xl bg-brand-grad p-7 text-center sm:p-8"
          >
            <h2 className="text-xl font-black text-brand-dark">
              신청하시다 막히는 부분이 있으신가요?
            </h2>
            <p className="mt-2 break-keep text-sm text-brand-dark/70">
              혼자 고민하지 마세요. 1:1 채널톡으로 편하게 여쭤보시고,
              <br />
              결제하신 대표님들만 모인 단톡방에서 정보도 함께 나눠보세요.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="http://pf.kakao.com/_VxfWxan/chat"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-brand-dark px-7 py-3 font-bold text-white hover:opacity-90"
              >
                💬 1:1 채널톡 상담하기
              </a>
              <a
                href="https://open.kakao.com/o/gvjec0Di"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border-2 border-brand-dark bg-white px-7 py-3 font-bold text-brand-dark hover:bg-gray-50"
              >
                👥 결제자 단톡 톡방 참여하기
              </a>
            </div>
            <p className="mt-4 break-keep text-xs leading-relaxed text-brand-dark/60">
              ⚠️ 본 서비스는 정부지원사업 AI 통합 매칭 서비스이며 정부지원사업
              승인을 보장하지 않습니다.
            </p>
            <p className="mt-2 break-keep text-[11px] leading-relaxed text-brand-dark/40">
              — 출처: 모두의사업친구(모두의사업친구.kr) · 무단 복제·도용 금지
            </p>
          </section>
        </div>
        </ViewCreditGate>
      </main>
      <Footer />
    </PageShell>
  );
}
