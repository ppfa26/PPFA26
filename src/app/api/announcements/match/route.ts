import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ────────────────────────────────────────────────────────────────
// 진단 프로필과 관련 있는 "지금 열려있는 실제 정부지원사업 공고"를 추려서 반환.
//   출처: crawled_announcements (기업마당 · K-Startup · 중소벤처24)
//   방식: 프로필의 지역·업종·관심분야 키워드로 공고 텍스트를 매칭 → 점수순 상위 N건
//   ※ AI 미사용(비용 0). 순수 키워드 스코어링.
//
//  ★ 성격별 분류(대표님 요청 2026-07):
//     공고를 '소스'가 아니라 '성격'으로 나눠 결과창의 기존 아코디언에 그대로 넣는다.
//       · 창업(startup) → 🌱 예비·초기·청년창업자 지원사업 아코디언
//       · 융자(loan)    → 💳 정책금융상품 아코디언
//       · 그 외(etc)    → 📢 그 외 놓치기 쉬운 지원사업 아코디언
//     새 아코디언을 만들지 않는다(UI 단순 유지). support_scale/제목/대상 키워드로 판정.
//     ⚠️ 가짜·추정 데이터 삽입 없음. 공고 원문 그대로 노출.
// ────────────────────────────────────────────────────────────────

// 이 API가 실제로 조회하는 공고 소스(크롤러 3종과 일치). 순서=병합 시 우선순위.
const WANTED_SOURCES = ["기업마당", "K-Startup", "중소벤처24"] as const;

type Announcement = {
  title: string;
  site_name: string | null;
  deadline: string | null;
  target: string | null;
  support_scale: string | null;
  detail_url: string | null;
  source: string | null;
};

// 공고 성격 분류 결과
type Nature = "startup" | "loan" | "etc";

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

// ────────────────────────────────────────────────────────────────
// 성격 분류(창업 / 융자 / 그 외)
//   판정 근거(우선순위):
//     1) support_scale(지원분야/사업분류/지원유형) — 소스 OpenAPI가 준 대분류
//          · 기업마당: 수출/기술/경영/내수/인력/창업/금융/기타
//          · K-Startup: 시설·공간·보육/멘토링·컨설팅·교육/사업화/행사·네트워크/창업교육/판로·해외진출/글로벌/정책자금 …
//     2) 제목·대상 텍스트의 키워드(융자/창업)
//   규칙:
//     · 융자(loan)  : '금융/정책자금' 분야 또는 융자·대출·보증·자금·이차보전 키워드
//     · 창업(startup): '창업' 계열 분야 또는 창업·스타트업·예비창업·1인창조기업 키워드
//     · 그 외(etc)  : 위에 안 걸리는 전부(수출·기술·경영·내수·인력·행사·판로 등)
//   ※ 실제 공고 텍스트만 근거로 판정 — 없는 성격을 지어내지 않는다.
// ────────────────────────────────────────────────────────────────

// 융자 성격을 강하게 시사하는 support_scale(정확 일치/부분 일치)
const LOAN_SCALE = ["금융", "정책자금", "융자", "자금지원"];
// 융자 성격 키워드(제목·대상)
const LOAN_KW = /융자|대출|보증|이차보전|운전자금|시설자금|정책자금|자금지원|저리|저금리|상환/;

// 창업 성격을 강하게 시사하는 support_scale
const STARTUP_SCALE = [
  "창업",
  "창업교육",
  "사업화",
  "시설ㆍ공간ㆍ보육",
  "시설·공간·보육",
  "행사ㆍ네트워크",
  "행사·네트워크",
  "멘토링ㆍ컨설팅ㆍ교육",
  "멘토링·컨설팅·교육",
];
// 창업 성격 키워드(제목·대상)
const STARTUP_KW = /창업|스타트업|예비창업|초기창업|1인\s?창조기업|액셀러레이|인큐베이|예비\s?창업|재도전|창업기업|창업자/;

function classifyNature(r: Announcement): Nature {
  const scale = (r.support_scale || "").trim();
  // ⚠️ target(지원대상)은 "정책자금·보증 연계를 희망하는 기업" 같은 '대상 설명'이 많아
  //    융자 키워드 오탐을 크게 유발한다. → 융자 판정은 '제목 + 지원분야(scale)'로만.
  //    (창업 판정은 target 포함해도 안전 — 창업 대상 설명은 곧 창업 성격이므로.)
  const titleScale = `${r.title || ""} ${r.support_scale || ""}`;
  const fullHay = `${r.title || ""} ${r.target || ""} ${r.support_scale || ""}`;

  // 1) 융자: 지원분야가 '금융/정책자금'이거나, 제목/분야에 순수 대출·보증·융자 신호가 있을 때만.
  if (LOAN_SCALE.some((s) => scale.includes(s))) return "loan";
  if (LOAN_KW.test(titleScale)) return "loan";

  // 2) 창업: 창업 계열 지원분야이거나, 제목/대상에 창업 신호가 있을 때.
  if (STARTUP_SCALE.some((s) => scale === s || scale.includes(s))) return "startup";
  if (STARTUP_KW.test(fullHay)) return "startup";

  // 3) 그 외
  return "etc";
}

