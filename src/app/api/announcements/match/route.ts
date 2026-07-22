import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ────────────────────────────────────────────────────────────────
// 진단 프로필과 관련 있는 "지금 열려있는 실제 정부지원사업 공고"를 추려서 반환.
//   출처: 기업마당(crawled_announcements, source='기업마당')
//   방식: 프로필의 지역·업종·관심분야 키워드로 공고 텍스트를 매칭 → 점수순 상위 N건
//   ※ AI 미사용(비용 0). 순수 키워드 스코어링.
// ────────────────────────────────────────────────────────────────

type Announcement = {
  title: string;
  site_name: string | null;
  deadline: string | null;
  target: string | null;
  support_scale: string | null;
  detail_url: string | null;
  source: string | null;
};

// 지역명 → 매칭 키워드(광역시/도 축약 포함)
const REGION_KEYWORDS: Record<string, string[]> = {
  서울: ["서울"],
  부산: ["부산"],
  대구: ["대구"],
  인천: ["인천"],
  광주: ["광주"],
  대전: ["대전"],
  울산: ["울산"],
  세종: ["세종"],
  경기: ["경기"],
  강원: ["강원"],
  충북: ["충북", "충청북도"],
  충남: ["충남", "충청남도"],
  전북: ["전북", "전라북도"],
  전남: ["전남", "전라남도"],
  경북: ["경북", "경상북도"],
  경남: ["경남", "경상남도"],
  제주: ["제주"],
};

// 업종/관심분야 → 공고에서 찾을 키워드
const TOPIC_KEYWORDS: Record<string, string[]> = {
  제조업: ["제조", "스마트공장", "공장"],
  수출업: ["수출", "해외", "글로벌", "무역"],
  서비스업: ["서비스"],
  도소매업: ["소상공인", "유통", "상점"],
  음식점업: ["소상공인", "외식", "음식"],
  정책자금: ["자금", "융자", "대출"],
  정부지원금: ["지원", "보조", "바우처"],
  창업지원: ["창업", "스타트업"],
  바우처: ["바우처"],
  인증: ["인증", "특허", "지식재산"],
  교육: ["교육", "컨설팅"],
  창업자금: ["창업", "자금"],
  운전자금: ["운전자금", "경영", "자금"],
  시설자금: ["시설", "설비", "장비"],
  수출자금: ["수출", "글로벌"],
  "인증및특허": ["인증", "특허"],
};

function normList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  if (typeof v === "string" && v) return [v];
  return [];
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json({ items: [], note: "DB 미설정" });
    }

    const profile = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // 프로필에서 지역/업종/관심 키워드 뽑기
    const region = typeof profile.region === "string" ? profile.region : "";
    const industries = [
      ...normList(profile.industries),
      ...(typeof profile.industry === "string" ? [profile.industry] : []),
    ];
    const topics = [...normList(profile.interests), ...normList(profile.purposes)];
    const businessType = typeof profile.businessType === "string" ? profile.businessType : "";
    const revenue = typeof profile.revenue === "string" ? profile.revenue : "";
    const employees = typeof profile.employees === "string" ? profile.employees : "";

    // 규모 판정: 매출/직원수가 작으면 '소상공인' 성격, 크면 '중소기업' 성격
    //  → 공고 대상(소상공인/중소기업/창업 등)과 맞춰 가점
    const isSmall =
      revenue.includes("없음") ||
      revenue.includes("1억") ||
      employees.includes("0명") ||
      employees.includes("5명");
    const isMidLarge =
      revenue.includes("5억이상") || employees.includes("10명이상");
    const isStartup =
      businessType.includes("예비") ||
      (typeof profile.years === "string" &&
        (profile.years.includes("예정") || profile.years.includes("1년미만")));

    const regionKwSet = new Set<string>();
    for (const [name, kws] of Object.entries(REGION_KEYWORDS)) {
      if (region.includes(name)) kws.forEach((k) => regionKwSet.add(k));
    }
    const topicKwSet = new Set<string>();
    for (const t of [...industries, ...topics]) {
      const kws = TOPIC_KEYWORDS[t];
      if (kws) kws.forEach((k) => topicKwSet.add(k));
    }
    const regionKw = Array.from(regionKwSet);
    const topicKw = Array.from(topicKwSet);

    const supabase = createClient(url, key);
    // 기업마당 실공고 우선, 최신순으로 넉넉히 가져와 프론트 없이 서버에서 스코어링
    const { data, error } = await supabase
      .from("crawled_announcements")
      .select("title, site_name, deadline, target, support_scale, detail_url, source")
      .eq("source", "기업마당")
      .order("crawled_at", { ascending: false })
      .limit(300);

    if (error) {
      return NextResponse.json({ items: [], note: error.message });
    }
    const rows: Announcement[] = data || [];

    // 스코어링: 지역 일치 +3, 업종/관심 키워드 일치마다 +2, 전국형(지역표기 없음) 소폭 가점
    const scored = rows.map((r) => {
      const hay = `${r.title || ""} ${r.target || ""} ${r.support_scale || ""} ${r.site_name || ""}`;
      let score = 0;

      // 지역: 프로필 지역 키워드가 있으면 가점, 다른 특정 지역만 콕 집은 공고는 감점
      let regionHit = false;
      if (regionKw.length > 0) {
        for (const k of regionKw) if (hay.includes(k)) { score += 3; regionHit = true; }
        // 다른 지역명이 붙어있고 내 지역이 아니면 -2 (지자체 타지역 공고 배제)
        if (!regionHit) {
          for (const [nm, kws] of Object.entries(REGION_KEYWORDS)) {
            if (region.includes(nm)) continue;
            if (kws.some((k) => hay.includes(k))) { score -= 2; break; }
          }
        }
      }

      for (const k of topicKw) if (hay.includes(k)) score += 2;

      // 규모/유형 매칭: 사업장 규모가 공고 대상과 맞으면 가점
      //  · 소상공인 규모(매출↓·직원↓) → '소상공인' 공고 +2
      //  · 중소기업 규모(매출↑·직원↑) → '중소기업/중견' 공고 +2
      //  · 예비/초기 창업 → '창업/스타트업' 공고 +2
      if (isSmall && /소상공인|소기업|1인/.test(hay)) score += 2;
      if (isMidLarge && /중소기업|중견|기업/.test(hay)) score += 2;
      if (isStartup && /창업|스타트업|예비창업|초기/.test(hay)) score += 2;

      return { r, score };
    });

    // 점수 높은 순 → 동점이면 최신순(원래 순서 유지)
    scored.sort((a, b) => b.score - a.score);

    // 상위 5건. 단, 아무 키워드도 안 걸려 전부 0점이면 그냥 최신 5건.
    const top = scored.slice(0, 5).map((s) => s.r);

    return NextResponse.json({
      items: top,
      source: "기업마당",
      matched_by: {
        region: regionKw,
        topics: topicKw,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ items: [], note: e?.message || "매칭 실패" });
  }
}
