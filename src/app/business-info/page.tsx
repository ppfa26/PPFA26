"use client";

import LegalLayout from "@/components/LegalLayout";
import Editable from "@/components/Editable";

const ROWS: { label: string; id: string; value: string }[] = [
  { label: "상호", id: "biz-name", value: "모두의사업친구" },
  { label: "대표자명", id: "biz-ceo", value: "신주엽" },
  { label: "사업자등록번호", id: "biz-regno", value: "597-12-02897" },
  { label: "통신판매업 신고번호", id: "biz-mailorder", value: "제2026-인천서해-0109호" },
  {
    label: "사업장 주소",
    id: "biz-address",
    value: "인천광역시 서해구 청라커낼로288번길 26, 285호",
  },
  { label: "전화번호", id: "biz-tel", value: "1551-7886" },
  { label: "이메일", id: "biz-email", value: "biospartners@naver.com" },
  { label: "업종", id: "biz-type", value: "응용 소프트웨어 개발 및 공급업" },
  { label: "서비스 제공기간", id: "biz-period", value: "결제일로부터 1개월" },
  {
    label: "서비스의 범위",
    id: "biz-scope",
    value: "결제 아이디당 1개의 사업장 매칭 및 조회 서비스",
  },
];

export default function BusinessInfoPage() {
  return (
    <LegalLayout
      pageKey="business-info"
      title="사업자정보"
      updatedAt="2026년 7월 15일"
    >
      <section id="business-table">
        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-gray-100">
              {ROWS.map((row) => (
                <tr key={row.id} className="align-top">
                  <th className="w-36 bg-gray-50 px-4 py-3.5 font-semibold text-brand-gray sm:w-44">
                    {row.label}
                  </th>
                  <td className="px-4 py-3.5">
                    <Editable id={row.id} as="span" className="text-brand-dark">
                      {row.value}
                    </Editable>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="business-notice">
        <h2 className="text-lg font-extrabold text-brand-dark">
          서비스 성격 고지
        </h2>
        <Editable id="business-notice-body" as="p" className="mt-2">
          본 서비스는 정부지원사업에 대한 <b>정보 제공 서비스</b>입니다. 회사는
          승인·선정을 <b>보장하지 않으며</b>, 관련 안내 이용약관,
          개인정보처리방침, 환불정책은 사이트 하단 링크에서 확인하실 수 있습니다.
        </Editable>
      </section>

      <section id="business-links">
        <h2 className="text-lg font-extrabold text-brand-dark">관련 안내</h2>
        <Editable id="business-links-body" as="p" className="mt-2">
          이용약관, 개인정보처리방침, 환불정책은 사이트 하단 링크에서 확인하실 수
          있습니다.
        </Editable>
      </section>
    </LegalLayout>
  );
}
