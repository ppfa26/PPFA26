"use client";

// ════════════════════════════════════════════════════════════════
//  [임시 미리보기 페이지] 쿠팡 파트너스 배너 모습 확인용
//  → 대표님 확정 후, 이 배너를 무료진단 결과 하단 + 마이페이지 하단에 삽입.
//  → 확정되면 이 미리보기 페이지(preview-coupang)는 삭제 예정.
// ════════════════════════════════════════════════════════════════

import CoupangPartnersBanner from "@/components/CoupangPartnersBanner";

export default function PreviewCoupangPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-xl font-extrabold text-brand-dark">
        쿠팡 파트너스 배너 미리보기
      </h1>
      <p className="mb-8 break-keep text-sm text-brand-gray">
        아래 3가지는 실제 삽입될 배너의 모습입니다. 확정해 주시면 무료진단 결과 하단과
        마이페이지 하단에 그대로 넣겠습니다. (실제 배너 코드는 파트너스에서 발급 후 교체)
      </p>

      {/* 1) 코드 미입력 상태 (placeholder) — 지금 코드 없이 배포하면 이 모습 */}
      <section className="mb-10">
        <h2 className="mb-2 text-sm font-bold text-brand-dark">
          ① 배너 코드 미입력 상태 (자리만 잡아둔 모습)
        </h2>
        <CoupangPartnersBanner />
      </section>

      {/* 2) 텍스트/상품 링크형 (파트너스 링크 발급 시) */}
      <section className="mb-10">
        <h2 className="mb-2 text-sm font-bold text-brand-dark">
          ② 텍스트·상품 링크형 (예시)
        </h2>
        <CoupangPartnersBanner
          linkUrl="https://www.coupang.com"
          linkText="사업자에게 유용한 사무용품 보러가기"
        />
      </section>

      {/* 3) iframe 배너형 — 실제 발급된 쿠팡 다이나믹 배너(id 1012210) */}
      <section className="mb-10">
        <h2 className="mb-2 text-sm font-bold text-brand-dark">
          ③ 실제 쿠팡 다이나믹 배너 (id 1012210 · 실제 삽입될 모습)
        </h2>
        <CoupangPartnersBanner
          iframeSrc="https://ads-partners.coupang.com/widgets.html?id=1012210&template=carousel&trackingCode=AF6135516&subId=&width=680&height=140&tsource="
          iframeHeight={140}
        />
      </section>

      <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-4">
        <p className="break-keep text-xs leading-relaxed text-brand-dark">
          ✅ 모든 배너에 <b>&quot;광고&quot; 라벨</b> + <b>대가성(수수료) 문구</b>가 항상
          함께 노출됩니다. (공정거래위원회 표기 지침 준수 → 미표기 제재 위험 없음)
        </p>
      </div>
    </main>
  );
}
