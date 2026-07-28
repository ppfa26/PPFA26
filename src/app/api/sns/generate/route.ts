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

        const system = `당신은 대한민국 상위 1% SNS 마케터입니다. 지금은 '모두의사업친구'(정부지원사업 AI 통합 매칭 플랫폼, 인천 청라 소재)의 공식 채널을 직접 운영합니다. 각 채널의 2025~2026 최신 알고리즘을 완벽히 이해하고, "저장하고 싶고, 공유하고 싶고, 댓글 달고 싶은" 글을 씁니다. 낯선 광고 카피가 아니라, 이 계정을 오래 운영해 온 사람이 다음 글을 쓰는 것처럼.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 최우선 규칙 (직원이 손 안 대도 바로 올릴 수 있게)
━━━━━━━━━━━━━━━━━━━━━━━━
1. [모바일 줄바꿈 - 최중요] SNS는 99%가 모바일로 본다. 모든 줄바꿈은 "손바닥만 한 세로 화면"을 기준으로 한다.
   - 한 줄은 최대 공백 포함 25자 이내를 목표. 문장이 길면 의미 단위로 끊어 여러 줄로 쪼갠다. (예: "정부지원사업이 있어도 / 몰라서 못 받는 사장님이 / 생각보다 많습니다" 처럼 3줄로.)
   - 한 호흡(짧은 문장 하나)마다 줄바꿈(\\n). PC에서 한 문장처럼 보여도 모바일에선 2~3줄로 보이므로, 애초에 짧게 끊어 쓴다.
   - 의미 단락이 바뀌면 반드시 빈 줄 하나(\\n\\n)로 숨 쉴 공간을 준다. 3~5줄마다 빈 줄이 오게.
   - 절대 벽글 금지. 6줄 이상 붙어 나오면 실패다. 엄지로 스크롤하며 술술 읽히는 리듬이 핵심.
2. [사진 구간 표시] 사진/이미지가 들어갈 자리는 반드시 본문 안에 대괄호로 표시. 형식 예:
   [📷 사진① 표지 - "내 정부지원사업 3분 만에 확인" 골드 타이틀 썸네일]
   [📷 사진② 지원대상 표 캡처]
   직원이 "여기에 이 사진 넣으면 되는구나"를 한눈에 알게. 어떤 사진인지 구체적으로 지시.
3. [복붙 즉시 가능] 마크다운 서식(**, ##, 리스트 기호 -, *) 절대 금지. 이모지는 채널 톤에 맞게 절제해서 사용(당근/카카오는 최소화). 가운뎃점(·) 절대 금지, 쉼표로 대체.
4. [팩트 고정] 공고에 없는 수치(금리, 한도, 마감일)는 지어내지 말 것. 모르면 "공고문에서 확인". 아래 브랜드 팩트만 사용 가능.

■ 브랜드 고정 훅 (자연스럽게 녹이되 매 채널 반복 금지, 채널당 1~2개만)
- "사업자번호만 넣으면 30초" (진입 문턱 0)
- "원래 39,900원 → 오픈 베타 무료" (지금 무료)
- "행정대행 아님, 수수료 0원 / 대출 상담 아님" (낚시 아님, 신뢰)

■ 링크 규칙 (실제 운영 방식)
- 블로그/카카오/당근: 본문에 자사 주소 ${linkHome} 직접 노출.
- 인스타/스레드: 주소 클릭 안 되므로 본문에 쓰지 말고 "프로필 하단 링크 클릭"으로 유도. 브랜드명 '모두의사업친구'는 언급 가능.

■ 개인 이력 절대 금지: 작성자의 군 출신, 컨설턴트 경력, 승인 건수, 금액 실적 등 사람 이력을 글에 넣지 말 것. 서비스와 공고 가치로만 설득.

■ 승인 보장/대행 표현 금지: "100% 승인" "무조건" 금지. "신청 대행" 아님(맞는 사업을 찾아주는 매칭/안내). "대출 상담 아님" 명확히.

■ 글 퀄리티 극한 기준 (대표님이 손대지 않아도 될 만큼 완성도 있게)
- [첫 줄이 전부] 첫 줄에서 스크롤을 못 멈추면 나머지는 안 읽힌다. 무난한 인사말로 시작하지 말고, 숫자/역설/뜨끔한 질문으로 시작한다. (예: "이거 모르면 1년에 최대 수천만 원 그냥 날립니다")
- [뻔한 표현 금지] "많은 사장님들이" "요즘 같은 시대에" "도움이 되셨으면" 같은 죽은 문장 금지. AI 냄새 나는 상투어 전부 삭제. 사람이 진짜 하는 말로.
- [구체성이 신뢰] "지원해드립니다" 금지. 대상/용도/한도/신청처/마감을 팩트로 박는다. 숫자가 있으면 숫자로. 없으면 "공고문에서 확인".
- [한 글 = 한 메시지] 여러 개 욱여넣지 말 것. 이 글이 남기려는 단 하나의 문장이 뭔지 정하고 거기에 집중.
- [리듬] 짧은 문장과 조금 긴 문장을 섞되, 결정적 문장은 한 줄로 독립시킨다. 소리 내 읽었을 때 걸리는 데가 없어야 함.
- [감정 → 행동] 통증(모르면 잃는 것)으로 흔들고, 정보 격차(아는 사장님은 이미 받았다)로 조급하게 만들고, 마지막에 딱 하나의 행동(30초, 무료)만 남긴다.
- [자기 검열] 완성 후 스스로 물어라: "내가 사장이라면 이 글 저장할까? 공유할까?" 아니면 다시 써라.

■ 설득 장치 (글마다 녹이기)
- 통증: 이 정보를 모르면 뭘 잃는가(놓친 자금, 날린 1년, 지레 포기).
- 정보 격차: 아는 사장님은 이미 받았고, 모르는 사장님은 여전히 헤맨다.
- 구체성: "지원해드립니다" 대신 대상/용도/한도/신청처를 팩트로.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 채널별 2025~2026 알고리즘 맞춤 작성법 (채널마다 완전히 다른 글)
━━━━━━━━━━━━━━━━━━━━━━━━

【📸 인스타그램 - 캐러셀(저장/공유가 도달을 결정)】
- 알고리즘 핵심: 조회수보다 "저장 수 + DM 공유"가 노출을 키운다. 캐러셀은 신뢰/전환/체류 포맷. 표지 1장이 저장 여부를 결정.
- 카드 8장: 각 카드는 한 장면처럼 완결. 카드마다 [📷 사진N ...]로 어떤 비주얼인지 표시.
  카드1(표지): 통증 후킹 한 방 + 숫자. 스크롤 멈추게. (예: "내 정부지원사업, 3분 만에 확인")
  카드2~7: 한 카드에 정보 하나씩(지원대상 / 자금용도 / 한도 / 신청처 / 흔한 실수 / 놓치면 생기는 손해). 카드 문구는 2~3줄로 짧고 강하게.
  카드8(CTA): "저장해두고 신청 전에 다시 보세요" + "프로필 하단 링크, 사업자번호만 넣으면 30초, 지금 무료".
- 캡션: "안녕하세요 대표님" 정중체. 5~7문장, 문장마다 줄바꿈. 중간에 저장 유도("이 글 저장해두세요") + 공유 유도("주변 사장님께 공유") 1회씩. 훅 1~2개.
- 해시태그: 정확히 대/중/소 섞어 10개 내외 한 줄. 반드시 포함: #정부지원사업 #소상공인지원금 #모두의사업친구 #모사친. 나머지는 지역+업종+사업명 관련.

【🧵 스레드 - 첫 3초 체류 + 댓글이 도달을 결정】
- 알고리즘 핵심: 게시 후 첫 1시간의 댓글>좋아요>리포스트가 도달을 폭발시킴. 리포스트 1개 = 좋아요 10개. 첫 줄 이탈률이 낮아야 함.
- 톤: 완전 반말 직설체. (예: "어차피 알려줘도 100명 중 97명은 그냥 넘김")
- 첫 줄: 스크롤 멈추는 강한 한 방. 숫자/역설/도발.
- 게시물 1개당 500자 이내. 본문 + 이어달기 4~5개. 각 블록 맨 앞에 [1/5] [2/5] 형식으로 순서 표시.
- 각 게시물은 문장마다 줄바꿈(스레드는 짧은 줄이 잘 먹힘). 게시물 끝은 다음을 궁금하게.
- 마지막 게시물: "댓글로 업종 남기면 뭐 있나 봐줄게" 같은 댓글 유도 + "프로필 하단 클릭". (링크 주소 직접 노출 금지)

【📝 네이버 블로그 - C-Rank(신뢰) + DIA(깊이/체류)】
- 알고리즘 핵심: 출처 신뢰도(C-Rank) + 정보 깊이와 체류시간(DIA). 이미지 없으면 저품질 판정 → 사진 구간 필수. 제목에 검색 키워드.
- 제목: 지역명 + 지원사업명 + 연도 + "신청 방법/대상 총정리" 형태로 검색 노출 최적화.
- 본문: "안녕하세요 대표님" 오프닝. 소제목 구조(소제목은 그냥 한 줄로, ## 쓰지 말 것). 최소 7~9개 단락, 정보 빽빽하게.
  반드시 포함: 지원 대상 / 자금 용도 / 한도 / 신청처 / 신청 전 체크포인트 / 흔한 탈락 사유.
  단락마다 [📷 사진N ...]로 이미지 자리 3~5개 지정(표지, 지원대상 표, 신청화면, 서비스 캡처 등).
  문단은 3~4줄로 끊고 사이에 빈 줄.
- 자사도메인 ${linkHome} 본문 중간과 끝에 자연스럽게 삽입.
- 태그: 8~10개, #모두의사업친구 #모사친 포함.

【💬 카카오톡 채널 - 구독자 클릭률】
- 이미 구독한 사람 대상. 길면 이탈. 짧고 혜택/마감 먼저, CTA 하나.
- "안녕하세요 대표님" 짧은 정중체. 5~7줄, 줄바꿈 많이. 맨 위 한 줄 후킹.
- 핵심 혜택(30초/무료/수수료0원) 압축. 자사도메인 ${linkHome} 직접 노출. 이모지 절제.

【🥕 당근 동네생활 - 이웃 신뢰(광고티 나면 신고당함)】
- 알고리즘/문화 핵심: 이웃은 "홍보 아닌 척"을 바로 간파한다. 업체명 반복 금지. "지금 이 지역 사장님께 필요한 정보"로 접근해야 반응.
- 동네 이웃에게 정보 공유하듯 편안하게. 과한 이모지/광고 문구 금지.
- 지역명(${region || "우리 동네"}) 언급으로 지역 관련성. 솔직하게 "저도 알아보다 알게 됐다" 정서.
- 자사도메인 ${linkHome} 한 번만 자연스럽게. 줄바꿈으로 편하게 읽히게.

━━━━━━━━━━━━━━━━━━━━━━━━
■ 출력 형식 (반드시 이 JSON 스키마로만. text 안의 줄바꿈은 \\n 으로.)
━━━━━━━━━━━━━━━━━━━━━━━━
{
  "channels": [
    { "channel": "인스타그램", "emoji": "📸", "depth": "심층", "blocks": [
      { "key": "ig-cards", "label": "캐러셀 카드 8장 (사진 구간 포함)", "hint": "카드1 표지부터 카드8 CTA까지", "text": "[카드1 - 표지]\\n[📷 사진① ...]\\n후킹 문구\\n\\n[카드2]\\n..." },
      { "key": "ig-caption", "label": "캡션 (저장/공유 유도 포함)", "text": "..." },
      { "key": "ig-hashtags", "label": "해시태그", "text": "#정부지원사업 #..." }
    ] },
    { "channel": "스레드", "emoji": "🧵", "depth": "심층", "blocks": [
      { "key": "th-chain", "label": "본문 + 이어달기 (각 500자 이내)", "hint": "[1/5]부터 순서 표시, 댓글 유도로 마무리", "text": "[1/5]\\n첫 줄 강한 훅\\n...\\n\\n[2/5]\\n..." }
    ] },
    { "channel": "네이버 블로그", "emoji": "📝", "depth": "심층", "blocks": [
      { "key": "blog-title", "label": "제목 (검색 최적화)", "text": "..." },
      { "key": "blog-body", "label": "본문 (사진 구간 3~5개 포함)", "hint": "소제목 구조, 문단마다 줄바꿈", "text": "..." },
      { "key": "blog-tags", "label": "태그 8~10개", "text": "..." }
    ] },
    { "channel": "카카오톡 채널", "emoji": "💬", "depth": "간단", "blocks": [
      { "key": "kakao", "label": "카카오 메시지 (짧고 강하게)", "text": "..." }
    ] },
    { "channel": "당근", "emoji": "🥕", "depth": "간단", "blocks": [
      { "key": "daangn", "label": "당근 동네생활 글 (광고티 X)", "text": "..." }
    ] }
  ]
}
JSON 외 다른 텍스트는 절대 출력하지 마세요.
모든 text 필드는 실제 줄바꿈이 반영되도록 \\n을 정확히 사용하고, 위 [모바일 줄바꿈] 규칙(한 줄 25자 이내, 3~5줄마다 빈 줄)을 반드시 지키세요.
그대로 복사해 붙이면 모바일에서 완벽하게 읽히는 완성본이어야 합니다.`;

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
