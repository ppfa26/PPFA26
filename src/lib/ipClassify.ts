// ============================================================
// IP 분류 유틸 (표시 전용 · 차단 로직 아님)
// ------------------------------------------------------------
//   목적: 관리자 대시보드에서 "데이터센터/클라우드 서버(봇 의심)" IP를
//         뱃지로 표시만 한다. 실제 차단은 대표님이 직접 판단해서 누른다.
//
//   ★안전 설계★
//   · 외부 API 호출 0 (완전 오프라인, 내장 CIDR 목록만 사용)
//   · 순수 함수 (서비스 로직 · 고객 경로에 영향 0)
//   · 어느 대역에도 안 걸리면 무조건 "일반"으로 판정 (오탐 최소화)
//   · 판별 대상은 클라우드/호스팅 사업자 대역뿐.
//     KR 일반 통신사(KT·SKT·LGU+ 등) IP는 애초에 목록에 없으므로
//     실사용자가 봇으로 잘못 분류되는 일은 구조적으로 불가능.
// ============================================================

// 데이터센터/클라우드 대표 IP 대역 (CIDR)
//   실제 로그에서 확인된 사업자 + 국내 웹앱을 스캔하는 주요 클라우드 위주.
//   필요 시 여기에 CIDR 한 줄만 추가하면 즉시 반영됨.
type Range = { label: string; cidrs: string[] };

const DATACENTER_RANGES: Range[] = [
  {
    label: "Tencent Cloud",
    // AS132203 / AS45090 텐센트 클라우드 주요 대역
    cidrs: [
      "170.106.0.0/16",
      "43.128.0.0/14",
      "43.132.0.0/14",
      "49.51.0.0/16",
      "62.234.0.0/16",
      "101.32.0.0/16",
      "119.28.0.0/15",
      "129.28.0.0/16",
      "150.109.0.0/16",
    ],
  },
  {
    label: "DigitalOcean",
    // AS14061 디지털오션
    cidrs: [
      "209.38.0.0/16",
      "104.131.0.0/16",
      "104.236.0.0/16",
      "138.68.0.0/16",
      "138.197.0.0/16",
      "142.93.0.0/16",
      "143.110.128.0/17",
      "146.190.0.0/16",
      "157.230.0.0/16",
      "159.65.0.0/16",
      "159.89.0.0/16",
      "161.35.0.0/16",
      "164.90.0.0/16",
      "165.22.0.0/16",
      "165.227.0.0/16",
      "167.71.0.0/16",
      "167.99.0.0/16",
      "174.138.0.0/16",
      "178.62.0.0/16",
      "188.166.0.0/16",
      "206.189.0.0/16",
    ],
  },
  {
    label: "Amazon AWS",
    cidrs: [
      "3.0.0.0/8",
      "13.32.0.0/15",
      "13.52.0.0/16",
      "15.164.0.0/15", // 서울 리전 포함
      "18.0.0.0/8",
      "34.192.0.0/10",
      "35.152.0.0/13",
      "43.200.0.0/14", // 서울 리전
      "52.0.0.0/10",
      "54.0.0.0/8",
      "99.77.128.0/17",
    ],
  },
  {
    label: "Google Cloud",
    cidrs: [
      "34.64.0.0/10",
      "35.184.0.0/13",
      "35.192.0.0/14",
      "35.196.0.0/15",
      "35.198.0.0/16",
      "35.200.0.0/13",
      "104.154.0.0/15",
      "104.196.0.0/14",
      "130.211.0.0/16",
      "146.148.0.0/17",
    ],
  },
  {
    label: "Microsoft Azure",
    cidrs: [
      "13.64.0.0/11",
      "20.0.0.0/8",
      "40.64.0.0/10",
      "52.224.0.0/11",
      "104.40.0.0/13",
      "137.116.0.0/15",
      "168.61.0.0/16",
      "191.232.0.0/13",
    ],
  },
  {
    label: "Oracle Cloud",
    cidrs: ["129.146.0.0/16", "132.145.0.0/16", "140.238.0.0/16", "150.230.0.0/16"],
  },
  {
    label: "OVH / Hetzner / Linode 등 호스팅",
    cidrs: [
      "51.68.0.0/14", // OVH
      "51.75.0.0/16", // OVH
      "51.79.0.0/16", // OVH
      "5.9.0.0/16", // Hetzner
      "88.99.0.0/16", // Hetzner
      "95.216.0.0/15", // Hetzner
      "116.202.0.0/15", // Hetzner
      "45.33.0.0/16", // Linode
      "45.79.0.0/16", // Linode
      "139.162.0.0/16", // Linode
      "172.104.0.0/15", // Linode
      "173.255.192.0/18", // Linode
    ],
  },
  {
    label: "Alibaba Cloud",
    cidrs: ["47.74.0.0/15", "47.88.0.0/14", "47.235.0.0/16", "8.208.0.0/13", "149.129.0.0/16"],
  },
];

// IPv4 문자열 → 32bit 정수. 형식이 이상하면 null.
function ipToInt(ip: string): number | null {
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map((n) => Number(n));
  if (parts.some((n) => n < 0 || n > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

// CIDR("1.2.3.0/24") 안에 ip가 들어가는지
function inCidr(ipInt: number, cidr: string): boolean {
  const [base, bitsStr] = cidr.split("/");
  const baseInt = ipToInt(base);
  const bits = Number(bitsStr);
  if (baseInt === null || !Number.isFinite(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export type IpClass = {
  isDataCenter: boolean;
  provider: string | null; // 걸린 사업자 라벨 (없으면 null)
};

// IP 한 개를 분류. 어느 대역에도 안 걸리면 isDataCenter=false (일반).
export function classifyIp(ip: string | null | undefined): IpClass {
  if (!ip) return { isDataCenter: false, provider: null };
  const ipInt = ipToInt(ip);
  if (ipInt === null) return { isDataCenter: false, provider: null };
  for (const range of DATACENTER_RANGES) {
    for (const cidr of range.cidrs) {
      if (inCidr(ipInt, cidr)) {
        return { isDataCenter: true, provider: range.label };
      }
    }
  }
  return { isDataCenter: false, provider: null };
}

// 편의 함수 (뱃지 표시 판단용)
export function isDataCenterIp(ip: string | null | undefined): boolean {
  return classifyIp(ip).isDataCenter;
}
