# scripts / 기업마당 지원사업 자동 수집기 (BLOCK 8)

이 폴더의 스크립트는 **웹앱(Vercel/Cloudflare) 런타임에서 실행되지 않습니다.**
대표님 PC나 별도 서버에서 **주기적으로(권장: 매년 1월 + 필요 시)** 수동/배치 실행하여
`gov_support_db.json` 을 최신 정부지원사업 목록으로 갱신하는 용도입니다.

## 사용법

```bash
# 1) requests 설치 (최초 1회)
pip install requests

# 2) 인증키 발급
#    bizinfo.go.kr 페이지 하단 "API 사용 신청"에서 즉시 발급(무료)

# 3) fetch_gov_support.py 파일을 열어 API_KEY 값을 발급받은 키로 교체

# 4) 실행
python scripts/fetch_gov_support.py
```

실행하면 같은 폴더에 `gov_support_db.json` 이 생성됩니다.
(공식 Endpoint: https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do)

## 웹앱과의 연결
생성된 `gov_support_db.json` 을 웹앱의 매칭 데이터로 반영하고 싶을 때는,
`src/lib/advancedScreening.ts` 의 `GOV_SUPPORT_2026` 배열을 최신 데이터로
갱신하거나, 별도 데이터 파일로 import 하도록 확장하면 됩니다.

> ⚠️ 본 결과는 자문 정보이며 대출 승인을 보장하지 않습니다.
> 모든 데이터는 매년 1월 정부·기관 공고 기준으로 재검증이 필요합니다.
