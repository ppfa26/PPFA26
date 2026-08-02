"use client";

import LegalLayout from "@/components/LegalLayout";
import Editable from "@/components/Editable";

export default function PrivacyPage() {
  return (
    <LegalLayout
      pageKey="privacy"
      title="개인정보처리방침"
      updatedAt="2026년 8월 2일"
    >
      <section id="privacy-intro">
        <Editable id="privacy-intro-body-v2" as="p">
          모두의사업친구(이하 &ldquo;회사&rdquo;)는 「개인정보 보호법」 등 관련
          법령을 준수하며, 이용자의 개인정보를 안전하게 보호하기 위해 다음과 같은
          처리방침을 두고 있습니다.
        </Editable>
      </section>

      <section id="privacy-1">
        <h2 className="text-lg font-extrabold text-brand-dark">
          1. 수집하는 개인정보 항목
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            <b>무료 진단 시</b>: 사업 형태·업종·매출 규모·소재지 등 진단 응답
            정보 (진단 단계에서는 이름·연락처 등 개인 식별 정보를 수집하지
            않습니다)
          </li>
          <li>
            <b>회원가입·로그인 시</b>: 이메일 주소, 이름, 연락처(전화번호),
            소셜 로그인 식별 정보(<b>구글 로그인·카카오톡 로그인</b> 시 각
            서비스가 제공하는 계정 식별 정보 및 프로필 정보)
          </li>
          <li>
            <b>결제 시</b>: 결제 승인 정보(주문번호, 결제금액, 결제수단),
            이메일 주소 (카드번호 등 민감 결제정보는 회사가 저장하지 않으며
            결제대행사가 처리합니다)
          </li>
          <li>
            <b>자동 수집</b>: 서비스 이용 기록, 접속 로그, 브라우저 정보,
            쿠키, 기기 정보
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
          <li>
            서비스 이용 안내·매칭 결과 안내 등을 위한{" "}
            <b>카카오톡(알림톡·메시지) 발송</b>
          </li>
          <li>
            <b>서비스 만족도 설문조사</b>(카카오톡·이메일·<b>전화</b>) 및
            서비스 품질 개선
          </li>
          <li>
            신규·추가 상품 안내 등 <b>마케팅 정보 제공</b>(카카오톡·전화)
          </li>
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
          <li>
            표시·광고에 관한 기록: 6개월 (전자상거래법)
          </li>
          <li>
            접속 로그 등 서비스 이용 기록: 3개월 (통신비밀보호법)
          </li>
        </ul>
      </section>

      <section id="privacy-4">
        <h2 className="text-lg font-extrabold text-brand-dark">
          4. 개인정보의 제3자 제공
        </h2>
        <Editable id="privacy-4-body" as="p" className="mt-2">
          회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만,
          이용자가 <b>사전에 동의한 경우</b>에 한하여, 매칭·상담·연계 서비스 제공을
          위해 아래와 같이 제3자에게 제공할 수 있습니다. 이용자는 제3자 제공 동의를
          거부할 수 있으며, 거부 시 연계 서비스 이용이 제한될 수 있습니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            <b>제공받는 자</b>: 매칭된 정책금융기관 및 제휴{" "}
            <b>세무·행정·노무·관세·경영 파트너</b>
          </li>
          <li>
            <b>제공 항목</b>: 사업 형태·업종·매출 규모·소재지 등 진단 응답 정보,
            연계 상담에 필요한 연락처(동의 시)
          </li>
          <li>
            <b>제공 목적</b>: 맞춤형 지원사업 매칭 결과 안내, 세무·행정·노무·관세·경영
            분야 전문 상담 및 서비스 연계
          </li>
          <li>
            <b>보유·이용 기간</b>: 제공 목적 달성 시 또는 이용자의 동의 철회 시까지
          </li>
        </ul>
      </section>

      <section id="privacy-4b">
        <h2 className="text-lg font-extrabold text-brand-dark">
          5. 개인정보 처리의 위탁
        </h2>
        <Editable id="privacy-4b-body" as="p" className="mt-2">
          회사는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁할 수
          있으며, 위탁계약 시 「개인정보 보호법」 제26조에 따라 개인정보가 안전하게
          관리되도록 필요한 사항을 규정합니다. 위탁 내용이나 수탁자가 변경되는
          경우 본 처리방침을 통해 공개합니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>결제 처리: 결제대행사(PG)</li>
          <li>회원 인증·데이터 보관: 클라우드 인프라 제공사</li>
          <li>알림·메시지 발송: 카카오(알림톡·메시지) 등 메시지 발송 대행사</li>
        </ul>
      </section>

      <section id="privacy-5">
        <h2 className="text-lg font-extrabold text-brand-dark">
          6. 이용자 및 법정대리인의 권리와 행사 방법
        </h2>
        <Editable id="privacy-5-body-v2" as="p" className="mt-2">
          이용자는 언제든지 본인의 개인정보에 대한{" "}
          <b>열람·정정·삭제·처리정지</b>를 요청할 수 있으며, 회사는 관련 법령에
          따라 지체 없이 조치합니다. 요청은 아래 개인정보 보호책임자 연락처로
          해주시기 바랍니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            이용자는 개인정보 열람·정정·삭제·처리정지 요구권을 행사할 수 있으며,
            회사는 정당한 사유가 없는 한 이를 지체 없이 처리합니다.
          </li>
          <li>
            권리 행사는 서면·이메일 등을 통해 하실 수 있으며, 회사는 본인 여부를
            확인한 후 조치합니다.
          </li>
          <li>
            법정대리인이나 위임을 받은 자 등 대리인을 통하여 요구할 수도 있으며,
            이 경우 위임장을 제출하셔야 합니다.
          </li>
          <li>
            다른 법령에서 개인정보가 수집 대상으로 명시되어 있는 등의 경우에는
            삭제·처리정지 요구가 제한될 수 있습니다.
          </li>
        </ul>
      </section>

      <section id="privacy-consent">
        <h2 className="text-lg font-extrabold text-brand-dark">
          7. 마케팅·알림 수신 및 소셜 로그인 동의
        </h2>
        <Editable id="privacy-consent-body" as="p" className="mt-2">
          회사는 원활한 서비스 제공과 안내를 위해 아래 사항에 대한 이용자의
          동의를 받습니다. 각 동의는 <b>회원가입·결과조회·결제 단계</b>에서
          확인하며, 동의를 거부하실 수 있으나 이 경우 일부 서비스 이용이 제한될
          수 있습니다. <b>마케팅 정보 수신 동의(선택)</b>는 거부하셔도 서비스의
          핵심 기능 이용에는 영향이 없습니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            <b>소셜 로그인 이용 동의</b>: 구글 로그인·카카오톡 로그인을 통한
            회원 인증 및 계정 식별 정보 수집·이용
          </li>
          <li>
            <b>알림 수신 동의</b>: 서비스 이용 안내·매칭 결과 안내를 위한
            카카오톡(알림톡·메시지) 발송
          </li>
          <li>
            <b>마케팅 정보 수신 동의(선택)</b>: 서비스 만족도 설문조사 및
            신규·추가 상품 안내를 위한 <b>카카오톡·전화 연락</b>
          </li>
        </ul>
        <Editable id="privacy-consent-note" as="p" className="mt-3 text-sm text-brand-gray">
          ※ 이용자는 언제든지 마케팅 정보 수신 동의를 철회할 수 있으며, 아래 방법을
          통해 변경하실 수 있습니다.
        </Editable>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-brand-gray">
          <li>문자(SMS): 수신한 메시지에 포함된 [수신거부] 안내에 따라 처리</li>
          <li>카카오톡: 카카오톡 앱 &gt; 채널 관리 &gt; 모두의사업친구 &gt; 채널 차단</li>
          <li>
            이메일 요청: 개인정보 보호책임자(biospartners@naver.com)에게 철회 요청
          </li>
        </ul>
        <Editable id="privacy-consent-renotice" as="p" className="mt-3 text-sm text-brand-gray">
          ※ 회사는 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」에 따라 마케팅
          정보 수신 동의를 유지하는 경우 <b>2년마다</b> 수신 동의 유지 여부를
          이용자에게 알려드립니다.
        </Editable>
      </section>

      <section id="privacy-destroy">
        <h2 className="text-lg font-extrabold text-brand-dark">
          8. 개인정보의 파기 절차 및 방법
        </h2>
        <Editable id="privacy-destroy-body" as="p" className="mt-2">
          회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게
          되었을 때에는 지체 없이 해당 개인정보를 파기합니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            <b>파기 절차</b>: 파기 사유가 발생한 개인정보를 선정하고, 개인정보
            보호책임자의 확인을 거쳐 파기합니다.
          </li>
          <li>
            <b>파기 방법</b>: 전자적 파일 형태의 정보는 재생할 수 없는 기술적
            방법을 사용하여 삭제하며, 종이 문서는 분쇄하거나 소각하여 파기합니다.
          </li>
          <li>
            법령에 따라 보존해야 하는 경우에는 해당 개인정보를 별도의
            데이터베이스(DB)로 옮기거나 보관 장소를 달리하여 보존합니다.
          </li>
        </ul>
      </section>

      <section id="privacy-safety">
        <h2 className="text-lg font-extrabold text-brand-dark">
          9. 개인정보의 안전성 확보조치
        </h2>
        <Editable id="privacy-safety-body" as="p" className="mt-2">
          회사는 「개인정보 보호법」 제29조에 따라 개인정보의 안전성 확보를 위해
          다음과 같은 조치를 취하고 있습니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            <b>관리적 조치</b>: 개인정보 취급자 최소화 및 접근 권한 관리
          </li>
          <li>
            <b>기술적 조치</b>: 개인정보 전송 구간 암호화(SSL/TLS), 접근통제
            시스템 운영, 접속기록의 보관
          </li>
          <li>
            <b>물리적 조치</b>: 개인정보가 보관된 클라우드 인프라에 대한 접근
            통제
          </li>
        </ul>
      </section>

      <section id="privacy-child">
        <h2 className="text-lg font-extrabold text-brand-dark">
          10. 만 14세 미만 아동의 개인정보
        </h2>
        <Editable id="privacy-child-body" as="p" className="mt-2">
          본 서비스는 사업자(대표자)를 대상으로 하는 서비스로{" "}
          <b>만 14세 미만 아동의 회원가입을 받지 않으며</b>, 만 14세 미만 아동의
          개인정보를 수집하지 않습니다. 만약 만 14세 미만 아동의 개인정보가
          수집된 사실이 확인되는 경우 회사는 지체 없이 해당 정보를 파기합니다.
        </Editable>
      </section>

      <section id="privacy-remedy">
        <h2 className="text-lg font-extrabold text-brand-dark">
          11. 권익침해 구제 방법
        </h2>
        <Editable id="privacy-remedy-body" as="p" className="mt-2">
          이용자는 개인정보 침해로 인한 상담·분쟁 해결·피해 구제 등이 필요한
          경우 아래 기관에 문의하실 수 있습니다.
        </Editable>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>개인정보분쟁조정위원회 : 1833-6972 (www.kopico.go.kr)</li>
          <li>개인정보침해신고센터 : (국번 없이) 118 (privacy.kisa.or.kr)</li>
          <li>대검찰청 사이버수사과 : (국번 없이) 1301 (www.spo.go.kr)</li>
          <li>경찰청 사이버수사국 : (국번 없이) 182 (ecrm.police.go.kr)</li>
        </ul>
      </section>

      <section id="privacy-6">
        <h2 className="text-lg font-extrabold text-brand-dark">
          12. 개인정보 보호책임자
        </h2>
        <Editable id="privacy-6-body-v2" as="p" className="mt-2">
          회사는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보 처리와
          관련한 이용자의 문의·불만·피해 구제 등을 처리하기 위하여 아래와 같이
          개인정보 보호책임자를 지정하고 있습니다.
          <br />
          <br />
          상호: 모두의사업친구
          <br />
          개인정보 보호책임자: 신주엽
          <br />
          이메일: biospartners@naver.com
          <br />
          연락처: 1551-7886
        </Editable>
      </section>

      <section id="privacy-effective">
        <Editable
          id="privacy-effective-body"
          as="p"
          className="mt-6 text-sm text-brand-gray"
        >
          ※ 본 개인정보처리방침은 2026년 8월 2일부터 시행됩니다. 관련 법령·서비스
          변경에 따라 내용이 추가·삭제·수정될 수 있으며, 변경 시 서비스 내
          공지사항 또는 본 페이지를 통해 사전에 고지합니다.
        </Editable>
      </section>
    </LegalLayout>
  );
}