// ────────────────────────────────────────────────────────────────
// 스코어링(기존 로직 유지) - 프로필 관련성 점수를 매겨 상위만 노출
// ────────────────────────────────────────────────────────────────
type ProfileFlags = {
  regionKw: string[];
  topicKw: string[];
  region: string;
  isSmall: boolean;
  isMidLarge: boolean;
  isStartup: boolean;
};

function scoreRow(r: Announcement, f: ProfileFlags): number {
  const hay = `${r.title || ""} ${r.target || ""} ${r.support_scale || ""} ${r.site_name || ""}`;
  let score = 0;

  // 지역: 프로필 지역 키워드가 있으면 가점, 다른 특정 지역만 콕 집은 공고는 감점
  let regionHit = false;
  if (f.regionKw.length > 0) {
    for (const k of f.regionKw) if (hay.includes(k)) { score += 3; regionHit = true; }
    if (!regionHit) {
      for (const [nm, kws] of Object.entries(REGION_KEYWORDS)) {
        if (f.region.includes(nm)) continue;
        if (kws.some((k) => hay.includes(k))) { score -= 2; break; }
      }
    }
  }

  for (const k of f.topicKw) if (hay.includes(k)) score += 2;

  // 규모/유형 매칭: 사업장 규모가 공고 대상과 맞으면 가점
  if (f.isSmall && /소상공인|소기업|1인/.test(hay)) score += 2;
  if (f.isMidLarge && /중소기업|중견|기업/.test(hay)) score += 2;
  if (f.isStartup && /창업|스타트업|예비창업|초기/.test(hay)) score += 2;

  return score;
}

// 한 버킷(창업/융자/그외) 안에서 점수순 상위 N건 + 부족 시 최신 보충(fallback)
function pickTop(rows: Announcement[], f: ProfileFlags, limit: number) {
  const scored = rows.map((r) => ({ r, score: scoreRow(r, f) }));
  // 점수 높은 순 → 동점이면 입력 순서(=최신순) 유지. 안정 정렬.
  scored.sort((a, b) => b.score - a.score);

  const related = scored.filter((s) => s.score > 0).map((s) => s.r);

  let top: Announcement[];
  let fallback = false;
  if (related.length >= 3) {
    top = related.slice(0, limit);
  } else {
    // 관련 공고가 너무 적으면 최신 공고로 보충(참고용). 무관 공고를 섞었음을 fallback으로 알림.
    const seen = new Set(related.map((r) => r.detail_url || r.title));
    const filler = rows
      .filter((r) => !seen.has(r.detail_url || r.title))
      .slice(0, Math.max(0, limit - related.length));
    top = [...related, ...filler];
    fallback = related.length === 0;
  }
  return { top, fallback };
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json({ items: [], startup: [], loan: [], etc: [], note: "DB 미설정" });
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
    const flags: ProfileFlags = {
      regionKw: Array.from(regionKwSet),
      topicKw: Array.from(topicKwSet),
      region,
      isSmall,
      isMidLarge,
      isStartup,
    };

    const supabase = createClient(url, key);
    // 3개 소스 실공고를 최신순으로 넉넉히 가져와 서버에서 성격 분류 + 스코어링.
    //  (창업/융자는 그외보다 물량이 적어 충분히 확보하려면 넉넉히 조회)
    const { data, error } = await supabase
      .from("crawled_announcements")
      .select("title, site_name, deadline, target, support_scale, detail_url, source")
      .in("source", WANTED_SOURCES as unknown as string[])
      .order("crawled_at", { ascending: false })
      .limit(700);

    if (error) {
      return NextResponse.json({ items: [], startup: [], loan: [], etc: [], note: error.message });
    }
    const allRows: Announcement[] = data || [];

    // (정확도) 이미 마감된 공고는 "지금 열려있는 지원사업"에서 제외. 날짜 불명(상시)은 유지.
    const today = new Date();
    const rows = allRows.filter((r) => !isExpired(r.deadline, today));

    // 성격별로 3버킷 분류
    const startupRows: Announcement[] = [];
    const loanRows: Announcement[] = [];
    const etcRows: Announcement[] = [];
    for (const r of rows) {
      const nature = classifyNature(r);
      if (nature === "startup") startupRows.push(r);
      else if (nature === "loan") loanRows.push(r);
      else etcRows.push(r);
    }

    // 각 버킷에서 프로필 관련성 상위만 추림.
    //  · 창업/융자는 아코디언 내부 '보조 목록'이라 상위 3건씩(하드코딩 사업과 함께 나열)
    //  · 그 외(📢)는 독립 카드라 기존과 동일하게 상위 5건
    const startupPick = pickTop(startupRows, flags, 3);
    const loanPick = pickTop(loanRows, flags, 3);
    const etcPick = pickTop(etcRows, flags, 5);

    return NextResponse.json({
      // ★ 하위호환: 기존 프론트가 items(=그 외)를 읽어도 동작하도록 etc를 items로도 노출
      items: etcPick.top,
      startup: startupPick.top,
      loan: loanPick.top,
      etc: etcPick.top,
      // fallback: 각 버킷별로 알려주되, 최상위 items(그외)의 fallback을 대표값으로도 유지
      fallback: etcPick.fallback,
      fallback_by: {
        startup: startupPick.fallback,
        loan: loanPick.fallback,
        etc: etcPick.fallback,
      },
      matched_by: {
        region: flags.regionKw,
        topics: flags.topicKw,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ items: [], startup: [], loan: [], etc: [], note: e?.message || "매칭 실패" });
  }
}
