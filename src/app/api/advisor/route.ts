import { NextRequest, NextResponse } from "next/server";
import { retrieve, buildDisclaimer } from "@/lib/knowledge";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AI 답변 원칙:
// 1차 참조: 40+개 공식 공문 (officialDocs) 팩트체크
// 2차 확인: 89개 사이트 크롤링 최신 정보
// 답변 하단: 필수 표기 (공문명·사이트명·승인 보장 없음·재확인)

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "질문을 입력해주세요." }, { status: 400 });
    }

    // 1) Retrieval: 관련 공문·사이트·프로그램 검색
    const ctx = retrieve(question);
    const disclaimer = buildDisclaimer(
      ctx.docs.map((d) => d.title),
      ctx.sites.map((s) => s.name)
    );

    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL;

    // LLM 사용 가능하면 RAG 생성, 아니면 규칙 기반 폴백
    if (apiKey && apiKey !== "__INJECTED_AT_RUNTIME__" && baseURL) {
      try {
        const client = new OpenAI({ apiKey, baseURL });
        const contextText = [
          "## 참조 공문 (1차 팩트체크 출처)",
          ...ctx.docs.map((d) => `- ${d.title}`),
          "## 참조 공식 사이트 (2차 최신 확인)",
          ...ctx.sites.map((s) => `- ${s.name}: ${s.url}`),
          "## 관련 지원사업 정보",
          ...ctx.programs.map(
            (p) =>
              `- ${p.name} (${p.organization}): ${p.summary} / 신청처: ${p.applySite}(${p.applyUrl}) / 전략: ${p.strategy}`
          ),
        ].join("\n");

        const system = `당신은 '모두의사업친구'의 정책자금·정부지원사업 자문 전문가입니다.
반드시 지킬 원칙:
1. 대행 신청을 하지 않으며, "저희가 대신 신청해드립니다" 같은 표현을 절대 쓰지 않습니다. 오직 "방법을 알려드리는 자문"만 합니다.
2. 승인을 보장하지 않습니다. "100% 승인" 같은 표현 금지.
3. 아래 제공된 참조 자료(공문·사이트·프로그램)에 근거해서만 답변합니다. 모르면 "최신 공고 확인이 필요합니다"라고 안내합니다.
4. 신청 방법, 필요 서류, 신청 사이트, 승인 확률을 높이는 전략을 친절하게 알려줍니다.
5. 답변은 한국어로, 소상공인·중소기업 대표가 이해하기 쉽게 작성합니다.

[참조 자료]
${contextText}`;

        const completion = await client.chat.completions.create({
          model: "gpt-5-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: question },
          ],
        });

        const answer =
          completion.choices[0]?.message?.content?.trim() ||
          "죄송합니다. 답변을 생성하지 못했습니다.";

        return NextResponse.json({
          answer: answer + disclaimer,
          sources: { docs: ctx.docs, sites: ctx.sites, programs: ctx.programs },
          mode: "rag",
        });
      } catch (e) {
        // LLM 실패 시 폴백으로 진행
      }
    }

    // 규칙 기반 폴백 답변
    let fallback = "";
    if (ctx.programs.length > 0) {
      fallback =
        `질문하신 내용과 관련해 다음 지원사업을 참고하시면 좋겠습니다.\n\n` +
        ctx.programs
          .map(
            (p, i) =>
              `${i + 1}. ${p.name} (${p.organization})\n   - ${p.summary}\n   - 신청처: ${p.applySite} (${p.applyUrl})\n   - 💡 전략: ${p.strategy}`
          )
          .join("\n\n");
    } else {
      fallback =
        "질문 주신 내용에 정확히 부합하는 자료를 찾지 못했습니다. '정책자금', '창업지원', '수출바우처', '재도전' 등 구체적인 키워드로 다시 질문해주시면 관련 지원사업과 신청 방법을 안내해드리겠습니다.";
    }

    return NextResponse.json({
      answer: fallback + disclaimer,
      sources: { docs: ctx.docs, sites: ctx.sites, programs: ctx.programs },
      mode: "fallback",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
