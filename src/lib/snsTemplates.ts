// ────────────────────────────────────────────────────────────────
//  SNS 글쓰기 허브 - 채널별 공식 템플릿 (대표님 규칙 내장)
//  · 방식 A: AI 호출 없이 입력값을 검증된 템플릿에 끼워넣어 5채널 글 생성
//  · 규칙(PROJECT_MEMORY.md): 글에서 '·'(가운뎃점) 제거 / 복붙 가능 평문 / 채널별 노출로직 맞춤
//  · 이 파일만 고치면 허브 전체 글 품질이 유지됨 (직원이 폼만 채우면 됨)
// ────────────────────────────────────────────────────────────────

// 허브 입력값(직원이 폼에 채우는 항목)
export type SnsInput = {
  region: string; // 지역 (예: 인천, 인천 서구)
  title: string; // 사업명 (예: 2026 하반기 소진공 정책자금 융자)
  target: string; // 지원 대상 (예: 인천 관내 소상공인)
  targetExtra: string; // 대상 추가조건 (예: 신용보증 무점포기업은 업력 6개월 이상)
  usage: string; // 자금 용도 (예: 점포 시설 개선 또는 운영자금)
  amount: string; // 지원 한도 (예: 최대 5천만원)
  amountExtra: string; // 한도 추가조건 (예: 신용보증서 방식은 2천만원 한도)
  caution: string; // 주의사항 (예: 금리, 신청기간, 문의처는 공고문에 별도 안내)
  linkInpock: string; // 인스타/스레드용 링크 (인포크)
  linkHome: string; // 블로그/카카오/당근용 링크 (자사도메인)
  hashtags: string; // 해시태그(공백/쉼표 구분, 인스타는 앞 5개만 사용)
};

export const DEFAULT_INPUT: SnsInput = {
  region: "인천",
  title: "2026 하반기 소진공 정책자금 융자",
  target: "인천 관내 소상공인",
  targetExtra: "신용보증 무점포기업은 업력 6개월 이상",
  usage: "점포 시설 개선 또는 운영자금",
  amount: "최대 5천만원",
  amountExtra: "신용보증서 방식은 2천만원 한도",
  caution: "금리, 신청기간, 문의처는 공고문에 별도 안내됩니다. 신청 전 공고문 원문을 꼭 확인하세요.",
  linkInpock: "https://link.inpock.co.kr/ppfa25",
  linkHome: "https://모두의사업친구.kr",
  hashtags: "인천소상공인 소상공인정책자금 소진공융자 인천창업 모두의사업친구",
};

// ────────────────────────────────────────────────────────────────
//  ★핵심 규칙 헬퍼: 글에서 '·'(가운뎃점/middot) 제거 + AI 티 나는 문자 정리
//    대표님 반복 지시 - 절대 잊지 말 것
// ────────────────────────────────────────────────────────────────
export function stripMiddots(s: string): string {
  const cleaned = s
    // ── 대표님 지시: 사진 자리는 번호만. [사진1: 설명] / [사진 1 - 설명] / [사진1 표지…] → [사진1] ──
    .replace(/\[\s*사진\s*(\d+)[^\]]*\]/g, "[사진$1]")
    .replace(/\u00B7/g, ", ") // · (middle dot) → 쉼표
    .replace(/\u2027/g, ", ") // ‧ (hyphenation point)
    .replace(/\u30FB/g, ", ") // ・ (katakana middle dot)
    // ── 대표님 지시: 글머리/장식 특수기호 전면 제거 (AI가 실수로 넣어도 서버에서 청소) ──
    // 줄 맨 앞에 오는 글머리 기호는 통째로 제거, 문장 중간에 오면 공백으로.
    .replace(/^[ \t]*[▶▸▪►▷◆◇■□●○※★☆✓✔❖‣⁃»›]+[ \t]*/gm, "")
    .replace(/[▶▸▪►▷◆◇■□●○※★☆✓✔❖‣⁃»›]/g, "")
    .replace(/[ \t]*→[ \t]*/g, " ") // 화살표 → 공백
    .replace(/^[ \t]*>[ \t]+/gm, "") // 줄 앞 인용부호 '> '
    .replace(/\s*,\s*,\s*/g, ", ") // 중복 쉼표 정리
    .replace(/[ \t]{2,}/g, " ") // 중복 공백 정리
    .replace(/ ,/g, ",")
    .replace(/[ \t]+$/gm, ""); // 줄 끝 공백 제거
  return compactBlankLines(cleaned);
}

