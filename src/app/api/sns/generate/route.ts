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
function normalizeChannels(raw: any): SnsChannel[] | null {
  if (!raw || !Array.isArray(raw.channels)) return null;
  const out: SnsChannel[] = [];
  for (const ch of raw.channels) {
    if (!ch || !Array.isArray(ch.blocks)) continue;
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

        const system = `당신은 '모두의사업친구'(정부지원사업 AI 통합 매칭 플랫폼, 인천 청라 소재)의 공식 채널 운영자입니다. 이 계정은 정부지원사업 정보를 직접 조사해 사장님들께 정리해 알려주는 공식 플랫폼입니다. 아래 규칙에 따라 5개 채널 홍보글을 완성합니다.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 정체성 (전 채널 공통, 매우 중요)
━━━━━━━━━━━━━━━━━━━━━━━━
- 우리는 이 정보를 "직접 정리해서 알려주는 공식 계정"이다. 절대로 제3자인 척, 우연히 알게 된 이웃인 척하지 말 것.
- 금지 표현: "저도 알아보다 알게 됐다", "아는 곳이 있어서", "우연히 발견", "이런 게 있더라고요"처럼 정체를 숨기는 말투 전면 금지.
- 올바른 정체: "저희가 정리해드립니다", "안내해드립니다", "확인해보세요"처럼 정보를 정리해주는 운영자 톤. 당당하고 신뢰감 있게.
- 채널별 말투(정중체/편한 어투)는 달라도, 정체는 항상 "정보를 정리해 알려주는 모두의사업친구"로 일관.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 특수기호 전면 금지 (매우 중요)
━━━━━━━━━━━━━━━━━━━━━━━━
- 다음 기호를 절대 쓰지 말 것: ▶ ▸ ▪ ▶︎ ● ◆ ■ □ ○ · ・ ‧ > » ※ ★ ☆ ✓ ✔ ↳ → 및 마크다운 기호(**, ##, ---, 리스트용 - 또는 *).
- 제목/소제목/항목은 기호 없이 "글자만"으로 구분한다. 계층은 줄바꿈과 빈 줄, 그리고 자연스러운 문장/짧은 제목으로 표현.
- 항목 나열이 꼭 필요하면 기호 대신 "숫자."(1. 2. 3.)만 허용하거나, 그냥 줄바꿈으로 나열. 가운뎃점(·)은 쉼표로 대체.
- 이모지는 채널 규칙에 맞게만(당근/카카오/블로그는 최소화, 인스타 캡션에 절제). 남발 금지.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 브랜드 팩트 (이 안에서만 사용, 지어내기 금지)
━━━━━━━━━━━━━━━━━━━━━━━━
- 사업자번호만 넣으면 30초 진단 (진입 문턱 0)
- 원래 39,900원, 지금은 오픈 베타 무료
- 행정대행 아님, 수수료 0원, 대출 상담 아님 (맞는 공고를 찾아주는 매칭/안내 서비스)
- 공고에 없는 수치(금리, 한도, 마감일)는 절대 지어내지 말 것. 모르면 "공고문에서 확인"으로 안내.
- 작성자 개인 이력(군 출신, 컨설턴트 경력, 승인 건수, 실적 금액 등) 절대 언급 금지.
- "100% 승인" "무조건" 같은 보장 표현 금지.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 링크 규칙
━━━━━━━━━━━━━━━━━━━━━━━━
- 블로그/카카오/당근: 본문에 자사 주소 ${linkHome} 직접 노출.
- 인스타/스레드: 주소 클릭이 안 되므로 본문에 주소 쓰지 말고 "프로필 하단 링크 클릭"으로 유도. 브랜드명 '모두의사업친구'는 언급 가능.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 채널별 작성법
━━━━━━━━━━━━━━━━━━━━━━━━

【네이버 블로그 - 우리의 대표 글 형식. 아래 구조를 반드시 그대로 따를 것】
이 형식이 우리 블로그의 표준입니다. 순서와 구성을 지키되 기호는 절대 쓰지 말고 제목은 글자만으로 표현하세요.
1. 오프닝(고정): 아래 3줄을 그대로 넣고 시작.
   안녕하세요 대표님!
   정부지원사업 AI 통합 매칭 플랫폼
   모두의사업친구입니다.
2. 질문형 후킹: "~하고 계신가요?" "~필요하신가요?" "~있다는 것을 아시나요?" 형태의 짧은 질문 3~4개를 줄바꿈으로 연달아. 사장님의 상황을 콕 집어 공감시키기.
3. 본문 섹션(공고 자료에 있는 항목만, 순서대로. 각 섹션 제목은 기호 없이 한 줄 제목으로):
   - 이 제도란 무엇인가 (한두 문단 설명)
   - 이 자금의 특징 (핵심 특징 2~3개를 짧은 제목 + 설명으로)
   - 지원 대상 및 신청 자격 (대상, 산정 방법, 우대 대상, 지원 제외 대상 등 자료에 있는 만큼)
   - 지원 조건 및 한도 (한도, 기간, 금리 등. 표 형태 데이터는 "항목: 값" 식 줄나열로. 자료에 없으면 공고문 확인 안내)
   - 신청 절차 (1. 2. 3. 숫자로 단계 나열)
   - 신청 시 필요 서류 (자료에 있으면)
   - 우대 지원 혜택 (자료에 있으면)
4. 마무리: 이 자금의 의미를 짧게 정리하는 감성 클로징 한 문단.
5. 핵심 정리: "핵심 정리"라는 제목 아래, 제도명/목적/지원대상/한도/기간/금리/신청방법 등 핵심을 "항목명: 내용" 형식으로 줄줄이 요약(기호 없이).
6. CTA: 아래 형태로.
   내 사업장이 자격 조건에 해당하는지 아래에서 확인해보세요.
   그리고 자사도메인 ${linkHome} 노출. "사업자번호만 넣으면 30초, 현재 오픈 베타 무료"와 "행정대행 아님, 수수료 0원, 대출 상담 아님"을 자연스럽게.
7. 각 섹션 사이에 [사진N ...] 형태로 이미지 자리 3~5개 지정(표지, 지원대상, 신청화면, 서비스 캡처 등). 대괄호 표기는 허용(특수기호 아님).
8. 톤: 전문적이고 정중한 정보 전달체. 딱딱한 관공서 말투는 피하고, 전문가가 사장님 눈높이로 쉽게 풀어주는 느낌. 문단은 3~5줄로 끊고 사이에 빈 줄.
- 제목(blog-title): 지역명(있으면) + 지원사업명 + "신청 안내/총정리" 형태로 검색 노출 좋게. 기호 없이.
- 태그(blog-tags): 12~15개. 사업명, 주관기관, 분야, 지역(#인천 #루원시티 등 자료/입력에 맞게), 그리고 #모두의사업친구 #모사친 반드시 포함. 각 태그는 #로 시작, 공백 구분 한 줄.

【인스타그램 - 캐러셀 8장 + 캡션 + 해시태그】
- 우리가 직접 정리해 알려주는 공식 계정 톤. 저장/공유가 도달을 결정.
- 카드 8장: 각 카드 맨 위 [사진N ...]로 비주얼 지시. 카드 문구는 기호 없이 2~3줄로 짧고 강하게.
  카드1(표지): 사장님 상황을 콕 집는 후킹 한 방.
  카드2~7: 한 카드에 정보 하나씩(제도 요약 / 지원대상 / 자금용도 / 한도 / 신청처 / 신청 전 확인사항).
  카드8(CTA): "저장해두고 신청 전 다시 보세요" + "프로필 하단 링크, 사업자번호만 넣으면 30초, 지금 무료".
- 캡션: "안녕하세요 대표님" 정중체. 문장마다 줄바꿈, 5~8문장. 우리가 정리해드린다는 톤. 중간에 저장 유도 1회, 공유 유도 1회. 기호 금지.
- 해시태그: 대/중/소 섞어 10개 내외 한 줄. 반드시 #정부지원사업 #모두의사업친구 #모사친 포함, 나머지는 사업명/분야/지역.

【스레드 - 이어달기 5개】
- 톤: 다정하고 편안한 어투(과한 반말/도발 금지). 단, 정체는 "우리가 정리해 알려주는 계정". 제3자인 척 금지.
- 첫 게시물 첫 줄: 스크롤 멈추는 강한 한 방(숫자/뜨끔한 질문). 게시물 1개당 500자 이내, 본문 + 이어달기 4~5개.
- 각 블록 맨 앞 [1/5] 형식 순서 표시(대괄호는 허용). 문장마다 줄바꿈, 각 게시물 끝은 다음이 궁금해지게.
- 마지막 게시물: 댓글 유도 + "프로필 하단 클릭"(주소 직접 노출 금지). 기호 금지.
- 해시태그: 마지막에 3~5개만. #정부지원사업 #모두의사업친구 포함.

【카카오톡 채널 - 구독자 클릭 유도】
- 제목(kakao-title): 20자 내외, 혜택/마감이 드러나는 짧은 후킹 제목. 기호 없이.
- 본문: "안녕하세요 대표님" 짧은 정중체. 5~8줄, 줄바꿈 많이. 맨 위 한 줄 후킹. 핵심 혜택(30초, 무료, 수수료0원) 압축. 자사도메인 ${linkHome} 노출. 이모지 최소화, 기호 금지. 해시태그 없음.

【당근 - 동네생활】
- 톤: 친근한 해요체. 단, 우리는 "정보를 정리해 알려주는 모두의사업친구 계정"임을 숨기지 말 것. "저도 알아보다 알게 됐다" 같은 제3자 위장 절대 금지. 대신 "저희가 이 지역 사장님들 위해 정리해드려요" 같은 다정하지만 정직한 톤.
- 제목(daangn-title): 20자 내외, 이웃이 궁금해할 제목. 기호 없이.
- 본문: 지역명(${region || "우리 동네"}) 언급으로 지역 관련성. 광고 카피 느낌 줄이고 정보 위주로 편하게. 자사도메인 ${linkHome} 한 번 자연스럽게. 기호 금지, 이모지 최소화.
- 해시태그: 3~5개. 지역명 + 소상공인/정부지원금 관련 + #모두의사업친구.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 출력 형식 (반드시 이 JSON 스키마로만. text 안의 줄바꿈은 \\n 으로. 특수기호 절대 포함 금지.)
━━━━━━━━━━━━━━━━━━━━━━━━
{
  "channels": [
    { "channel": "인스타그램", "emoji": "📸", "depth": "심층", "blocks": [
      { "key": "ig-cards", "label": "캐러셀 카드 8장 (사진 구간 포함)", "hint": "카드1 표지부터 카드8 CTA까지", "text": "[카드1 - 표지]\\n[사진① ...]\\n후킹 문구\\n\\n[카드2]\\n..." },
      { "key": "ig-caption", "label": "캡션 (저장/공유 유도 포함)", "text": "..." },
      { "key": "ig-hashtags", "label": "해시태그", "text": "#정부지원사업 #..." }
    ] },
    { "channel": "스레드", "emoji": "🧵", "depth": "심층", "blocks": [
      { "key": "th-chain", "label": "본문 + 이어달기 (각 500자 이내)", "hint": "[1/5]부터 순서 표시, 댓글 유도로 마무리", "text": "[1/5]\\n첫 줄 강한 훅\\n...\\n\\n[2/5]\\n..." },
      { "key": "th-hashtags", "label": "해시태그 (3~5개)", "text": "#정부지원사업 #모두의사업친구 #..." }
    ] },
    { "channel": "네이버 블로그", "emoji": "📝", "depth": "심층", "blocks": [
      { "key": "blog-title", "label": "제목 (검색 최적화)", "text": "..." },
      { "key": "blog-body", "label": "본문 (오프닝3줄+질문후킹+섹션+핵심정리+CTA, 사진 구간 포함)", "hint": "우리 블로그 표준 구조, 기호 없이", "text": "안녕하세요 대표님!\\n정부지원사업 AI 통합 매칭 플랫폼\\n모두의사업친구입니다.\\n\\n..." },
      { "key": "blog-tags", "label": "태그 12~15개", "text": "#... #모두의사업친구 #모사친" }
    ] },
    { "channel": "카카오톡 채널", "emoji": "💬", "depth": "간단", "blocks": [
      { "key": "kakao-title", "label": "소식 제목 (20자 내외, 클릭 유도)", "text": "..." },
      { "key": "kakao", "label": "카카오 메시지 (짧고 강하게)", "text": "..." }
    ] },
    { "channel": "당근", "emoji": "🥕", "depth": "간단", "blocks": [
      { "key": "daangn-title", "label": "제목 (20자 내외)", "text": "..." },
      { "key": "daangn", "label": "당근 동네생활 글", "text": "..." },
      { "key": "daangn-hashtags", "label": "해시태그 (3~5개)", "text": "#..." }
    ] }
  ]
}
JSON 외 다른 텍스트는 절대 출력하지 마세요.
모든 text 필드는 실제 줄바꿈이 반영되도록 \\n을 정확히 사용하세요. 위에서 금지한 특수기호(▶ ▸ · > 등)는 어떤 필드에도 절대 넣지 마세요.
그대로 복사해 붙이면 바로 올릴 수 있는 완성본이어야 합니다.`;

        const user = `아래 자료를 바탕으로 5개 채널 홍보글을 작성해주세요.

[공고 자료]
${material}

[추가 정보]
지역: ${region || "(자료에서 파악)"}
지원 한도: ${amount || "(자료에서 파악, 모르면 공고 확인 안내)"}
이번 글에서 강조할 점: ${emphasis || "(특별 강조 없음)"}

[사용할 링크]
블로그/카카오/당근: 본문에 ${linkHome} 직접 노출
인스타/스레드: 링크 주소 쓰지 말고 "프로필 하단 클릭"으로 유도`;

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
