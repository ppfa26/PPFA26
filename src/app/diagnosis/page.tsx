import { redirect } from "next/navigation";

// 홈페이지 기본 진단을 채팅형으로 전환.
// 기존 /diagnosis 로 들어오는 모든 링크(홈 CTA·헤더·푸터·매칭·마이페이지·관리자 복사링크 등)를
// 자동으로 채팅형 진단(/diagnosis-chat)으로 보낸다.
// 기존 폼형 진단은 /diagnosis-form 에 보존되어 있음(필요 시 즉시 복구 가능).
export default function DiagnosisRedirect() {
  redirect("/diagnosis-chat");
}
