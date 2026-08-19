"use client";

import LegalLayout from "@/components/LegalLayout";
import Editable from "@/components/Editable";

export default function TermsPage() {
  return (
    <LegalLayout pageKey="terms" title="이용약관" updatedAt="2026년 8월 19일">
      <section id="terms-1">
        <h2 className="text-lg font-extrabold text-brand-dark">제1조 (목적)</h2>
        <Editable id="terms-1-body-v2" as="p" className="mt-2">
          본 약관은 모두의사업친구(이하 &ldquo;회사&rdquo;)가 제공하는
          정부지원사업 AI 통합 매칭·자문 서비스(이하 &ldquo;서비스&rdquo;)의
          이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임 사항을 규정하는
          것을 목적으로 합니다.
        </Editable>
      </section>

      <section id="terms-2">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제2조 (서비스의 성격 · 중요 고지)
        </h2>
        <Editable id="terms-2-body-v2" as="p" className="mt-2">
          본 서비스는 정부지원사업에 대한{" "}
          <b>정보 제공과 신청 방법에 대한 매칭·자문 서비스</b>입니다. 회사는
          다음 사항을 명확히 고지합니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            회사는 <b>승인·선정·대출 실행을 보장하지 않습니다.</b> 최종 승인
            여부는 각 정부 부처·기관·금융기관의 심사에 따라 결정됩니다.
          </li>
          <li>
            실제 신청은 <b>이용자 본인이 직접 진행</b>합니다.
          </li>
          <li>
            이용자가 지불하는 금액은 <b>AI 매칭 서비스 이용료</b>이며, 그 외에
            성공 수수료 등 추가 비용은 청구되지 않습니다.{" "}
            <span className="text-brand-gray">
              (별도로 고지·동의한 유료 부가 서비스는 제외)
            </span>
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
          제6조 (계정 및 조회 이용 원칙)
        </h2>
        <Editable id="terms-6b-body" as="p" className="mt-2">
          본 서비스는 사업장을 실제로 운영하는 대표자 본인이 자신의 사업장을
          진단·조회하는 것을 전제로 합니다. 이에 따라 계정 이용에는 다음 원칙이
          적용됩니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            <b>1개의 계정은 1개의 사업자(사업장)를 조회하는 것을 원칙</b>으로
            합니다.
          </li>
          <li>
            다수의 사업장을 실제로 운영하는 경우에 한하여{" "}
            <b>최대 2개 사업자까지</b> 조회할 수 있으며, 그 이상은 이용이 제한될
            수 있습니다. <span className="text-brand-gray">(동일한 사업자를
            다시 조회하는 것은 제한 대상이 아닙니다.)</span>
          </li>
          <li>
            타인 또는 제3의 사업체를 대신하여 반복적으로 조회하는 등{" "}
            <b>대리·영업 목적의 사용</b>은 본 서비스의 본래 목적에 부합하지
            않으며, 이 경우 회사는 이용 제한·계정 정지 등의 조치를 취할 수
            있습니다.
          </li>
        </ul>
      </section>

      <section id="terms-7">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제7조 (이용자의 의무)
        </h2>
        <Editable id="terms-7b-body" as="p" className="mt-2">
          이용자는 사업장 진단 과정에서 정확한 정보를 제공해야 하며, 회사가
          제공한 매칭 및 안내 자료는 신청을 위한 참고 자료로 활용합니다. 최종
          신청 서류의 작성·제출 책임은 이용자 본인에게 있습니다.
        </Editable>
      </section>

      <section id="terms-8">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제8조 (책임의 제한)
        </h2>
        <Editable id="terms-8b-body" as="p" className="mt-2">
          회사는 정확하고 최신의 정보를 제공하기 위해 노력하나, 정부 정책·공고의
          변경, 기관의 심사 기준 변경 등으로 인한 결과에 대해서는 책임을 지지
          않습니다. 회사의 자문은 참고용이며, 승인 여부에 대한 법적 책임을 지지
          않습니다.
        </Editable>
      </section>

      <section id="terms-9">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제9조 (약관의 변경)
        </h2>
        <Editable id="terms-9b-body" as="p" className="mt-2">
          회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있으며,
          변경 시 서비스 내 공지사항을 통해 사전 고지합니다.
        </Editable>
      </section>

      <section id="terms-10">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제10조 (공공데이터 출처 표시)
        </h2>
        <Editable id="terms-10b-body" as="p" className="mt-2">
          본 서비스가 제공하는 일부 정부지원사업 공고 정보는 아래 공공데이터를
          활용하며, 「공공데이터의 제공 및 이용 활성화에 관한 법률」 및
          공공데이터 이용약관(제1유형·제3유형: 출처 표시)에 따라 출처를 표시합니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>기업마당(bizinfo.go.kr) · 중소벤처기업부</li>
          <li>K-Startup(k-startup.go.kr) · 창업진흥원</li>
          <li>중소벤처24(smes.go.kr) · 중소벤처기업부</li>
          <li>공공데이터포털(data.go.kr)</li>
        </ul>
        <Editable id="terms-10b-note" as="p" className="mt-2 text-brand-gray">
          공고 정보는 실시간 수집·가공되어 제공되며, 원문과 차이가 있을 수
          있으므로 최종 신청 전 반드시 각 기관의 공식 공고를 확인하시기 바랍니다.
        </Editable>
      </section>

      <section id="terms-11">
        <h2 className="text-lg font-extrabold text-brand-dark">
          제11조 (제휴사 서비스)
        </h2>
        <Editable id="terms-11b-body" as="p" className="mt-2">
          회사는 서비스 제공을 위해 정책금융기관 및 세무·행정·노무·관세·경영
          분야의 전문 파트너(이하 &ldquo;제휴사&rdquo;)와 제휴할 수 있으며,
          이용자가 <b>사전에 동의한 경우</b>에 한하여 상담·연계에 필요한 범위에서
          이용자의 정보가 제휴사와 공유될 수 있습니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            회사는 제휴사 서비스와 관련하여 이용자와 제휴사를{" "}
            <b>연결·중개하는 지위</b>에 있을 뿐이며, 제휴사와 이용자 간
            거래(상담·계약·수수료 등)의 당사자가 아닙니다.
          </li>
          <li>
            <b>제휴사 서비스 이용과 관련한 분쟁의 책임소재는 제휴사에 있으며,</b>{" "}
            회사는 회사의 고의 또는 중과실이 없는 한 이에 대한 책임을 부담하지
            않습니다.
          </li>
          <li>
            회사는 제휴사가 제공하는 정보·상담 내용의 정확성을 보장하지 않으며,
            제휴사의 사정으로 연계 서비스의 전부 또는 일부가 중단될 수 있습니다.
          </li>
        </ul>
      </section>

      <section id="terms-12">
        <h2 className="text-lg font-extrabold text-brand-dark">제12조 (문의)</h2>
        <Editable id="terms-12-body" as="p" className="mt-2">
          본 약관과 관련한 문의는 아래 연락처로 해주시기 바랍니다.
          <br />
          상호: 모두의사업친구 · 이메일: biospartners@naver.com
        </Editable>
      </section>
    </LegalLayout>
  );
}
