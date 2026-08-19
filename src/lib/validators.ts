// ── (대표님 요청) 성함·연락처 '막쓰기' 방어 검증 (공용) ────────────────
//  무료진단 chat/form 두 곳에서 동일하게 사용.
//  가짜 이름("000", "ㅁㅁ", "12")·엉터리 번호("000 000000000", "01000000000")로
//  결과를 열람하는 어뷰징을 막는다. 통과 조건을 만족해야만 다음으로 넘어간다.
//  ※ 저장 form 값 구조·매칭 로직과 무관(입력값 유효성만 검사).

// 이름: 한글 2자 이상(성+이름) 또는 영문 2자 이상. 숫자/기호/반복문자 차단.
export function isValidName(raw: string): boolean {
  const name = (raw || "").trim();
  if (name.length < 2) return false;
  // 숫자가 하나라도 있으면 무효(이름에 숫자 X)
  if (/[0-9]/.test(name)) return false;
  // 허용 문자: 완성형 한글 · 영문 · 공백(외국인 성/이름 사이). 그 외(기호·자모 ㅁㅁ 등) 차단.
  if (!/^[가-힣a-zA-Z\s]+$/.test(name)) return false;
  const compact = name.replace(/\s/g, "");
  if (compact.length < 2) return false;
  // 같은 글자만 반복("가가", "aaa", "ㅁㅁ"→위에서 이미 컷)된 값 차단
  if (new Set(compact.split("")).size < 2) return false;
  return true;
}

// 연락처: 국내 휴대폰 010으로 시작하는 11자리. 반복 등 명백한 가짜번호 차단.
export function isValidPhone(raw: string): boolean {
  const d = (raw || "").replace(/[^0-9]/g, "");
  // 반드시 010 + 8자리 = 11자리
  if (!/^010\d{8}$/.test(d)) return false;
  const rest = d.slice(3); // 010 뒤 8자리
  // 뒤 8자리가 전부 같은 숫자(00000000 등)면 가짜
  if (new Set(rest.split("")).size < 2) return false;
  return true;
}
