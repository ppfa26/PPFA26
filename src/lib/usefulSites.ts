// 유용한 공식 사이트 모음 (대표님 정리 자료 기반)
// 카테고리별로 정부·금융·교육·인증 사이트 링크를 제공합니다.
// 링크 최신성은 주기적(월 1회 권장) 점검을 통해 유지합니다.

export type UsefulSite = {
  name: string;
  url: string;
  note?: string; // 부가 설명(본원 URL 등)
};

export type SiteCategory = {
  key: string;
  emoji: string;
  label: string;
  sites: UsefulSite[];
};

export const USEFUL_SITE_CATEGORIES: SiteCategory[] = [
  {
    key: "fund",
    emoji: "📗",
    label: "정책자금·보증·지자체 자금",
    sites: [
      { name: "기업마당", url: "https://www.bizinfo.go.kr/" },
      { name: "소상공인정책자금 (신청)", url: "https://ols.sbiz.or.kr/", note: "소상공인시장진흥공단 https://www.semas.or.kr/" },
      { name: "소상공인스마트상점", url: "https://www.sbiz.or.kr/smst/index.do" },
      { name: "채무상환·재도전 강의 (지식배움터)", url: "https://edu.sbiz.or.kr/" },
      { name: "중소벤처기업진흥공단", url: "https://www.kosmes.or.kr/" },
      { name: "신용보증기금 (KODIT)", url: "https://www.kodit.or.kr/" },
      { name: "기술보증기금 (KIBO)", url: "https://www.kibo.or.kr/" },
      { name: "새출발기금", url: "https://www.newstartfund.or.kr/" },
      { name: "한국콘텐츠진흥원 (KOCCA)", url: "https://www.kocca.kr/" },
      { name: "한국무역보험공사 (K-SURE)", url: "https://www.ksure.or.kr/" },
      { name: "국민체육진흥공단 (KSPO)", url: "https://www.kspo.or.kr/" },
      { name: "농림수산업자신용보증기금 (농신보)", url: "https://nongshinbo.nonghyup.com/" },
      { name: "인천테크노파크 비즈오케이", url: "https://bizok.incheon.go.kr/" },
      { name: "경기도 중소기업육성자금", url: "https://g-money.gg.go.kr/" },
      { name: "강원테크노파크", url: "https://www.gwtp.or.kr/" },
      { name: "강원경제진흥원", url: "http://www.gwep.or.kr/" },
      { name: "세종 일자리경제진흥원", url: "https://sjepa.or.kr/" },
      { name: "충북기업진흥원", url: "https://www.cba.ne.kr/" },
      { name: "충남경제진흥원", url: "https://www.cepa.or.kr/" },
      { name: "충북테크노파크 컨택센터", url: "http://www.contact.cbtp.or.kr/", note: "본원 https://www.cbtp.or.kr/" },
      { name: "충남경제진흥원 자금관리시스템", url: "https://www.cnfund.kr/" },
      { name: "광주경제진흥 상생일자리재단", url: "https://www.gjep.or.kr/" },
      { name: "전북 중소기업 종합지원시스템", url: "https://www.jbok.kr/" },
      { name: "전남 중소기업 경제진흥원 자금시스템", url: "https://www.jnfund.kr/" },
      { name: "경북 중소기업육성자금 (GFund)", url: "https://www.gfund.kr/" },
      { name: "경남 투자경제진흥원", url: "https://giba.or.kr/" },
      { name: "울산 기금융자관리시스템", url: "https://hext.ubpi.or.kr/" },
      { name: "부산 경제진흥원", url: "https://www.bepa.kr/", note: "자금시스템 https://capital.bepa.kr/" },
      { name: "제주 경제통상진흥원", url: "http://www.jba.or.kr/" },
    ],
  },
  {
    key: "startup",
    emoji: "📘",
    label: "창업·서민금융·교육·인증",
    sites: [
      { name: "보조금24 (정부24 내)", url: "https://www.gov.kr/" },
      { name: "고용24_개인", url: "https://www.work24.go.kr/" },
      { name: "고용24_기업", url: "https://www.work24.go.kr/cm/main.do?topArea=EBM00" },
      { name: "한눈에 보는 정책 (정책브리핑)", url: "https://www.korea.kr/" },
      { name: "국가법령정보센터", url: "https://www.law.go.kr/" },
      { name: "KOSIS 국가통계포털", url: "https://kosis.kr/" },
      { name: "K-Startup 창업지원포털", url: "https://www.k-startup.go.kr/" },
      { name: "창업진흥원 (KISED)", url: "https://www.kised.or.kr/" },
      { name: "서민금융진흥원", url: "https://www.kinfa.or.kr/" },
      { name: "소상공인 지식배움터", url: "https://edu.sbiz.or.kr/" },
      { name: "소진공 담당자 연락처", url: "https://www.semas.or.kr/web/ORG01/ORG0111/ORG011102.kmdc" },
      { name: "신용취약소상공인 온라인 교육", url: "https://edu.sbiz.or.kr/edu/channel/alei2017/main.do", note: "신복위 제휴" },
      { name: "서울시 자영업지원센터", url: "https://www.seoulsbdc.or.kr/" },
      { name: "서울특별시 소상공인아카데미", url: "https://edu.seoulsbdc.or.kr/" },
      { name: "희망리턴패키지", url: "https://www.sbiz.or.kr/nhrp/intro/bizIntroduce.do" },
      { name: "청년창업사관학교", url: "https://start.kosmes.or.kr/" },
      { name: "중기부 통합 공고문", url: "https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310" },
      { name: "중진공 담당자 연락처", url: "https://www.kosmes.or.kr/nsh/SH/SIT/SHSIT136M0.do" },
      { name: "신보 담당 영업점 찾기", url: "https://www.kodit.or.kr/kodit/sd/srchDept.do?mi=2486" },
      { name: "기술보증기금 문화콘텐츠 전담센터", url: "https://www.kibo.or.kr/main/board/boardType88.do" },
      { name: "콘텐츠가치평가시스템", url: "https://assess.kocca.kr/" },
      { name: "한국직업능력진흥원 (산업인력공단)", url: "https://www.hrdkorea.or.kr/" },
    ],
  },
  {
    key: "tools",
    emoji: "📙",
    label: "사업 실무·데이터·조회 도구",
    sites: [
      { name: "중소기업현황정보시스템", url: "https://sminfo.mss.go.kr/" },
      { name: "국세청 홈택스", url: "https://www.hometax.go.kr/" },
      { name: "한국전자인증 공인인증서", url: "https://www.crosscert.com/" },
      { name: "나이스지키미", url: "https://www.credit.co.kr/" },
      { name: "한국신용정보원", url: "https://www.kcredit.or.kr/", note: "본인신용정보 https://www.credit4u.or.kr/" },
      { name: "소상공인 빅데이터 365", url: "https://bigdata.sbiz.or.kr/" },
      { name: "대출 이자 계산기 (금감원 파인)", url: "https://fine.fss.or.kr/fine/fnctip/lonCalc/view.do?menuNo=900019" },
      { name: "올크레딧 대출 조회", url: "https://www.allcredit.co.kr/" },
      { name: "네이버페이 마이비즈", url: "https://finsupport.naver.com/" },
      { name: "통계분류포털 (KSSC)", url: "http://kssc.kostat.go.kr/" },
    ],
  },
  {
    key: "cert",
    emoji: "📕",
    label: "인증·확인서·법인 관리",
    sites: [
      { name: "홈택스", url: "https://www.hometax.go.kr/" },
      { name: "인터넷 등기소", url: "https://www.iros.go.kr/" },
      { name: "국민건강보험 (4대보험 완납증명)", url: "https://si4n.nhis.or.kr/" },
      { name: "4대보험 통합징수포털", url: "https://si4n.nhis.or.kr/", note: "공동인증서 등록" },
      { name: "고용·산재보험 토탈서비스", url: "https://total.kcomwel.or.kr/", note: "고용보험가입자명부" },
      { name: "4대사회보험 정보연계센터", url: "https://www.4insure.or.kr/", note: "공동인증서 등록" },
      { name: "ONECLICK 중진공 자료제출", url: "https://www.one-click.co.kr/" },
      { name: "KOfind 기보 자료제출", url: "https://www.kofind.co.kr/" },
      { name: "정부24 (개인/법인 등록)", url: "https://www.gov.kr/" },
      { name: "중소벤처24 통합로그인", url: "https://www.smes.go.kr/" },
      { name: "중소기업 전략기술 로드맵", url: "https://smroadmap.smtech.go.kr/" },
      { name: "수출바우처 (수출지원기반활용)", url: "https://www.exportvoucher.com/portal/sample/main" },
      { name: "중소기업확인서", url: "https://sminfo.mss.go.kr/" },
      { name: "한국무역협회 수출실적증명", url: "https://membership.kita.net/cert/oncert/expImpCertGuide.do" },
      { name: "무역통계 정보포털 TRASS", url: "https://www.bandtrass.or.kr/", note: "수출실적증명서" },
      { name: "구매확인서 통합정보서비스", url: "https://ulocal.utradehub.or.kr/", note: "간접수출확인서" },
      { name: "창업기업확인시스템", url: "https://cert.k-startup.go.kr/" },
      { name: "여성기업 종합정보 포털", url: "https://wbiz.or.kr/", note: "여성기업확인서" },
      { name: "중소기업제품 종합정보망", url: "https://www.smpp.go.kr/", note: "여성/장애인/직접생산" },
      { name: "사회적기업 포털", url: "https://www.seis.or.kr/", note: "인증서·지정서" },
      { name: "벤처확인시스템", url: "https://www.smes.go.kr/venturein/" },
      { name: "국가뿌리산업진흥센터", url: "https://www.kpic.re.kr/", note: "뿌리기업" },
      { name: "INNOBIZ (기술혁신형)", url: "https://www.innobiz.net/" },
      { name: "MAINBIZ (경영혁신형)", url: "https://www.smes.go.kr/mainbiz/" },
      { name: "온라인법인설립시스템", url: "https://www.startbiz.go.kr/" },
    ],
  },
];
