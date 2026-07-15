"use client";

import LegalLayout from "@/components/LegalLayout";
import Editable from "@/components/Editable";

export default function TermsPage() {
  return (
    <LegalLayout pageKey="terms" title="이용약관" updatedAt="2026년 7월 15일">
      <section id="terms-1">
        <h2 className="text-lg font-extrabold text-brand-dark">제1조 (목적)</h2>
        <Editable id="terms-1-body" as="p" className="mt-2">
          본 약관은 모두의사업친구(이하 &ldquo;회사&rdquo;)이
          제공하는 정부지원사업·정책자금 통합 매칭 자문 서비스(이하 &ldquo;서비스&rdquo;)의
          이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임 사항을 규정하는 것을
          목적으로 합니다.
        </Editable>
      </section>

      <section id="terms-2">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제2조 (서비스의 성격 — 중요)
        </h2>
        <Editable id="terms-2-body" as="p" className="mt-2">
          본 서비스는 정부지원사업의 <b>정보 제공 및 신청 방법에 대한 매칭 및 자문
          서비스</b>입니다. 회사는 다음 사항을 명확히 고지합니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            회사는 <b>승인·선정·대출 실행을 보장하지 않습니다.</b> 최종 승인 여부는
            각 정부 부처·기관·금융기관의 심사에 따라 결정됩니다.
          </li>
          <li>
            실제 신청은 <b>이용자 본인이 직접 진행</b>합니다.
          </li>
          <li>
            이용자가 지불하는 금액은 <b>자문 서비스 이용료</b>이며, 그 외에
            추가적인 수수료(이용료)는 없습니다. <span className="text-brand-gray">(유료 추가 서비스는 제외)</span>
          </li>
        </ul>
      </section>

      <section id="terms-3">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제3조 (서비스의 내용)
        </h2>
        <Editable id="terms-3-body" as="p" className="mt-2">
          회사가 제공하는 서비스는 다음과 같습니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>진단 정보를 기반으로 한 맞춤형 정부지원사업 매칭 결과 제공</li>
          <li>
            정부지원사업별 신청 사이트·필요 서류·신청 절차 안내 및 서류 준비 자문
          </li>
        </ul>
      </section>

      <section id="terms-4">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제4조 (이용료 및 결제)
        </h2>
        <Editable id="terms-4-body" as="p" className="mt-2">
          서비스는 상품별로 정해진 이용료를 <b>일시불 1회성 결제</b>하는 방식으로
          제공되며, <b>자동결제(정기결제)는 발생하지 않습니다.</b> 결제는 회사가
          지정한 결제대행사(PG)를 통해 이루어집니다.
        </Editable>
      </section>

      <section id="terms-5">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제5조 (환불 및 청약철회)
        </h2>
        <Editable id="terms-5-body" as="p" className="mt-2">
          환불 및 청약철회에 관한 사항은 「전자상거래 등에서의 소비자보호에 관한
          법률」 및 회사의 <b>환불정책</b>을 따릅니다. 자세한 내용은 환불정책
          페이지를 참고해 주시기 바랍니다.
        </Editable>
      </section>

      <section id="terms-6">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제6조 (이용자의 의무)
        </h2>
        <Editable id="terms-6-body" as="p" className="mt-2">
          이용자는 사업장 진단 과정에서 정확한 정보를 제공해야 하며, 회사가 제공한
          매칭 및 안내 자료를 신청의 참고 자료로 활용합니다. 최종 신청 서류의
          작성·제출 책임은 이용자 본인에게 있습니다.
        </Editable>
      </section>

      <section id="terms-7">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제7조 (책임의 제한)
        </h2>
        <Editable id="terms-7-body" as="p" className="mt-2">
          회사는 정확하고 최신의 정보를 제공하기 위해 노력하나, 정부 정책·공고의
          변경, 기관의 심사 기준 변경 등으로 인한 결과에 대해서는 책임을 지지
          않습니다. 회사의 자문은 참고용이며, 승인 여부에 대한 법적 책임을 지지
          않습니다.
        </Editable>
      </section>

      <section id="terms-8">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제8조 (약관의 변경)
        </h2>
        <Editable id="terms-8-body" as="p" className="mt-2">
          회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있으며,
          변경 시 서비스 내 공지사항을 통해 사전 고지합니다.
        </Editable>
      </section>

      <section id="terms-9">
        <h2 className="text-lg font-extrabold text-brand-dark">제9조 (문의)</h2>
        <Editable id="terms-9-body" as="p" className="mt-2">
          본 약관과 관련한 문의는 아래 연락처로 해주시기 바랍니다.
          <br />
          상호: 모두의사업친구 · 이메일: biospartners@naver.com
        </Editable>
      </section>
    </LegalLayout>
  );
}
