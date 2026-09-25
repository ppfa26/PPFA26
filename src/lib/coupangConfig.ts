// ════════════════════════════════════════════════════════════════
//  쿠팡 파트너스 배너 설정 (한 곳에서 관리)
//
//  ★ 대표님 안내 ★
//  카카오 애드핏을 전부 제거하고, 모든 광고 자리를 쿠팡 파트너스
//  다이나믹 배너로 통일했습니다. 배너 ID나 추적코드가 바뀌면
//  아래 값만 수정하면 사이트 전체에 반영됩니다.
// ════════════════════════════════════════════════════════════════

// 쿠팡 파트너스 다이나믹 배너 ID (콘솔에서 발급)
export const COUPANG_BANNER_ID = 1032887;
// 파트너스 성과 추적 코드
export const COUPANG_TRACKING_CODE = "AF6135516";
// 쿠팡 골드박스 고정 링크(자동 배너 에러 시 안전 대안 버튼)
export const COUPANG_GOLDBOX_LINK = "https://link.coupang.com/a/hkGw52HpTM";

// 다이나믹 배너 iframe src 생성기.
//  · width/height 는 노출 위치에 맞게 지정(넓은 자리 680, 좁은 모달 300).
export function coupangBannerSrc(width = 680, height = 140): string {
  return (
    `https://ads-partners.coupang.com/widgets.html` +
    `?id=${COUPANG_BANNER_ID}` +
    `&template=carousel` +
    `&trackingCode=${COUPANG_TRACKING_CODE}` +
    `&subId=&width=${width}&height=${height}&tsource=`
  );
}

// 기본(넓은 자리 · 728px 배너 자리 대체) 배너 src
export const COUPANG_BANNER_SRC = coupangBannerSrc(680, 140);
