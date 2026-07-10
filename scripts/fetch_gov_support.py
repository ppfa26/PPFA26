# -*- coding: utf-8 -*-
# ═════════════════════════════════════════════════════════════════════════
#  【BLOCK 8】기업마당 지원사업 API 자동 수집기
#
#  ⚠️ 이 스크립트는 웹앱(Cloudflare/Vercel) 런타임에서 실행되지 않습니다.
#     대표님 PC 또는 서버에서 "매년 1월(또는 주기적)" 수동/배치 실행하여
#     gov_support_db.json 을 갱신하는 용도입니다.
#
#  공식 Endpoint: https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do
#  사전 준비: pip install requests
#  인증키 발급: bizinfo.go.kr 페이지 하단 "API 사용 신청"에서 즉시 발급(무료)
#
#  실행:  python scripts/fetch_gov_support.py
# ═════════════════════════════════════════════════════════════════════════

import requests
import json
from datetime import datetime


class BizinfoAPI:
    ENDPOINT = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do"

    # 지원분야 코드 (공식 원문)
    FIELD_CODES = {
        "금융": "01", "기술": "02", "인력": "03",
        "수출": "04", "내수": "05", "창업": "06",
        "경영": "07", "기타": "09"
    }

    # 지역 해시태그 (공식 원문)
    REGIONS = [
        "서울", "부산", "대구", "인천", "전남광주",
        "대전", "울산", "세종", "경기", "강원",
        "충북", "충남", "전북", "경북", "경남", "제주"
    ]

    def __init__(self, api_key):
        self.api_key = api_key

    def search(self, field=None, region=None, count=100, page=1, page_size=100):
        """지원사업 조회"""
        params = {
            "crtfcKey": self.api_key,
            "dataType": "json",
            "searchCnt": count,
            "pageIndex": page,
            "pageUnit": page_size
        }

        if field and field in self.FIELD_CODES:
            params["searchLclasId"] = self.FIELD_CODES[field]

        tags = []
        if region:
            tags.append(region)
        if tags:
            params["hashtags"] = ",".join(tags)

        try:
            response = requests.get(self.ENDPOINT, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            items = data.get("jsonArray", [])

            return {
                "success": True,
                "total": len(items),
                "items": [self._parse(item) for item in items]
            }
        except Exception as e:
            return {"success": False, "total": 0, "items": [], "error": str(e)}

    def _parse(self, item):
        """응답을 매칭 프로그램용 스키마로 변환"""
        return {
            "id": item.get("pblancId"),
            "name": item.get("pblancNm"),
            "url": item.get("pblancUrl"),
            "apply_url": item.get("rceptEngnHmpgUrl"),
            "summary": item.get("bsnsSumryCn"),
            "apply_method": item.get("reqstMthPapersCn"),
            "field": item.get("pldirSportRealmLclasCodeNm"),
            "hashtags": (item.get("hashTags") or "").split(","),
            "organizer": item.get("jrsdInsttNm"),
            "operator": item.get("excInsttNm"),
            "contact": item.get("refrncNm"),
            "target": item.get("trgetNm"),
            "period": item.get("reqstBeginEndDe"),
            "view_count": int(item.get("inqireCo", 0)) if str(item.get("inqireCo", "")).isdigit() else 0,
            "registered_at": item.get("creatPnttm")
        }

    def search_all_pages(self, field=None, region=None, max_pages=10):
        """페이징 자동 처리"""
        all_items = []
        for page in range(1, max_pages + 1):
            result = self.search(field=field, region=region, page=page, page_size=100)
            if not result["success"] or not result["items"]:
                break
            all_items.extend(result["items"])
            if len(result["items"]) < 100:
                break
        return all_items


def update_matching_db(api_key, output_path="gov_support_db.json"):
    """매일/주기 자동 실행용 - 매칭 프로그램 DB 갱신"""
    client = BizinfoAPI(api_key)
    all_data = {}

    for field in ["금융", "기술", "인력", "수출", "내수", "창업", "경영", "기타"]:
        items = client.search_all_pages(field=field, max_pages=10)
        for item in items:
            if item["id"]:
                all_data[item["id"]] = item
        print(f"[{field}] {len(items)}건")

    result = {
        "last_updated": datetime.now().isoformat(),
        "source": "기업마당 API (bizinfo.go.kr)",
        "total_count": len(all_data),
        "programs": list(all_data.values())
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"[완료] {len(all_data)}건 -> {output_path}")
    return result


# ============================================
# 실행 예시
# ============================================
if __name__ == "__main__":
    API_KEY = "여기에_기업마당에서_발급받은_인증키_입력"

    # 대표님 인천 지역 창업 지원사업 조회
    client = BizinfoAPI(API_KEY)
    result = client.search(field="창업", region="인천", count=50)
    print(f"인천 창업 지원사업: {result['total']}건")

    # 전체 DB 갱신 (매년 1월 재검증 시 실행)
    update_matching_db(API_KEY)
