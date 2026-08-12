import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  buildAllChannels,
  DEFAULT_INPUT,
  stripMiddots,
  type SnsInput,
  type SnsChannel,
} from "@/lib/snsTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ────────────────────────────────────────────────────────────────
//  SNS 글쓰기 허브 - AI 자동 생성 API
//   POST { source, region?, amount?, emphasis?, linkInpock?, linkHome? }
//     - source: 공고 링크(http...) 또는 공고 내용(텍스트) 둘 다 허용
//     - 링크면 서버가 본문을 읽어와 요약, 실패하면 그대로 텍스트로 사용
//   응답: { channels: SnsChannel[], mode: "ai" | "fallback", note? }
//
//   대표님 규칙(PROJECT_MEMORY.md) 프롬프트에 내장:
//     · 가운뎃점(·) 금지 / 복붙 가능 평문 / 채널별 노출로직 맞춤
//     · 스레드 500자 이어달기 / 인포크(인스타·스레드)·자사도메인(블로그·카카오·당근) 링크 분기
//     · 억지 표현 금지, 승인 보장 금지
// ────────────────────────────────────────────────────────────────

// 대표님 실제 운영 방식: 모두의사업친구.kr 직접 노출.
// 인스타/스레드는 링크 클릭이 안 되므로 "프로필 하단 클릭"으로 유도.
const DEFAULT_LINK_HOME = "https://모두의사업친구.kr";
const DEFAULT_LINK_INPOCK = DEFAULT_LINK_HOME; // 하위호환용(더는 인포크 안 씀)

// 대표님 지정 고정 마무리 멘트(블로그/카카오/당근 CTA에 그대로 사용).
// "행정대행 아님/수수료 0원" 같은 방어성 문구 대신 긍정형 안내만 사용.
const CLOSING_LINE = `사업자번호와 간단한 정보만 입력하시면 정부지원사업
AI 통합 매칭 서비스로 알맞는 공고를 찾아드리고
신청 포인트까지 정리해드립니다.`;

function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// 링크면 본문을 가볍게 읽어온다(실패해도 무시)
async function fetchLinkText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const text = stripHtml(html);
    return text.slice(0, 6000);
  } catch {
    return "";
  }
}

// AI가 돌려준 JSON을 SnsChannel[] 로 안전 변환 + 가운뎃점 제거
// 대표님 지침: 네이버 블로그 채널만 남긴다.
function normalizeChannels(raw: any): SnsChannel[] | null {
  if (!raw || !Array.isArray(raw.channels)) return null;
  const out: SnsChannel[] = [];
  for (const ch of raw.channels) {
    if (!ch || !Array.isArray(ch.blocks)) continue;
    if (String(ch.channel || "") !== "네이버 블로그") continue; // 블로그만
    out.push({
      channel: String(ch.channel || ""),
      emoji: String(ch.emoji || ""),
      depth: ch.depth === "심층" ? "심층" : "간단",
      blocks: ch.blocks
        .filter((b: any) => b && typeof b.text === "string")
        .map((b: any) => ({
          key: String(b.key || Math.random().toString(36).slice(2)),
          label: String(b.label || ""),
          hint: b.hint ? String(b.hint) : undefined,
          text: stripMiddots(String(b.text)), // 규칙: · 최종 제거 보증
        })),
    });
  }
  return out.length > 0 ? out : null;
}