/**
 * 불필요한 세로 빈 줄을 대표님 수정본 규칙대로 압축한다.
 * (AI 결과·기본 템플릿 모두 stripMiddots를 거치므로 한 곳에서 일괄 적용)
 *
 * 규칙
 *  1) 연속 빈 줄 2개 이상 → 1개로 (문단 사이 간격은 빈 줄 1개만 유지)
 *  2) 소제목 [ ... ] 바로 아래 빈 줄 제거 → 제목과 첫 내용을 붙임
 *  3) 숫자 리스트(1. 2. 3.) 항목 사이 빈 줄 제거 → 붙임
 *  4) "핵심 정리"의 라벨 줄(제도명:, 목적: …) 사이 빈 줄 제거 → 붙임
 *  5) [사진N] 위에는 빈 줄 1개, 아래는 빈 줄 1개만 유지
 */
function compactBlankLines(input: string): string {
  const lines = input.replace(/\r\n/g, "\n").split("\n");

  const isBlank = (l?: string) => l === undefined || l.trim() === "";
  const isHeading = (l?: string) => !!l && /^\s*\[.*\]\s*$/.test(l.trim());
  const isPhoto = (l?: string) => !!l && /^\s*\[사진\d+\]\s*$/.test(l.trim());
  // "1. " "2) " 같은 숫자 리스트 항목
  const isListItem = (l?: string) =>
    !!l && /^\s*\d+\s*[.)]\s+\S/.test(l);
  // "제도명:" "지원 한도:" 처럼 라벨: 로 시작하는 핵심정리 줄
  const isLabelLine = (l?: string) =>
    !!l && /^\s*[^\s:][^:]{0,20}:\s*\S/.test(l);

  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isBlank(line)) {
      const prev = out[out.length - 1]; // 이미 확정된 직전 줄
      // 다음의 실제(비어있지 않은) 줄 찾기
      let j = i + 1;
      while (j < lines.length && isBlank(lines[j])) j++;
      const next = lines[j];

      // 이전이 소제목이면 → 바로 아래 빈 줄 제거 (제목 붙이기)
      if (isHeading(prev) && !isPhoto(prev)) continue;
      // 리스트 항목 사이 빈 줄 제거 (양쪽이 리스트일 때)
      if (isListItem(prev) && isListItem(next)) continue;
      // 핵심정리 라벨 줄 사이 빈 줄 제거 (양쪽이 라벨일 때)
      if (isLabelLine(prev) && isLabelLine(next)) continue;
      // 연속 빈 줄은 1개로 (직전이 이미 빈 줄이면 스킵)
      if (isBlank(prev)) continue;
      // 그 외에는 빈 줄 1개 유지
      out.push("");
      continue;
    }

    out.push(line);
  }

  // 앞뒤 빈 줄 정리
  return out.join("\n").replace(/^\n+/, "").replace(/\n+$/, "").trimEnd();
}

// ────────────────────────────────────────────────────────────────
//  한글 조사 자동 처리 (받침 유무에 따라 은/는, 이/가, 을/를 등)
//    예: josa("융자", "은/는") → "융자는", josa("자금", "은/는") → "자금은"
// ────────────────────────────────────────────────────────────────
export function hasBatchim(word: string): boolean {
  if (!word) return false;
  const ch = word[word.length - 1];
  const code = ch.charCodeAt(0);
  // 한글 음절 영역 안에서 종성(받침) 존재 여부
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 !== 0;
  }
  // 숫자로 끝나면 발음 기준 받침 여부 (0,1,3,6,7,8=받침 / 2,4,5,9=없음)
  if (/[0-9]$/.test(word)) {
    return ["0", "1", "3", "6", "7", "8"].includes(ch);
  }
  return false; // 영문/기타는 받침 없는 것으로 처리
}

export function josa(word: string, pair: string): string {
  const [withB, withoutB] = pair.split("/");
  return `${word}${hasBatchim(word) ? withB : withoutB}`;
}

// 해시태그 문자열 → 배열 (# 제거, 공백/쉼표 분리)
export function parseHashtags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean);
}

// 채널별 생성 결과 한 블록
export type SnsBlock = {
  key: string;
  label: string; // 화면 표시용 제목
  hint?: string; // 짧은 안내(선택)
  text: string; // 복사될 실제 본문
};

