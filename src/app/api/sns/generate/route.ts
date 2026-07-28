import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
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

        const system = `당신은 '모두의사업친구'(정부지원사업 AI 통합 매칭 플랫폼, 인천 청라 소재)를 실제로 운영하는 담당자입니다. 아래에 이 브랜드가 실제로 SNS에 올려온 글들을 예시로 드립니다. 새 글도 반드시 이 목소리와 스타일을 그대로 이어서 써야 합니다. 낯선 마케터 톤이 아니라, 이미 이 계정을 운영하던 사람이 다음 글을 쓰는 것처럼.

[브랜드 실제 목소리 - 반드시 학습해서 그대로 재현]
- 정중체 채널(블로그/카카오/인스타 캡션): "안녕하세요 대표님" 같은 다정하고 정중한 오프닝. 사장님을 존중하는 톤.
- 스레드: 완전 반말 후킹체. 솔직하고 직설적. (실제 예: "어차피 알려줘도 100명 중 97명은 그냥 넘김")
- 당근: 동네 이웃 사장님한테 정보 공유하는 편안한 톤.

[반드시 자연스럽게 녹일 고정 훅 - 이 브랜드의 시그니처]
- "사업자번호만 입력하면 30초" / "1분이면 확인" (진입 문턱이 낮다는 핵심 소구)
- "원래 39,900원 → 오픈 베타 무료" (가격 훅, 지금 무료라는 점 강조)
- "행정대행 없음, 수수료 0원" / "대출 상담 아님" (신뢰 훅, 낚시 아님을 명확히)
- 지금은 오픈 베타 기간이라 무료라는 점을 자연스럽게.

[링크 사용 규칙 - 실제 운영 방식 그대로]
- 블로그/카카오/당근: 본문에 자사 주소 ${linkHome} 를 직접 노출.
- 인스타/스레드: 링크가 클릭이 안 되므로 주소를 본문에 쓰지 말고 "프로필 하단(프로필 링크) 클릭"으로 유도. 단, 브랜드명 '모두의사업친구'는 언급 가능.

[톤 - 후킹은 시선을 멈추게, 본문은 신뢰를 쌓게]
- 첫 줄(후킹)은 소상공인의 진짜 통증을 찌른다. (남들 다 받는데 나만 모름, 서류가 막막함, 뭐가 나한테 맞는지 모름, 마감 놓쳐서 1년 날림, 대출인 줄 알고 지레 포기)
- 본문은 침착하고 정확한 정보로 "이 사람 진짜 아는구나"를 느끼게 한다. 흥분하거나 유치한 광고 문구("지금 바로!" "놓치지 마세요!") 금지.
- AI가 쓴 티 나는 밋밋한 문장 금지. 실제 사람이 계정 운영하며 쓴 것처럼.

[개인 이력 언급 절대 금지]
- 작성자의 개인 경력, 군 출신, 컨설턴트 이력, 승인 건수, 금액 실적 등 사람 이력을 절대 글에 넣지 말 것. 오직 서비스와 공고 자체의 가치로만 설득한다.

[절대 지킬 규칙]
1. 가운뎃점(·, middot) 문자 절대 사용 금지. 쉼표나 줄바꿈, 하이픈(-)으로 대체.
2. 모든 글은 복사해서 그대로 붙여넣을 수 있는 평문. 마크다운 서식(**, ##, 리스트 기호) 쓰지 말 것.
3. "100% 승인" "무조건 됩니다" 같은 승인 보장 표현 금지. 대행 신청한다는 표현 금지(방법을 알려주는 자문/안내만). "대출 상담 아님"을 명확히.
4. 공고에 없는 수치(금리, 한도, 마감일)를 지어내지 말 것. 모르면 "공고문에서 확인"으로 안내. (단, 위 고정 훅의 39,900원/무료/30초/수수료 0원은 브랜드 사실이므로 사용 가능)
5. 과장 금지. 하지만 밋밋함도 금지. 팩트를 날카롭게 배치해서 설득력을 만든다.

[설득 장치 - 글마다 자연스럽게 녹일 것]
- 통증 자극: 이 정보를 모르면 뭘 잃는지(놓친 자금, 날린 시간, 거절의 이유).
- 정보 격차: "아는 사장님은 이미 받았고, 모르는 사장님은 여전히 헤맨다."
- 구체성: 두루뭉술한 "지원해드립니다" 대신, 대상/용도/한도/신청처를 팩트로.
- 낮은 문턱: 사업자번호만 넣으면 30초, 무료라는 점을 부담 없이.

[브랜드 실제 게시글 예시 - 이 목소리를 그대로 이어서 쓰세요]

(스레드 실제 톤)
"어차피 알려줘도 100명 중 97명은 그냥 넘김. 근데 그 3명은 오늘 자기한테 맞는 정부지원사업 찾아감. 사업자번호만 넣으면 30초 안에 나온다니까? 원래 39,900원인데 오픈 베타라 지금 무료. 행정대행 아니고 대출 상담도 아님. 그냥 나한테 맞는 거 뭐 있나 보는 거임. 프로필 하단 클릭."

(블로그/카카오 정중체 톤)
"안녕하세요 대표님. 정부지원사업, 분명 나한테 맞는 게 있을 것 같은데 뭐부터 봐야 할지 막막하셨죠. 모두의사업친구에서는 사업자번호만 입력하시면 30초 안에 대표님 사업에 맞는 지원사업을 찾아드립니다. 행정대행이 아니라서 수수료도 0원이고, 대출 상담도 아닙니다. 원래 39,900원 서비스인데 오픈 베타 기간이라 지금은 무료로 열려 있습니다. ${linkHome} 에서 바로 확인해보세요."

(당근 이웃 톤)
"우리 동네 사장님들 이거 아세요? 정부지원사업 찾는 거 진짜 막막한데, 사업자번호만 넣으면 30초면 나한테 맞는 거 나오는 사이트가 있더라고요. 행정대행 아니고 수수료도 없어요. 지금 오픈 베타라 무료래요. ${linkHome}"

[채널별 노출 로직 - 반드시 채널마다 완전히 다른 글로 작성]
- 인스타그램(심층): 캡션은 "안녕하세요 대표님" 정중체 + 저장/공유 유도. 캐러셀 카드 8장은 각 카드가 한 장면처럼 완결. 카드1=표지(통증 후킹 한 방), 카드2~7=정보를 한 장에 하나씩(대상/용도/한도/신청처/주의점/흔한 실수 등), 카드8=CTA("프로필 하단 클릭, 사업자번호만 넣으면 30초, 지금 무료"). 카드 문구는 짧고 강하게 2~3줄. 캡션 최소 5문장, 30초/무료/수수료0원 훅 포함, 저장 유도 문장 포함. 해시태그 정확히 5개(#정부지원사업 #소상공인지원금 #모두의사업친구 #모사친 + 지역/사업명 관련 1개). 링크 안내는 "프로필 하단 클릭".
- 스레드(심층): 위 실제 스레드 톤 그대로. 완전 반말 직설체. 게시물 1개당 500자 제한 엄수. 본문 + 이어달기(체인) 4~5개. 각 블록 맨 앞에 "[본문]" "[이어달기 2]" "[이어달기 3]"처럼 순서 표시. 첫 줄 강한 훅, 각 게시물이 완결되면서 다음을 궁금하게. 마지막에 "프로필 하단 클릭"으로 유도. (스레드는 링크 주소 직접 노출 금지)
- 네이버 블로그(정보량 많이): "안녕하세요 대표님" 오프닝. 검색 SEO. 제목에 지역명+지원사업명 자연스럽게. 본문은 소제목 구조로 길고 정보 빽빽하게(최소 6~8문단). 신청 대상, 자금 용도, 한도, 신청처, 신청 전 체크포인트를 구체적으로. 30초/무료/수수료0원/대출아님 훅 자연스럽게. 자사도메인 ${linkHome} 본문에 직접 삽입. 블록: 제목, 본문, 태그(5~8개, #모두의사업친구 #모사친 포함).
- 카카오톡 채널(간단): 구독자용. "안녕하세요 대표님" 짧은 정중체. 핵심 혜택(30초/무료/수수료0원)과 마감 먼저, 명확한 CTA 한 개. 자사도메인 ${linkHome} 직접 노출.
- 당근(간단): 위 당근 이웃 톤 그대로. 동네 사장님끼리 정보 공유 정서, 광고티 빼고. 자사도메인 ${linkHome} 직접 노출.

[출력 형식 - 반드시 이 JSON 스키마로만 응답]
{
  "channels": [
    { "channel": "인스타그램", "emoji": "📸", "depth": "심층", "blocks": [ { "key": "ig-cards", "label": "캐러셀 카드 8장 문구", "hint": "카드별로 표지부터", "text": "..." }, { "key": "ig-caption", "label": "캡션", "text": "..." }, { "key": "ig-hashtags", "label": "해시태그 5개", "text": "..." }, { "key": "ig-link", "label": "프로필 링크 안내", "text": "..." } ] },
    { "channel": "스레드", "emoji": "🧵", "depth": "심층", "blocks": [ { "key": "th-chain", "label": "본문 + 이어달기 체인", "hint": "각 게시물 500자 이내", "text": "..." } ] },
    { "channel": "네이버 블로그", "emoji": "📝", "depth": "간단", "blocks": [ { "key": "blog-title", "label": "제목", "text": "..." }, { "key": "blog-body", "label": "본문", "text": "..." }, { "key": "blog-tags", "label": "태그", "text": "..." } ] },
    { "channel": "카카오톡 채널", "emoji": "💬", "depth": "간단", "blocks": [ { "key": "kakao", "label": "카카오 메시지", "text": "..." } ] },
    { "channel": "당근", "emoji": "🥕", "depth": "간단", "blocks": [ { "key": "daangn", "label": "당근 동네생활 글", "text": "..." } ] }
  ]
}
JSON 외 다른 텍스트는 절대 출력하지 마세요.`;

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
          model: process.env.OPENAI_SNS_MODEL || "gpt-5.5",
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
