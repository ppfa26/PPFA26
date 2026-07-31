// ────────────────────────────────────────────────────────────────
//  API 남용 방지용 경량 레이트리미터 (외부 DB·서비스 불필요)
//   · 목적: 국세청/AI(OpenAI, 유료) 등 서버 자원을 소모하는 엔드포인트를
//           봇·스크립트가 무제한 반복 호출하지 못하게 한다.
//   · 방식: 인메모리 슬라이딩 윈도우 카운터.
//           동일 인스턴스에서 IP(+키)별 최근 호출 시각을 기억하고,
//           윈도우(windowMs) 안에 max 회를 넘으면 429 로 막는다.
//   · 한계: Vercel 서버리스는 인스턴스가 여러 개일 수 있어 "완벽한 전역
//           카운트"는 아니다. 그러나 대부분의 자동화 남용은 같은 커넥션을
//           재사용하므로 실질적인 폭주(수십~수백 회/분)는 확실히 차단된다.
//           정상 사용자는 한도가 넉넉해 전혀 영향을 받지 않는다.
//   · 정상 사용자 보호: 한도는 "사람이 손으로 누를 수 있는 속도"보다 크게 잡는다.
// ────────────────────────────────────────────────────────────────

type Hit = { count: number; resetAt: number };

// 라우트별로 독립된 버킷을 쓰기 위해 (namespace → (key → Hit)) 2단 맵 사용.
const buckets = new Map<string, Map<string, Hit>>();

// 메모리 누수 방지: 가끔 만료된 항목을 청소한다.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return; // 1분에 한 번이면 충분
  lastSweep = now;
  // (구형 컴파일 타깃에서도 안전하도록 for..of 대신 forEach 사용)
  buckets.forEach((m) => {
    m.forEach((hit, k) => {
      if (hit.resetAt <= now) m.delete(k);
    });
  });
}

export interface RateLimitOptions {
  /** 버킷 이름(라우트 구분). 예: "advisor", "sns", "nts" */
  namespace: string;
  /** 윈도우 길이(ms). 예: 60_000 = 1분 */
  windowMs: number;
  /** 윈도우 내 허용 최대 호출 수 */
  max: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** 남은 허용 횟수 */
  remaining: number;
  /** 다음 리셋까지 남은 초 (429 응답의 Retry-After 용) */
  retryAfterSec: number;
}

/**
 * 호출자를 식별하는 키를 요청에서 뽑아낸다.
 *  · Vercel/Cloudflare 프록시가 붙여주는 x-forwarded-for / x-real-ip 우선.
 *  · 없으면 UA 일부를 fallback 으로 (최소한의 구분).
 */
export function clientKeyFromRequest(req: Request): string {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim(); // 첫 IP = 실제 클라이언트
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  // 최후 수단: UA (IP를 못 얻는 로컬/특수환경)
  return "ua:" + (h.get("user-agent") || "unknown").slice(0, 60);
}

/**
 * 레이트리밋 검사. ok=false 면 호출을 막아야 한다.
 * (검사와 동시에 카운트를 올리므로, 통과 시에만 실제 작업을 진행)
 */
export function rateLimit(clientKey: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);

  let m = buckets.get(opts.namespace);
  if (!m) {
    m = new Map<string, Hit>();
    buckets.set(opts.namespace, m);
  }

  const hit = m.get(clientKey);
  if (!hit || hit.resetAt <= now) {
    // 새 윈도우 시작
    m.set(clientKey, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.max - 1, retryAfterSec: 0 };
  }

  if (hit.count >= opts.max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)),
    };
  }

  hit.count += 1;
  return {
    ok: true,
    remaining: opts.max - hit.count,
    retryAfterSec: 0,
  };
}

/**
 * 라우트에서 바로 쓰는 헬퍼. 막혔으면 429 Response 를 돌려주고,
 * 통과면 null 을 돌려준다. (호출부: `const blocked = enforce(...); if (blocked) return blocked;`)
 */
export function enforceRateLimit(
  req: Request,
  opts: RateLimitOptions,
  message = "요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요."
): Response | null {
  const key = clientKeyFromRequest(req);
  const r = rateLimit(key, opts);
  if (r.ok) return null;
  return new Response(
    JSON.stringify({ error: message, retryAfter: r.retryAfterSec }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(r.retryAfterSec),
        "Cache-Control": "no-store",
      },
    }
  );
}