// ────────────────────────────────────────────────────────────────
//  1) 인스타그램 - 캐러셀 카드 8장 문구 + 캡션 + 해시태그
//     정체성: 정보를 직접 정리해 알려주는 공식 플랫폼 (제3자 위장 X, 기호 X)
// ────────────────────────────────────────────────────────────────
function buildInstagram(i: SnsInput): SnsBlock[] {
  const tags = parseHashtags(i.hashtags).slice(0, 5); // 인스타 2026: 해시태그 5개 제한
  const hashtagLine = tags.map((t) => `#${t}`).join(" ");

  const cards = [
    `[카드 1 - 표지]
${i.region} 사장님
이 자금 모르고 지나가면 손해입니다

${i.title}
지금 신청 열렸습니다`,
    `[카드 2]
정책자금은 대기업만 받는 것

가장 흔한 오해입니다
오히려 규모가 크지 않은
소상공인을 위한 제도입니다`,
    `[카드 3]
어떤 자금인가요

${i.title}
${josa(i.target, "이면/면")} 신청 대상입니다`,
    `[카드 4]
얼마까지 받을 수 있나요

${i.amount}
${i.amountExtra ? i.amountExtra : ""}`,
    `[카드 5]
어디에 쓸 수 있나요

${i.usage}

시설 개선도, 운영자금도 가능합니다`,
    `[카드 6]
신청 대상

${i.target}
${i.targetExtra ? i.targetExtra : ""}

생각보다 문턱이 높지 않습니다`,
    `[카드 7]
신청 전 꼭 확인하세요

${i.caution}`,
    `[카드 8 - CTA]
내 업종도 되는지 궁금하다면

사업자번호만 넣으면 30초
AI가 맞는 자금을 찾아드립니다

지금은 오픈 베타로 무료입니다
프로필 하단 링크에서 진단해보세요

모두의사업친구`,
  ].join("\n\n");

  const caption = `안녕하세요 대표님, 정부지원사업 AI 통합 매칭 플랫폼 모두의사업친구입니다.

${i.region} 소상공인 사장님들이 놓치기 쉬운 자금이 있어 정리해드립니다.

${josa(i.title, "이/가")} 열렸습니다. ${josa(i.target, "이면/면")} ${i.amount}까지 신청할 수 있습니다.

${i.usage} 용도로 사용할 수 있습니다. ${i.caution}

내 업종이 해당되는지 확인하고 싶다면, 사업자번호만 넣으면 30초 만에 AI가 맞는 자금을 찾아드립니다. 지금은 오픈 베타로 무료입니다.

이 게시물을 저장해두고 신청 전에 다시 확인하세요. 주변 ${i.region} 사장님 한 분에게도 공유해주시면 좋습니다.

진단은 프로필 하단 링크에서 하실 수 있습니다.`;

  return [
    {
      key: "ig-cards",
      label: "인스타그램 - 캐러셀 카드 8장 문구",
      hint: "카드 이미지에 넣을 텍스트입니다. (이미지는 다크네이비+골드 스타일로 별도 제작)",
      text: stripMiddots(cards),
    },
    {
      key: "ig-caption",
      label: "인스타그램 - 캡션",
      hint: "게시물 본문에 붙여넣기",
      text: stripMiddots(caption),
    },
    {
      key: "ig-hashtags",
      label: "인스타그램 - 해시태그 (5개)",
      hint: "인스타 2026 정책상 5개까지만",
      text: hashtagLine,
    },
    {
      key: "ig-link",
      label: "인스타그램 - 프로필 링크 (처음 1번만 설정)",
      hint: "프로필 편집 > 링크 칸에 입력",
      text: i.linkInpock,
    },
  ];
}

