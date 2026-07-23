"use client";

import LegalLayout from "@/components/LegalLayout";
import Editable from "@/components/Editable";

export default function RefundPage() {
  return (
    <LegalLayout pageKey="refund" title="환불정책" updatedAt="2026년 7월 15일">
      <section id="refund-intro">
        <Editable id="refund-intro-body" as="p">
          모두의사업친구(이하 &ldquo;회사&rdquo;)의 환불정책은 「전자상거래 등에서의
          소비자보호에 관한 법률」을 기준으로 합니다. 본 서비스는 정보·자문 제공
          형태의 <b>디지털 콘텐츠</b>이므로, 콘텐츠 열람 여부에 따라 환불 기준이
          달라집니다.
        </Editable>
      </section>

      <section id="refund-period">
        <h2 className="text-lg font-extrabold text-brand-dark">
          서비스 제공기간
        </h2>
        <Editable id="refund-period-body" as="p" className="mt-2">
          본 서비스는 <b>무형(디지털) 정부지원사업 AI 통합 매칭 서비스</b>로, 서비스
          제공기간은 결제 시점부터 각 플랜에 명시된 <b>이용기간(1개월)</b> 동안이며이며
          <b> 결제한 아이디당 1개의 사업장 조회</b>를 기준으로 합니다. 결제 즉시 가이드 사이트
          열람·매칭 추천이 개시되며, 별도 배송이 없는 상품입니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>AI 진단 리포트 : <b>결제일로부터 1개월</b> 이용</li>
          <li>
            결제 아이디당 <b>1개의 사업장 조회</b>를 기준으로 합니다.
            조회된 내용 재접속은 <b>1개월간 무제한</b>
          </li>
          <li>이용기간 종료 시 1개월 단위로 자유롭게 추가 결제·연장 가능</li>
        </ul>
      </section>

      <section id="refund-1">
        <h2 className="text-lg font-extrabold text-brand-dark">
          1. 청약철회 및 전액 환불 (열람 전)
        </h2>
        <Editable id="refund-1-body" as="p" className="mt-2">
          결제 후 매칭 결과·자문 자료 등 <b>유료 콘텐츠를 열람하기 전</b>이라면,
          결제일로부터 <b>7일 이내</b> 청약철회 및 전액 환불이 가능합니다.
        </Editable>
      </section>

      <section id="refund-2">
        <h2 className="text-lg font-extrabold text-brand-dark">
          2. 환불 제한 (열람 후)
        </h2>
        <Editable id="refund-2-body" as="p" className="mt-2">
          전자상거래법 제17조 제2항에 따라, 다음의 경우 청약철회가 제한될 수
          있습니다. 이는 콘텐츠 제공이 개시되면 원상 회복이 불가능한 디지털
          콘텐츠의 특성에 따른 것입니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            결제 후 <b>매칭 결과·자문 자료·상세 정보를 이미 열람·확인한 경우</b>
          </li>
          <li>1:1 상담 등 자문 서비스가 이미 제공된 경우</li>
        </ul>
        <Editable id="refund-2-note" as="p" className="mt-3 text-sm text-brand-gray">
          ※ 회사는 결제 화면에서 위 청약철회 제한 사항을 사전에 고지하며, 이용자가
          이를 확인한 후 결제를 진행합니다.
        </Editable>
      </section>

      <section id="refund-3">
        <h2 className="text-lg font-extrabold text-brand-dark">
          3. 회사 귀책 사유로 인한 환불
        </h2>
        <Editable id="refund-3-body" as="p" className="mt-2">
          아래와 같이 회사의 귀책 사유로 서비스를 정상적으로 이용하지 못한 경우,
          열람 여부와 관계없이 전액 환불해 드립니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>서비스 오류·장애로 콘텐츠를 이용할 수 없는 경우</li>
          <li>안내된 서비스 내용과 실제 제공 내용이 현저히 다른 경우</li>
        </ul>
      </section>

      <section id="refund-4">
        <h2 className="text-lg font-extrabold text-brand-dark">
          4. 환불 신청 방법 및 처리 기간
        </h2>
        <Editable id="refund-4-body" as="p" className="mt-2">
          환불은 아래 문의처로 신청해 주시기 바랍니다. 접수 후 영업일 기준
          3일 이내에 처리하며, 결제수단에 따라 실제 환불 완료까지 추가 기간이
          소요될 수 있습니다.
          <br />
          이메일: biospartners@naver.com
        </Editable>
      </section>

      <section id="refund-5">
        <h2 className="text-lg font-extrabold text-brand-dark">
          5. 승인 결과 관련 안내
        </h2>
        <Editable id="refund-5-body" as="p" className="mt-2">
          본 서비스는 <b>정부지원사업 추천 및 매칭 서비스</b>로서 정부지원사업의
          <b> 승인·선정을 보장하지 않습니다.</b> 기관 심사에서 승인·선정되지 않았다는
          <b> 사유만으로는 환불 대상이 되지 않습니다.</b>
        </Editable>
      </section>
    </LegalLayout>
  );
}
