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

const DEFAULT_LINK_INPOCK = "https://link.inpock.co.kr/ppfa25";
const DEFAULT_LINK_HOME = "https://모두의사업친구.kr";

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

        const system = `당신은 대한민국 최고의 SNS 마케팅 카피라이터입니다. '모두의사업친구'(정부지원사업 AI 통합 매칭 플랫폼, 인천 청라 소재)의 홍보글을 씁니다.

[절대 지킬 규칙]
1. 가운뎃점(·, middot) 문자 절대 사용 금지. 쉼표나 줄바꿈, 하이픈(-)으로 대체.
2. 모든 글은 복사해서 그대로 붙여넣을 수 있는 평문. 마크다운 서식(**, ##, 리스트 기호) 쓰지 말 것.
3. "100% 승인" "무조건 됩니다" 같은 승인 보장 표현 금지. 대행 신청한다는 표현 금지(자문/안내만).
4. 공고에 없는 수치(금리, 한도, 마감일)를 지어내지 말 것. 모르면 "공고문에서 확인" 이라고 안내.
5. AI 티 나는 뻔한 문장 금지. 인천 소상공인 사장님이 실제로 반응할 진정성 있고 도발적인 후킹.

[채널별 노출 로직 - 반드시 채널마다 다르게 작성]
- 인스타그램(심층): 저장/공유 유도. 첫 줄 강한 후킹. 캐러셀 카드 8장 문구(카드1 표지~카드8 CTA)를 각각 만들고, 캡션, 해시태그(정확히 5개, 지역명+지원사업명 포함), 프로필 링크 안내를 블록으로 나눔. 링크는 인포크(${linkInpock}).
- 스레드(심층): 게시물 1개당 500자 제한 엄수. 본문 + 이어달기(체인) 3~4개로 나누고 각 블록에 "[본문]" "[이어달기 2]" 처럼 순서 표시. 첫 줄 훅, 반말 직설, 질문으로 끝내기. 마지막 이어달기에 인포크 링크(${linkInpock}).
- 네이버 블로그(간단): 검색 SEO. 제목에 지역명+지원사업명. 소제목 구조, 정보량 많이. 자사도메인(${linkHome}). 블록: 제목, 본문, 태그.
- 카카오톡 채널(간단): 짧게, 혜택/마감 먼저, 강한 CTA. 자사도메인(${linkHome}).
- 당근(간단): 동네 이웃 톤, 광고티 없이 "우리 동네 사장님" 정서. 자사도메인(${linkHome}).

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
인스타/스레드용(인포크): ${linkInpock}
블로그/카카오/당근용(자사도메인): ${linkHome}`;

        const completion = await client.chat.completions.create({
          model: process.env.OPENAI_SNS_MODEL || "gpt-4o",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.85,
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
