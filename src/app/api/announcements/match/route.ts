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
//  (정확도 보강) 억지매칭 방지를 위해 '가점만' 하는 키워드. 없는 수치·자격을 만들지 않는다.
const TOPIC_KEYWORDS: Record<string, string[]> = {
  제조업: ["제조", "스마트공장", "공장", "생산", "설비"],
  수출업: ["수출", "해외", "글로벌", "무역", "해외진출", "바이어"],
  서비스업: ["서비스", "용역"],
  도소매업: ["소상공인", "유통", "상점", "도소매", "판로"],
  음식점업: ["소상공인", "외식", "음식", "요식", "식당"],
  정책자금: ["자금", "융자", "대출", "보증", "이차보전"],
  정부지원금: ["지원", "보조", "바우처", "지원금", "출연"],
  창업지원: ["창업", "스타트업", "예비창업", "초기창업"],
  바우처: ["바우처"],
  인증: ["인증", "특허", "지식재산", "벤처", "이노비즈", "메인비즈"],
  교육: ["교육", "컨설팅", "멘토링", "아카데미"],
  창업자금: ["창업", "자금"],
  운전자금: ["운전자금", "경영", "자금", "경영안정"],
  시설자금: ["시설", "설비", "장비", "임차"],
  수출자금: ["수출", "글로벌", "무역금융"],
  "인증및특허": ["인증", "특허", "지식재산", "R&D", "기술개발"],
  기술개발: ["R&D", "기술개발", "연구개발", "혁신"],
  디지털전환: ["디지털", "스마트", "AI", "빅데이터", "온라인"],
};

function normList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  if (typeof v === "string" && v) return [v];
  return [];
}

// (정확도) 신청기간 원문에서 '마감일'을 뽑아 이미 끝난 공고인지 판정.
//   deadline 예: "2026-07-20 ~ 2026-08-14" / "~ 2026.08.14" / "2026-08-14"
//   - 날짜를 못 찾으면(상시/미정 등) '살아있는 것'으로 간주해 노출 유지(공고 누락 방지).
//   - 마지막으로 등장하는 날짜(=종료일)를 마감일로 본다.
function isExpired(deadline: string | null | undefined, today: Date): boolean {
  if (!deadline) return false;
  // yyyy-mm-dd / yyyy.mm.dd / yyyy/mm/dd 형태를 모두 수용
  const matches = deadline.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/g);
  if (!matches || matches.length === 0) return false; // 날짜 불명 → 노출 유지
  const last = matches[matches.length - 1];
  const parts = last.split(/[.\-/]/).map((n) => parseInt(n, 10));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return false;
  const [y, m, d] = parts;
  // 마감일은 '그날 23:59까지 유효'로 보고, 마감일 자정 다음날부터 만료 처리
  const end = new Date(y, m - 1, d, 23, 59, 59);
  return end.getTime() < today.getTime();
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
    const allRows: Announcement[] = data || [];

    // (정확도) 이미 마감된 공고는 "지금 열려있는 지원사업"에서 제외.
    //   단, 날짜가 불명확한(상시/미정) 공고는 그대로 살려 노출한다.
    const today = new Date();
    const rows = allRows.filter((r) => !isExpired(r.deadline, today));

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

    // 점수 높은 순 → 동점이면 최신순(rows가 이미 crawled_at desc). 안정 정렬 유지.
    scored.sort((a, b) => b.score - a.score);

    // (정확도) 실제로 프로필과 '관련 있는'(score > 0) 공고만 우선 노출한다.
    //   → 프로필과 무관한 공고가 결과창에 섞여 신뢰도를 떨어뜨리는 문제 해결.
    const related = scored.filter((s) => s.score > 0).map((s) => s.r);

    let top: Announcement[];
    let fallback = false;
    if (related.length >= 3) {
      // 관련 공고가 충분하면 그중 상위 5건만 (무관 공고 섞지 않음)
      top = related.slice(0, 5);
    } else {
      // 관련 공고가 너무 적으면(지역/업종 정보 부족 등) 최신 공고로 5건까지 보충.
      //   이 경우 '추천'이 아니라 '최근 열린 공고 참고용'임을 fallback 플래그로 알림.
      const seen = new Set(related.map((r) => r.detail_url || r.title));
      const filler = rows
        .filter((r) => !seen.has(r.detail_url || r.title))
        .slice(0, 5 - related.length);
      top = [...related, ...filler];
      fallback = related.length === 0;
    }

    return NextResponse.json({
      items: top,
      source: "기업마당",
      fallback, // true면 '맞춤 추천'이 아닌 '최근 공고 참고'
      matched_by: {
        region: regionKw,
        topics: topicKw,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ items: [], note: e?.message || "매칭 실패" });
  }
}