// ────────────────────────────────────────────────────────────────
//  2) 스레드 - 이어달기(체인) 5개
// ────────────────────────────────────────────────────────────────
function buildThreads(i: SnsInput): SnsBlock[] {
  const chain = `[본문 - 1번째 게시물 (여기가 훅, 제일 중요)]
${i.region}에서 장사하면서 정책자금 한 번도 안 받아보셨나요

그렇다면 놓치고 있는 자금이 있을 수 있습니다

${josa(i.title, "이/가")} 열렸습니다. ${i.amount}까지 가능합니다
왜 많은 사장님이 이걸 지나치는지 아래에서 정리해드릴게요


[이어달기 - 2번째]
이유는 단순합니다

나는 안 될 것 같아서
서류가 복잡할 것 같아서
대기업만 받는 것 같아서

대부분 오해입니다
${josa(i.target, "이면/면")} 신청 대상입니다


[이어달기 - 3번째]
조건을 정리하면 이렇습니다

신청 대상 ${i.target}${i.targetExtra ? `\n조건 ${i.targetExtra}` : ""}
자금 용도 ${i.usage}
지원 한도 ${i.amount}${i.amountExtra ? `\n한도 조건 ${i.amountExtra}` : ""}

생각보다 해볼 만하지 않으신가요


[이어달기 - 4번째]
신청 전에 이것만은 확인하세요

금리 몇 프로다, 이번 주까지다 같은
확인 안 된 이야기에 흔들리지 마세요

${i.caution}
공고문 원문을 직접 확인하는 것이 가장 안전합니다


[이어달기 - 5번째 (마지막, 링크 + 질문)]
그래서 내 업종도 되는지 궁금하시다면

사업자번호만 넣으면 30초 만에 확인됩니다
AI가 맞는 자금을 찾아드립니다. 지금은 무료입니다

프로필 하단 링크에서 진단해보세요

궁금한 점은 댓글에 남겨주시면 정리해서 답변드리겠습니다`;

  const thTags = `#정부지원사업 #모두의사업친구 #${(i.region || "인천").replace(/\s/g, "")} #소상공인`;

  return [
    {
      key: "th-chain",
      label: "스레드 - 이어달기 5개 (본문 + 이어달기 4)",
      hint: "본문 올리고 '스레드에 추가'로 순서대로 이어붙이기. 첫 30분 댓글 답변이 도달의 핵심.",
      text: stripMiddots(chain),
    },
    { key: "th-hashtags", label: "해시태그", hint: "3~5개만 담백하게.", text: stripMiddots(thTags) },
  ];
}