export async function POST(req: NextRequest) {
  try {
    // ── 남용 방지(중요) ──────────────────────────────────────────
    //  OpenAI(유료) 호출 + 외부 링크 본문 크롤링까지 하므로 자원 소모가 크다.
    //  IP 기준 1분 6회로 제한(관리자 SNS 허브에서 사람이 쓰는 속도엔 충분).
    const blocked = enforceRateLimit(
      req,
      { namespace: "sns", windowMs: 60_000, max: 6 },
      "SNS 생성 요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요."
    );
    if (blocked) return blocked;

    const body = await req.json().catch(() => ({}));
    const source: string = String(body.source || "").trim();
    const region: string = String(body.region || "").trim();
    const amount: string = String(body.amount || "").trim();
    const emphasis: string = String(body.emphasis || "").trim();
    const linkInpock: string =
      String(body.linkInpock || "").trim() || DEFAULT_LINK_INPOCK;
    const linkHome: string =
      String(body.linkHome || "").trim() || DEFAULT_LINK_HOME;

    if (!source) {
      return NextResponse.json(
        { error: "공고 링크나 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    // 링크면 본문 읽어오기
    let material = source;
    let linkNote = "";
    const isUrl = /^https?:\/\//i.test(source);
    if (isUrl) {
      const fetched = await fetchLinkText(source);
      if (fetched && fetched.length > 200) {
        material = `아래는 공고 링크(${source})에서 읽어온 내용입니다.\n\n${fetched}`;
      } else {
        material = `공고 링크: ${source}\n(본문 자동 읽기에 실패했습니다. 링크 주소만으로 최대한 작성하되, 확실하지 않은 수치는 지어내지 마세요.)`;
        linkNote =
          "링크 본문을 자동으로 못 읽었습니다. 더 정확한 글을 원하시면 공고 내용을 직접 붙여넣어 주세요.";
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL; // 자체 프록시 쓸 때만

    // ── AI 사용 가능하면 생성 ──
    if (apiKey && apiKey !== "__INJECTED_AT_RUNTIME__") {
      try {
        const client = new OpenAI(
          baseURL ? { apiKey, baseURL } : { apiKey }
        );

        const system = `당신은 '모두의사업친구'(정부지원사업 AI 통합 매칭 플랫폼, 인천 청라 소재)의 공식 채널 운영자입니다. 이 계정은 정부지원사업 정보를 직접 조사해 사장님들께 정리해 알려주는 공식 플랫폼입니다. 아래 규칙에 따라 네이버 블로그 글 1개만 완성합니다. (인스타/스레드/카카오/당근은 만들지 마세요.)

━━━━━━━━━━━━━━━━━━━━━━━━
■ 정체성 (전 채널 공통, 매우 중요)
━━━━━━━━━━━━━━━━━━━━━━━━
- 우리는 이 정보를 "직접 정리해서 알려주는 공식 계정"이다. 절대로 제3자인 척, 우연히 알게 된 이웃인 척하지 말 것.
- 금지 표현: "저도 알아보다 알게 됐다", "아는 곳이 있어서", "우연히 발견", "이런 게 있더라고요"처럼 정체를 숨기는 말투 전면 금지.
- 올바른 정체: "저희가 정리해드립니다", "안내해드립니다", "확인해보세요"처럼 정보를 정리해주는 운영자 톤. 당당하고 신뢰감 있게.
- 채널별 말투(정중체/편한 어투)는 달라도, 정체는 항상 "정보를 정리해 알려주는 모두의사업친구"로 일관.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 기호 사용 규칙 (매우 중요, 대표님 지정)
━━━━━━━━━━━━━━━━━━━━━━━━
- [금지] 다음 기호는 절대 쓰지 말 것: ▶ ▸ ▪ ▶︎ ● ◆ ■ □ ○ · ・ ‧ » ※ ★ ☆ ✓ ✔ ↳ → 및 마크다운 기호(**, ##, 리스트용 * 또는 머리표 -).
- [금지] 이모지(📌 ✅ 💰 📋 😊 등)는 블로그 본문에 절대 쓰지 말 것. 이모지를 쓰면 AI가 쓴 티가 나서 신뢰가 떨어진다.
- [허용] 가독성을 위한 구분에는 아래 "일반 문자 기호"만 절제해서 사용한다. 이것들은 이모지가 아니라 담백한 텍스트 기호라 허용한다.
   1. 대괄호 [ ]  : 섹션 제목이나 항목명을 감쌀 때. 예: [ 지원 대상 및 신청 자격 ]
   2. 홑화살괄호 < >  : 소제목이나 목차 구분에. 예: < 신청 절차 >
   3. 소괄호 ( )  : 짧은 부연 설명에. 예: 지원 한도 (최대 5천만원)
   4. 하이픈 - : 구분선 용도로만. 예: 섹션과 섹션 사이에 " - - - - - " 한 줄. (문장 머리표로는 쓰지 말 것.)
- 위 4종류를 남발하지 말고, "제목/목차/구분선"에만 절제해서 쓴다. 본문 문장 안에서는 평소처럼 자연스러운 글로 쓴다.
- 각 섹션 제목은 [ ] 또는 < > 로 감싸 눈에 띄게 하되, 한 글에서 스타일을 섞지 말고 하나로 통일한다(예: 모든 섹션 제목을 [ ] 로).
- 항목 나열이 필요하면 "숫자."(1. 2. 3.) 또는 줄바꿈으로. 가운뎃점(·)은 쉼표로 대체.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 브랜드 팩트 (이 안에서만 사용, 지어내기 금지)
━━━━━━━━━━━━━━━━━━━━━━━━
- 사업자번호만 넣으면 30초 진단 (진입 문턱 0)
- 원래 39,900원, 지금은 오픈 베타 무료
- 정부지원사업 AI 통합 매칭 서비스로 맞는 공고를 찾아주고 신청 포인트를 정리해준다.
- 절대 쓰지 말 것: "행정대행 아님", "수수료 0원", "대출 상담 아님" 같은 부정형/방어성 문구. 우리가 무엇이 아닌지를 설명하지 말고, 무엇을 해주는지만 긍정형으로 쓴다.
- 공고에 없는 수치(금리, 한도, 마감일)는 절대 지어내지 말 것. 모르면 "공고문에서 확인"으로 안내.
- 작성자 개인 이력(군 출신, 컨설턴트 경력, 승인 건수, 실적 금액 등) 절대 언급 금지.
- "100% 승인" "무조건" 같은 보장 표현 금지.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 링크 규칙
━━━━━━━━━━━━━━━━━━━━━━━━
- 네이버 블로그: 본문 CTA에 자사 주소 ${linkHome} 직접 노출.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 채널별 작성법
━━━━━━━━━━━━━━━━━━━━━━━━

【네이버 블로그 - 우리의 대표 글 형식. 아래 구조를 반드시 그대로 따를 것】
이 형식이 우리 블로그의 표준입니다. 순서와 구성을 지키되, 위 "기호 사용 규칙"에 따라 섹션 제목은 [ ] 또는 < > 로 감싸 가독성 있게 표현하세요(금지 기호와 이모지는 여전히 사용 금지).
1. 오프닝(고정): 아래 3줄을 그대로 넣고 시작.
   안녕하세요 대표님!
   정부지원사업 AI 통합 매칭 플랫폼
   모두의사업친구입니다.
2. 질문형 후킹: "~하고 계신가요?" "~필요하신가요?" "~찾고 계신가요?" 형태의 짧은 질문을 "딱 2개만" 줄바꿈으로 연달아. (4개는 너무 많으니 2개만.) 사장님의 상황을 콕 집어 공감시키기.
3. 본문 섹션(공고 자료에 있는 항목만, 순서대로. 각 섹션 제목은 [ ] 로 감싼 한 줄 제목으로. 예: [ 지원 대상 및 신청 자격 ]):
   - 이 정부지원사업은 무엇인가 (한두 문단 설명. "제도/자금"이라 부르지 말고 "정부지원사업"으로 부를 것)
   - 이 정부지원사업의 특징 (핵심 특징 2~3개를 짧은 제목 + 설명으로)
   - 지원 대상 및 신청 자격 (대상, 산정 방법, 우대 대상, 지원 제외 대상 등 자료에 있는 만큼)
   - 지원 조건 및 한도 (한도, 기간, 금리 등. 표 형태 데이터는 "항목: 값" 식 줄나열로. 자료에 없으면 공고문 확인 안내)
   - 신청 절차 (1. 2. 3. 숫자로 단계 나열)
   - 신청 시 필요 서류 (자료에 있으면)
   - 우대 지원 혜택 (자료에 있으면)
4. 마무리: 이 자금의 의미를 짧게 정리하는 감성 클로징 한 문단.
5. 핵심 정리: "[ 핵심 정리 ]"라는 제목(대괄호로 감쌈) 아래, 제도명/목적/지원대상/한도/기간/금리/신청방법 등 핵심을 "항목명: 내용" 형식으로 줄줄이 요약(금지 기호는 쓰지 말 것).
6. CTA: 아래 형태로 마무리(마무리 멘트는 아래 문구를 그대로 넣을 것. 변형/축약 금지).
   내 사업장이 자격 조건에 해당하는지 아래에서 확인해보세요.
   ${linkHome}

   ${CLOSING_LINE}
   ("행정대행 아님, 수수료 0원, 대출 상담 아님" 같은 부정형/방어성 문구는 절대 넣지 말 것.)
7. 사진 자리(매우 중요, 반드시 지킬 것): 본문에 사진 자리를 "정확히 8개" 넣는다. 5개나 6개가 아니라 반드시 8개. 표기는 오직 [사진1] [사진2] ... [사진8] 형태로 "번호만" 쓴다. 절대로 설명이나 콜론(:)이나 추천 문구를 붙이지 말 것. 예: "[사진1: 표지 이미지]" (X, 금지), "[사진1]" (O, 이렇게만). 위치는 다음과 같이 고정한다.
   - [사진1]: 맨 처음 질문형 후킹 바로 다음 (표지)
   - [사진2] ~ [사진7]: 본문 6개 섹션 사이에 하나씩 (예: 제도 설명 뒤, 특징 뒤, 지원대상 뒤, 조건/한도 뒤, 신청절차 뒤, 필요서류/우대 뒤). 본문 섹션 사이마다 골고루 6개.
   - [사진8]: 맨 마지막 CTA(우리 사이트 홍보) 자리 바로 앞 (마무리 홍보용)
   각 사진 자리는 한 줄에 [사진N] 딱 그것만. 대괄호 표기는 허용(특수기호 아님). 8개보다 적거나 많으면 안 된다.
8. 톤과 분량(대표님 지정, 중요): 전문적이고 정중한 정보 전달체. 딱딱한 관공서 말투는 피하고, 전문가가 사장님 눈높이로 쉽게 풀어주는 느낌.
   - "핵심만" 담는다. 같은 말을 다르게 반복하거나, 뻔한 미사여구·군더더기 문장은 넣지 않는다.
   - 각 섹션은 사장님이 꼭 알아야 할 정보(대상·조건·한도·기간·신청방법 등) 위주로 짧고 밀도 있게. 설명을 위한 설명은 빼고, 한 문단은 되도록 2~4문장 이내.
   - 전체 구조(오프닝, 질문후킹, 본문 섹션, 핵심 정리, CTA, 사진 8개)는 그대로 유지하되, 각 문단의 길이만 군살 없이 줄인다.
9. 줄바꿈(매우 중요, 대표님 지정 스타일): 복사해서 바로 붙여넣을 수 있도록 "짧게 끊어" 쓴다. 한 줄이 길어서 모바일에서 가로로 넘치면 안 된다.
   - 한 줄은 공백 포함 대략 25~35자 이내로 끊는다. 한 줄이 이보다 길어질 것 같으면 반드시 \\n으로 나눈다.
   - 의미 단위(쉼표/조사/어절 뒤)로 자연스럽게 끊고, 단어 중간을 쪼개지 않는다.
   - 한 문장이 길면 2~3줄로 나눠 쓴다. 문단과 문단 사이에는 빈 줄 하나(\\n\\n).
   - 절대로 한 문장을 한 줄로 쭉 이어 쓰지 말 것. 붙여넣었을 때 화면 밖으로 넘치면 실패다.
   예:
   (X) 선정 기업은 현지 바이어 발굴과 1대1 수출상담 주선, 쇼케이스 형태의 상담장 운영 등 미국 시장 진출을 위한 현장형 지원을 받게 됩니다.
   (O) 선정 기업은 현지 바이어 발굴과\\n1대1 수출상담 주선,\\n쇼케이스 형태의 상담장 운영 등\\n미국 시장 진출을 위한\\n현장형 지원을 받게 됩니다.
10. 섹션 간격(매우 중요, 대표님 지정): 답답하게 붙이지 말고 아래 간격을 반드시 지킨다.
   - 각 섹션 "제목" 앞에는 빈 줄 2개(\\n\\n\\n)를 넣어 이전 내용과 확실히 떨어뜨린다.
   - 섹션 "제목" 바로 다음에도 빈 줄 1개(\\n\\n)를 넣고 본문을 시작한다. 제목과 본문을 절대 붙이지 말 것.
   - [사진N]은 위아래로 각각 빈 줄 1개(\\n\\n[사진N]\\n\\n)를 두어 앞뒤 내용과 떨어뜨린다.
   나쁜 예(X): "이 정부지원사업의 특징\\n업체당 최대 5억원..." (제목에 본문이 붙음)
   좋은 예(O): "\\n\\n이 정부지원사업의 특징\\n\\n업체당 최대 5억원..."
- 제목(blog-title, 네이버 검색 노출 매우 중요): 지역명(있으면) + 지원사업명 + "신청 안내/총정리/신청방법" 형태. 제목은 검색 노출을 위해 [ ] < > 같은 감싸는 기호 없이 순수 키워드 문장으로(제목에만 예외). 금지 기호도 물론 사용 금지.
   · 사람들이 실제로 검색할 핵심 키워드(사업명, 지역, "정부지원", "신청", "지원금" 등)를 제목 "앞쪽"에 배치한다.
   · 길이는 공백 포함 30자 안팎으로. 너무 길면 뒷부분이 검색결과에서 잘리므로 핵심 키워드를 앞에 둔다.
   · 낚시성/과장(최대, 무조건, 100%) 금지. 검색 키워드 위주로 담백하게.
- 본문 SEO: 첫 두세 문단 안에 제목의 핵심 키워드(사업명, 지역, "정부지원사업" 등)가 자연스럽게 다시 등장하게 한다. 억지 반복은 금지하고 문맥상 자연스럽게만.
- 태그(blog-tags): 12~15개. 사람들이 검색할 실제 키워드 위주로. 사업명, 주관기관, 분야, 지역(자료/입력에 맞게), 그리고 #모두의사업친구 #모사친 반드시 포함. 각 태그는 #로 시작, 공백으로 구분. 태그가 많으면 한 줄에 다 넣지 말고 5~6개씩 줄바꿈해 2~3줄로 나눠도 됨. 태그는 마무리 CTA 뒤에 위치.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 출력 형식 (반드시 이 JSON 스키마로만. 네이버 블로그 1개 채널만. text 안의 줄바꿈은 \\n 으로. 위에서 [금지]한 기호와 이모지는 절대 포함 금지, 허용된 [ ] ( ) < > - 는 규칙대로 사용 가능.)
━━━━━━━━━━━━━━━━━━━━━━━━
{
  "channels": [
    { "channel": "네이버 블로그", "emoji": "📝", "depth": "심층", "blocks": [
      { "key": "blog-title", "label": "제목 (검색 최적화)", "text": "..." },
      { "key": "blog-body", "label": "본문 (오프닝3줄+질문후킹+섹션+핵심정리+CTA, [사진1]~[사진8] 8개 포함)", "hint": "우리 블로그 표준 구조. 섹션 제목은 [ ] 로 감싸 가독성 있게(금지 기호·이모지는 금지). [사진1]~[사진8] 총 8개 반드시 포함(표지1+본문6+마무리CTA1)", "text": "안녕하세요 대표님!\\n정부지원사업 AI 통합 매칭 플랫폼\\n모두의사업친구입니다.\\n\\n..." },
      { "key": "blog-tags", "label": "태그 12~15개", "text": "#... #모두의사업친구 #모사친" }
    ] }
  ]
}
JSON 외 다른 텍스트는 절대 출력하지 마세요.
모든 text 필드는 실제 줄바꿈이 반영되도록 \\n을 정확히 사용하세요. 위에서 [금지]한 기호(▶ ▸ ● ■ · ※ ★ 등)와 이모지는 어떤 필드에도 절대 넣지 마세요. 허용된 [ ] ( ) < > - 는 제목/목차/구분선 용도로만 절제해서 사용하세요.
그대로 복사해 붙이면 바로 올릴 수 있는 완성본이어야 합니다.`;

        const user = `아래 자료를 바탕으로 네이버 블로그 글 1개만 작성해주세요. (다른 채널은 만들지 마세요.)

[공고 자료]
${material}

[추가 정보]
지역: ${region || "(자료에서 파악)"}
지원 한도: ${amount || "(자료에서 파악, 모르면 공고 확인 안내)"}
이번 글에서 강조할 점: ${emphasis || "(특별 강조 없음)"}

[사용할 링크]
네이버 블로그 본문 CTA에 ${linkHome} 직접 노출`;

        // GPT-5 계열은 커스텀 temperature 를 거부(기본 1만 허용)하는 경우가 있어
        // temperature 는 넣지 않는다. JSON 응답 강제만 유지.
        const completion = await client.chat.completions.create({
          model: process.env.OPENAI_SNS_MODEL || "gpt-5.2",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content?.trim() || "";
        const parsed = JSON.parse(content);
        const channels = normalizeChannels(parsed);
        if (channels) {
          return NextResponse.json({
            channels,
            mode: "ai",
            note: linkNote || undefined,
          });
        }
      } catch (e: any) {
        // AI 실패 시 템플릿 폴백으로
      }
    }

    // ── 폴백: 템플릿 엔진 (AI 없거나 실패 시) ──
    const fallbackInput: SnsInput = {
      ...DEFAULT_INPUT,
      region: region || DEFAULT_INPUT.region,
      title: source.slice(0, 60) || DEFAULT_INPUT.title,
      amount: amount || DEFAULT_INPUT.amount,
      linkInpock,
      linkHome,
    };
    return NextResponse.json({
      channels: buildAllChannels(fallbackInput),
      mode: "fallback",
      note:
        linkNote ||
        "AI 생성에 실패해 기본 템플릿으로 만들었습니다. 값을 직접 확인/수정해서 사용해주세요.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "글 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
