"use client";

import LegalLayout from "@/components/LegalLayout";
import Editable from "@/components/Editable";

export default function PrivacyPage() {
  return (
    <LegalLayout
      pageKey="privacy"
      title="개인정보처리방침"
      updatedAt="2026년 7월 8일"
    >
      <section id="privacy-intro">
        <Editable id="privacy-intro-body" as="p">
          모두의공공조달(이하 &ldquo;회사&rdquo;)은 「개인정보 보호법」 등 관련 법령을
          준수하며, 이용자의 개인정보를 안전하게 보호하기 위해 다음과 같은
          처리방침을 두고 있습니다.
        </Editable>
      </section>

      <section id="privacy-1">
        <h2 className="text-lg font-extrabold text-brand-dark">
          1. 수집하는 개인정보 항목
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            <b>무료 진단 시</b>: 이름, 연락처(휴대전화번호), 사업 형태·업종·매출
            규모 등 진단 응답 정보
          </li>
          <li>
            <b>회원가입·로그인 시</b>: 이메일 주소, 소셜 로그인 식별 정보
          </li>
          <li>
            <b>결제 시</b>: 결제 승인 정보(주문번호, 결제금액, 결제수단),
            이메일 주소 (카드번호 등 민감 결제정보는 회사가 저장하지 않으며
            결제대행사가 처리합니다)
          </li>
          <li>
            <b>자동 수집</b>: 서비스 이용 기록, 접속 로그, 브라우저 정보
          </li>
        </ul>
      </section>

      <section id="privacy-2">
        <h2 className="text-lg font-extrabold text-brand-dark">
          2. 개인정보의 이용 목적
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>맞춤형 지원사업 매칭 및 자문 서비스 제공</li>
          <li>1:1 상담 및 고객 문의 응대</li>
          <li>결제 처리 및 이용 내역 관리</li>
          <li>서비스 개선 및 통계 분석</li>
        </ul>
      </section>

      <section id="privacy-3">
        <h2 className="text-lg font-extrabold text-brand-dark">
          3. 개인정보의 보유 및 이용 기간
        </h2>
        <Editable id="privacy-3-body" as="p" className="mt-2">
          이용자의 개인정보는 수집·이용 목적이 달성되면 지체 없이 파기합니다.
          다만, 관련 법령에 따라 다음과 같이 보존합니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
          <li>대금 결제 및 재화 공급에 관한 기록: 5년 (전자상거래법)</li>
          <li>소비자 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)</li>
        </ul>
      </section>

      <section id="privacy-4">
        <h2 className="text-lg font-extrabold text-brand-dark">
          4. 개인정보의 제3자 제공 및 처리 위탁
        </h2>
        <Editable id="privacy-4-body" as="p" className="mt-2">
          회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만,
          원활한 서비스 제공을 위해 아래와 같이 처리를 위탁할 수 있습니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>결제 처리: 결제대행사(PG)</li>
          <li>회원 인증·데이터 보관: 클라우드 인프라 제공사</li>
        </ul>
      </section>

      <section id="privacy-5">
        <h2 className="text-lg font-extrabold text-brand-dark">
          5. 이용자의 권리
        </h2>
        <Editable id="privacy-5-body" as="p" className="mt-2">
          이용자는 언제든지 본인의 개인정보에 대한 열람·정정·삭제·처리정지를
          요청할 수 있으며, 회사는 관련 법령에 따라 지체 없이 조치합니다. 요청은
          아래 개인정보 보호책임자 연락처로 해주시기 바랍니다.
        </Editable>
      </section>

      <section id="privacy-6">
        <h2 className="text-lg font-extrabold text-brand-dark">
          6. 개인정보 보호책임자
        </h2>
        <Editable id="privacy-6-body" as="p" className="mt-2">
          상호: 모두의공공조달 (Public Procurement For All)
          <br />
          이메일: biospartners@naver.com
        </Editable>
      </section>
    </LegalLayout>
  );
}