// ────────────────────────────────────────────────────────────────
//  3) 네이버 블로그 - SEO 롱폼
// ────────────────────────────────────────────────────────────────
function buildBlog(i: SnsInput): SnsBlock[] {
  const region = i.region || "우리 지역";
  const regionTag = (i.region || "인천").replace(/\s/g, "");
  const blogTitle = `${i.title} 완벽 가이드 (${region} 소상공인 신청 자격부터 주의사항까지)`;

  const body = `안녕하세요 대표님!
정부지원사업 AI 통합 매칭 플랫폼
모두의사업친구입니다.


${region}에서 사업을 운영하며
사업에 필요한 자금이 부족하신가요?
좋은 조건으로 자금을 마련하고 싶으신가요?

이 정부지원사업은 ${region} 소상공인의
사업 안정과 성장을 지원하는 실용적인 지원사업입니다.
오늘은 신청 자격부터 조건, 절차, 주의사항까지
하나씩 정리해드리겠습니다.

[사진1]


이 정부지원사업은 무엇인가

${josa(i.title, "은/는")} ${josa(i.target, "이/가")} 사업에 필요한 자금을
좋은 조건으로 마련할 수 있도록 지원하는 정부지원사업입니다.
규모가 큰 기업이 아니라,
오히려 규모가 크지 않은 소상공인을 위해
마련된 지원사업이라는 점이 핵심입니다.


이 정부지원사업의 특징

낮은 진입 문턱
${josa(i.target, "이면/면")} 신청 대상이 됩니다. 생각보다 문턱이 높지 않습니다.

넓은 자금 용도
${i.usage} 목적으로 폭넓게 활용할 수 있습니다.

실질적인 지원 규모
${i.amount} 한도로 실제 사업에 도움이 되는 수준입니다.

[사진2]


지원 대상 및 신청 자격

${josa(i.target, "이/가")} 기본 대상입니다.${i.targetExtra ? `\n추가 조건: ${i.targetExtra}` : ""}

나는 규모가 작아서 안 될 것 같다고 지레 포기하는 사장님이 많은데, 이 제도는 오히려 규모가 크지 않은 사업자를 위한 제도라는 점을 기억하세요.

[사진3]


자금 용도

${i.usage} 목적으로 활용할 수 있습니다.

[사진4]


지원 조건 및 한도

자금 용도: ${i.usage}
지원 한도: ${i.amount}${i.amountExtra ? `\n한도 조건: ${i.amountExtra}` : ""}

금리와 신청 기간, 방식에 따른 세부 한도는 상황에 따라 달라질 수 있으니 본인 조건에 맞는 방식을 신청 전에 확인하시기 바랍니다.

[사진5]


신청 절차 및 방법

1. 공고문 원문에서 신청 자격과 기간을 확인합니다.
2. 필요 서류를 준비합니다.
3. 주관 기관 접수처를 통해 신청합니다.
4. 심사가 진행됩니다.
5. 승인 후 자금을 사용합니다.

[사진6]


신청 전 반드시 확인할 사항

가장 중요한 부분입니다. ${i.caution} 인터넷에 떠도는 정보는 정확하지 않을 수 있으니, 반드시 공고문 원문을 직접 확인한 뒤 신청하시기 바랍니다.

[사진7]


내 사업장에 맞는 정책자금이 궁금하다면

사실 ${region} 소상공인이 받을 수 있는 정책자금은 이 제도 하나만 있는 것이 아닙니다. 업종과 매출 규모, 사업 연차에 따라 받을 수 있는 자금이 제각각입니다.

문제는 이걸 일일이 찾아보기가 너무 어렵다는 점입니다. 그래서 모두의사업친구는 사업자번호만 넣으면 AI가 받을 수 있는 정책지원사업을 전부 찾아주는 진단 서비스를 운영하고 있습니다. 30초면 내가 받을 수 있는 자금을 확인할 수 있습니다.

원래 39,900원인 진단을
지금은 오픈 베타로 무료 제공하고 있습니다.
정부지원사업 AI 통합 매칭 서비스로
알맞는 공고를 찾아드리고 신청 포인트까지 정리해드립니다.

[사진8]


마무리

${josa(i.title, "은/는")} 단순한 정책 지원이 아닙니다. ${region}에서 애쓰시는 사장님들이 안정적으로 사업을 이어가고 성장하도록 돕는 지원입니다.

${region}에서 사업을 하고 계신다면, 필요한 자금이 있다면 ${josa(i.title, "으로/로")} 든든한 사업 기반을 마련하세요!


핵심 정리

제도명: ${i.title}
지원 대상: ${i.target}
자금 용도: ${i.usage}
지원 한도: ${i.amount}
확인 사항: ${i.caution}
맞춤 진단: 사업자번호만 넣으면 30초, 현재 오픈 베타 무료


내 사업장이 자격 조건에 해당되는지 아래에서 확인해보세요.
${i.linkHome}

사업자번호와 간단한 정보만 입력하시면 정부지원사업
AI 통합 매칭 서비스로 알맞는 공고를 찾아드리고
신청 포인트까지 정리해드립니다.`;

  const blogTags = `#${regionTag} #${regionTag}소상공인 #${regionTag}정책자금 #소상공인정책자금 #소상공인지원 #소상공인융자 #운영자금 #시설자금 #정부지원사업 #정책자금 #루원시티 #모두의사업친구 #모사친`;

  return [
    { key: "blog-title", label: "블로그 - 제목", text: stripMiddots(blogTitle) },
    { key: "blog-body", label: "블로그 - 본문", hint: "오프닝 3줄, 질문 후킹, 제도 소개, 3대 특징, 대상, 조건, 절차, 주의사항, 마무리, 핵심정리, CTA 순서입니다. 사진 자리에 썸네일과 카드 이미지를 넣으면 검색 노출이 좋아집니다.", text: stripMiddots(body) },
    { key: "blog-tags", label: "블로그 - 태그", text: stripMiddots(blogTags) },
  ];
}

// ────────────────────────────────────────────────────────────────
//  4) 카카오톡 채널 - 클릭 유도 짧게
// ────────────────────────────────────────────────────────────────
function buildKakao(i: SnsInput): SnsBlock[] {
  const text = `안녕하세요 대표님, 모두의사업친구입니다.

${i.region} 사장님들이 놓치기 쉬운 자금이 있어 정리해 알려드립니다.

${i.title}
신청 대상 ${i.target}
자금 용도 ${i.usage}
지원 한도 ${i.amount}

${i.caution}

내 업종도 되는지 궁금하시다면 사업자번호만 넣으면 30초, 지금은 오픈 베타로 무료입니다.

${i.linkHome}`;

  const kakaoTitle = `${i.region} 사장님, ${i.title} 안내드립니다`;

  return [
    { key: "kakao-title", label: "소식 제목", hint: "목록에서 클릭을 부르는 짧은 제목.", text: stripMiddots(kakaoTitle) },
    { key: "kakao", label: "카카오톡 채널 글", hint: "구독자에게 알림이 갑니다. 낮~저녁에 보내면 좋아요.", text: stripMiddots(text) },
  ];
}

