import { OFFICIAL_DOCS } from "./officialDocs";
import { CRAWL_SITES } from "./crawlSites";
import { PROGRAMS } from "./programs";

// 간단한 키워드 기반 검색 (RAG의 retrieval 단계)
// 실제 임베딩 벡터 검색은 Supabase pgvector로 확장 가능하나,
// 여기서는 안정적이고 비용이 없는 키워드 매칭으로 관련 문서를 찾습니다.

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export type Retrieved = {
  docs: { title: string; url: string }[];
  sites: { name: string; url: string }[];
  programs: { name: string; organization: string; summary: string; applySite: string; applyUrl: string; strategy: string }[];
};

export function retrieve(query: string): Retrieved {
  const tokens = tokenize(query);
  const score = (text: string) => {
    const lower = text.toLowerCase();
    return tokens.reduce((acc, t) => acc + (lower.includes(t) ? 1 : 0), 0);
  };

  const docs = OFFICIAL_DOCS.map((d) => ({ d, s: score(d.title) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map((x) => ({ title: x.d.title, url: x.d.url }));

  const sites = CRAWL_SITES.map((c) => ({ c, s: score(c.name) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map((x) => ({ name: x.c.name, url: x.c.url }));

  const programs = PROGRAMS.map((p) => ({
    p,
    s: score(p.name + " " + p.summary + " " + p.organization + " " + p.target.join(" ")),
  }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => ({
      name: x.p.name,
      organization: x.p.organization,
      summary: x.p.summary,
      applySite: x.p.applySite,
      applyUrl: x.p.applyUrl,
      strategy: x.p.strategy,
    }));

  return { docs, sites, programs };
}

// 답변 하단 필수 표기 생성
export function buildDisclaimer(docNames: string[], siteNames: string[]): string {
  const doc = docNames.length ? docNames.slice(0, 2).join(", ") : "공식 공문 자료";
  const site = siteNames.length ? siteNames.slice(0, 2).join(", ") : "공식 사이트";
  return `\n\n📌 본 답변은 [${doc}] 및 [${site}] 최신 공고를 기반으로 작성되었습니다.\n⚠️ 본 서비스는 자문 서비스이며 승인을 보장하지 않습니다.\n🔍 최종 확정 전 반드시 공식 사이트에서 재확인하세요.`;
}