// ────────────────────────────────────────────────────────────────
//  5) 당근 - 동네 이웃 톤 (광고티 X)
// ────────────────────────────────────────────────────────────────
function buildDaangn(i: SnsInput): SnsBlock[] {
  const text = `${i.region}에서 사업하시는 사장님들께 알려드립니다.

정부지원사업 매칭 플랫폼 모두의사업친구입니다. 우리 동네 사장님들이 놓치기 쉬운 자금이 있어 정리해드립니다.

${josa(i.title, "이/가")} 열렸습니다. ${josa(i.target, "이면/면")} 신청할 수 있습니다.

${i.usage} 용도로 ${i.amount}까지 가능합니다.${i.amountExtra ? ` (${i.amountExtra})` : ""}

${i.caution} 인터넷에 떠도는 이야기 말고 공고문 원문을 꼭 확인하세요.

내 업종도 해당되는지 궁금하시면 사업자번호만 넣으면 30초 만에 확인됩니다. 지금은 오픈 베타로 무료입니다. 필요하신 사장님들 참고하세요.

${i.linkHome}`;

  const daangnTitle = `${i.region} 사장님 정책자금 정보 알려드려요`;
  const daangnTags = `#${(i.region || "인천").replace(/\s/g, "")} #소상공인 #정부지원금 #모두의사업친구`;

  return [
    { key: "daangn-title", label: "제목", hint: "이웃이 궁금해할 정보성 제목.", text: stripMiddots(daangnTitle) },
    { key: "daangn", label: "당근 글", hint: "동네생활 탭에 올리세요. 우리는 정보를 정리해 알려주는 공식 플랫폼 톤입니다.", text: stripMiddots(text) },
    { key: "daangn-hashtags", label: "해시태그", hint: "3~5개만 담백하게.", text: stripMiddots(daangnTags) },
  ];
}

// 채널 묶음 결과
export type SnsChannel = {
  channel: string;
  emoji: string;
  depth: "심층" | "간단";
  blocks: SnsBlock[];
};

// 대표님 지침: SNS 글쓰기 허브는 항상 네이버 블로그 글만 생성한다.
// (인스타/스레드/카카오/당근은 더 이상 출력하지 않음)
export function buildAllChannels(i: SnsInput): SnsChannel[] {
  return [
    { channel: "네이버 블로그", emoji: "📝", depth: "심층", blocks: buildBlog(i) },
  ];
}

// ────────────────────────────────────────────────────────────────
//  채널별 업로드 설명서 (직원용)
// ────────────────────────────────────────────────────────────────
export const UPLOAD_GUIDES: { channel: string; emoji: string; steps: string[] }[] = [
  {
    channel: "네이버 블로그",
    emoji: "📝",
    steps: [
      "네이버 블로그 > '글쓰기'",
      "'블로그 - 제목' 복사해서 제목 칸에 붙여넣기",
      "'블로그 - 본문' 복사해서 본문에 붙여넣기 ([사진N] 자리에 썸네일/카드 이미지 삽입)",
      "'블로그 - 태그' 복사해서 태그 칸에 붙여넣고 '발행'",
    ],
  },
];

// 업로드 순서 추천 (네이버 블로그 전용)
export const UPLOAD_ORDER = [
  "네이버 블로그 - 제목, 본문([사진N] 자리에 썸네일 삽입), 태그 순으로 붙여넣고 발행",
];

// 썸네일 제작 가이드 (직원 참고용 - 대표님 규칙)
export const THUMBNAIL_GUIDE = [
  "다크 네이비 + 골드 럭셔리 톤 고정 (파랑/초록 금지)",
  "골드 타이틀 2줄 + 흰색 서브타이틀",
  "하단: 도시 야경 + 모두의사업친구 로고",
  "블로그 본문 [사진1~8] 자리에 카드 8장을 순서대로 삽입",
];
