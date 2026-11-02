"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from "recharts";

/* ═══ i18n ═══ */
const LANG: Record<string, Record<string, any>> = {
  ko: {
    appName: "B.M.W", appSub: "爸爸妈妈 AND ME",
    tabs: { dashboard: "대시보드", input: "입력", history: "내역", report: "리포트" },
    totalSpent: "이번 달 총 지출", bizSettle: "가게통장 입금 예정",
    bizSettleNote: "신한+국민+현대 개인지출분", cardGuide: "카드 사용 가이드",
    cardPerf: "카드별 실적", catTop: "카테고리별 지출 TOP",
    priority: "사용 우선순위", achieved: "달성", remaining: "잔여",
    noReq: "실적 무관", date: "날짜", recorder: "입력자", card: "카드",
    itemName: "물품명", itemPlaceholder: "예: 쿠팡 기저귀, 스타벅스",
    amount: "금액", amountUnit: "원", save: "저장", saved: "✅ 저장됨!",
    count: "건", noData: "이번 달 기록이 없어요", reportTotal: "총 지출",
    bizAccount: "가게통장 입금액", benefitSummary: "카드 혜택 달성",
    catBreakdown: "카테고리별 지출", cardUsage: "카드(현금)별 사용액",
    notAchieved: "미달성", short: "부족", moreFor: "더 →",
    noLimit: "적립 한도 없음", shinhan: "신한", kookmin: "국민 쿠팡", hyundai: "현대 사업자",
    won: "원", man: "만", vsLastMonth: "지난달 대비", noLastMonth: "지난달 데이터 없음",
    edit: "수정", cancel: "취소", all: "전체",
    monthSpent: "월 지출", mUnit: "월", sameAsPrev: "지난달과 같아요.",
    diffLine: (m: string, more: boolean) => [`${m}월보다 `, more ? " 더 썼어요." : " 덜 썼어요."],
  },
  zh: {
    appName: "B.M.W", appSub: "爸爸妈妈 AND ME",
    tabs: { dashboard: "仪表盘", input: "记账", history: "明细", report: "报表" },
    totalSpent: "本月总支出", bizSettle: "店铺账户待转入",
    bizSettleNote: "新韩+国民+现代个人消费部分", cardGuide: "刷卡指南",
    cardPerf: "各卡实绩", catTop: "分类支出 TOP",
    priority: "刷卡优先顺序", achieved: "已达标", remaining: "还差",
    noReq: "无实绩要求", date: "日期", recorder: "记录人", card: "卡片",
    itemName: "商品名", itemPlaceholder: "例: Coupang 尿布, 星巴克",
    amount: "金额", amountUnit: "韩元", save: "保存", saved: "✅ 已保存!",
    count: "笔", noData: "本月暂无记录", reportTotal: "总支出",
    bizAccount: "店铺账户转入金额", benefitSummary: "卡片优惠达标情况",
    catBreakdown: "分类支出", cardUsage: "各卡(现金)使用金额",
    notAchieved: "未达标", short: "不足", moreFor: "再刷 →",
    noLimit: "无积分上限", shinhan: "新韩", kookmin: "国民 Coupang", hyundai: "现代 商务卡",
    won: "韩元", man: "万", vsLastMonth: "对比上月", noLastMonth: "无上月数据",
    edit: "修改", cancel: "取消", all: "全部",
    monthSpent: "月支出", mUnit: "月", sameAsPrev: "与上月持平。",
    diffLine: (m: string, more: boolean) => [`比${m}月${more ? "多" : "少"}花了 `, ""],
  },
};

/* ═══ Cards ═══ */
const CARDS = [
  { id: "shinhan", name: { ko: "신한 신용", zh: "新韩信用卡" }, icon: "💳", color: "#0046FF",
    benefits: [{ threshold: 300000, ko: "전세대출 이자 감면", zh: "全租贷款利息减免" }],
    priority: 1, prNote: { ko: "최우선 30만 채우기", zh: "最优先刷满30万" }, settleToBiz: true },
  { id: "samsung", name: { ko: "삼성 신용", zh: "三星信用卡" }, icon: "⚡", color: "#1428A0",
    benefits: [
      { threshold: 300000, ko: "전기차 충전 50% 할인 (한도 2만)", zh: "电车充电50%折扣(上限2万)" },
      { threshold: 600000, ko: "전기차 충전 70% 할인 (한도 3만)", zh: "电车充电70%折扣(上限3万)" },
    ], priority: 2, prNote: { ko: "신한 달성 후 → 60만 목표", zh: "新韩达标后 → 目标60万" } },
  { id: "kookmin", name: { ko: "국민 쿠팡와우", zh: "国民 Coupang Wow" }, icon: "🛒", color: "#FFBB00",
    benefits: [{ threshold: 0, ko: "쿠팡 2%, 기타 0.2% 캐시적립 (한도 2만)", zh: "Coupang 2%, 其他0.2%返现(上限2万)" }],
    priority: 3, prNote: { ko: "쿠팡 구매 시 사용", zh: "Coupang购物时使用" }, settleToBiz: true },
  { id: "hyundai", name: { ko: "현대 사업자", zh: "现代 商务卡" }, icon: "🏢", color: "#003D6B",
    benefits: [
      { threshold: 500000, ko: "기본 0.5~3% 적립 (한도 없음)", zh: "基本0.5~3%积分(无上限)" },
      { threshold: 500000, ko: "사업경비 5% 적립 (한도 월 1만)", zh: "商务费用5%积分(月上限1万)" },
      { threshold: 1000000, ko: "기본 1.5배 적립 + 사업경비 5% (한도 월 2만)", zh: "基本1.5倍积分 + 商务5%(月上限2万)" },
    ], priority: 4, prNote: { ko: "사업경비 해당 시 사용", zh: "商务费用时使用" }, settleToBiz: true },
];

/* ═══ Cash (현금) ═══
   현금은 카드가 아님 → 실적/혜택/우선순위/가게통장 정산에서 전부 제외.
   결제수단으로만 취급: 입력/수정 선택, 내역 표시, 내역 필터, 카드별 사용액 차트에만 등장.
   settleToBiz:false → 가게통장 정산 자동 제외. benefits:[] → 실적 게이지/혜택요약에서 의미 없음.
   단, CARDS 배열에는 넣지 않으므로 실적/우선순위/혜택 화면에는 아예 렌더되지 않는다.
*/
const CASH = {
  id: "cash",
  name: { ko: "현금", zh: "现金" },
  icon: "💵",
  color: "#27ae60",
  benefits: [] as { threshold: number; ko: string; zh: string }[],
  priority: 99,
  prNote: { ko: "", zh: "" },
  settleToBiz: false,
};

/* PAYMENTS = 결제수단 전체(카드 4장 + 현금).
   "결제수단을 고르거나 표시해야 하는 자리"에서만 사용한다.
   실적/혜택/우선순위/정산 로직은 그대로 CARDS만 사용 → 현금이 섞이지 않는다. */
const PAYMENTS = [...CARDS, CASH];

/* ═══ Categories ═══
   기존 11개 ID는 모두 유지 (기존 데이터 호환). 신규 13개 추가.
   keywords는 한국 가맹점/실제 결제내역 패턴 기반으로 풍부하게 작성.
   classify()에서 "가장 긴 키워드 우선" 매칭 → specificity 보장.
*/
const CATS = [
  // ── 식음료 (식재료 / 외식 / 배달 / 카페 / 패스트푸드 분리) ──
  { id: "food", ko: "식비(마트)", zh: "食材(超市)", emoji: "🛒", keywords: [
    "이마트","홈플러스","롯데마트","코스트코","트레이더스","하나로마트","농협하나로","GS더프레시","노브랜드","마켓컬리","컬리",
    "마트","식재료","식자재","쌀","고기","한우","돼지","닭고기","야채","채소","과일","반찬","정육","수산","김치","계란"
  ] },
  { id: "eating_out", ko: "외식", zh: "外食", emoji: "🍴", keywords: [
    "식당","한식","중식","일식","양식","분식","횟집","갈비","삼겹살","곱창","고깃집","백반","우동","라멘","초밥","회",
    "김밥","밥상","식사","점심","저녁","회식","뷔페","오마카세","소바","돈까스","쌀국수","파스타","스테이크","스시",
    "饭店","餐厅","料理"
  ] },
  { id: "delivery", ko: "배달", zh: "外卖", emoji: "🛵", keywords: [
    "배달","배달의민족","배민","쿠팡이츠","요기요","배달팁","배달비","외배달"
  ] },
  { id: "cafe", ko: "카페/디저트", zh: "咖啡/甜品", emoji: "☕", keywords: [
    "카페","커피","스타벅스","스벅","투썸","이디야","메가커피","메가MGC","컴포즈","빽다방","폴바셋","할리스","엔제리너스",
    "공차","쥬씨","디저트","빵","베이커리","파리바게트","뚜레쥬르","던킨","도넛","아이스크림","베스킨","설빙",
    "茶","咖啡","甜品"
  ] },
  { id: "fastfood", ko: "패스트푸드", zh: "快餐", emoji: "🍔", keywords: [
    "맥도날드","맥날","버거킹","롯데리아","맘스터치","KFC","서브웨이","쉐이크쉑",
    "피자","도미노","피자헛","미스터피자","파파존스",
    "치킨","BBQ","BHC","교촌","굽네","네네치킨","처갓집","푸라닭","60계","호식이"
  ] },

  // ── 생활/쇼핑 ──
  { id: "grocery", ko: "생활용품", zh: "生活用品", emoji: "🧴", keywords: [
    "다이소","생활용품","세제","휴지","화장지","두루마리","키친타월","치약","칫솔","샴푸","린스","비누",
    "세탁세제","섬유유연제","주방세제","청소","락스","수세미","건전지","마스크"
  ] },
  { id: "shopping", ko: "온라인쇼핑(종합)", zh: "网购(综合)", emoji: "📦", keywords: [
    "쿠팡","SSG","신세계몰","11번가","G마켓","옥션","위메프","티몬","네이버쇼핑","스마트스토어","네이버페이",
    "오늘의집","무신사","29CM","W컨셉","에이블리","지그재그",
    "淘宝","京东","拼多多"
  ] },
  { id: "electronics", ko: "가전/디지털", zh: "家电/数码", emoji: "💻", keywords: [
    "애플","apple","삼성전자","LG전자","아이폰","갤럭시","노트북","맥북","아이패드","ipad",
    "모니터","키보드","마우스","이어폰","헤드폰","에어팟","airpods","가전","디지털","전자랜드","하이마트",
    "쿠쿠","다이슨"
  ] },
  { id: "clothing", ko: "의류/잡화", zh: "服装/杂货", emoji: "👕", keywords: [
    "옷","의류","신발","가방","유니클로","UNIQLO","자라","ZARA","H&M","스파오","탑텐","TOPTEN","8세컨즈",
    "나이키","NIKE","아디다스","ADIDAS","뉴발란스","컨버스","닥터마틴","반스","호카",
    "노스페이스","디스커버리","코오롱","K2","네파","아크네","COS","마뗑킴","스튜디오","아미"
  ] },
  { id: "furniture", ko: "가구/인테리어", zh: "家具/家居", emoji: "🛋️", keywords: [
    "가구","인테리어","이케아","IKEA","한샘","리바트","일룸","시몬스","에이스침대","매트리스","침대","소파","책상","의자","조명","커튼","러그","수납","수납장"
  ] },
  { id: "beauty", ko: "미용/화장품", zh: "美容/化妆品", emoji: "💄", keywords: [
    "화장품","올리브영","올영","시코르","CHICOR","세포라","SEPHORA","이니스프리","더페이스샵","미샤","아리따움","롭스","LOHBs",
    "헤어샵","헤어","미용실","네일","마사지","피부관리","에스테틱","왁싱","태닝",
    "化妆品","美发"
  ] },

  // ── 교통 ──
  { id: "fuel", ko: "주유/충전", zh: "加油/充电", emoji: "⛽", keywords: [
    "주유","주유소","SK주유소","SK에너지","GS칼텍스","현대오일뱅크","S-OIL","에쓰오일",
    "충전","전기차충전","전기차","EV충전","EV","加油"
  ] },
  { id: "transport", ko: "대중교통/택시", zh: "交通/出租", emoji: "🚖", keywords: [
    "지하철","버스","KTX","SRT","코레일","기차","티머니","모바일티머니","교통",
    "택시","카카오택시","카카오T","우버","UBER","따릉이","킥보드","쏘카","SOCAR","그린카"
  ] },
  { id: "parking", ko: "주차/통행료", zh: "停车/过路费", emoji: "🅿️", keywords: [
    "주차","주차장","주차요금","톨비","통행료","하이패스","고속도로","파크"
  ] },

  // ── 가족 ──
  { id: "baby", ko: "육아", zh: "育儿", emoji: "👶", keywords: [
    "기저귀","분유","이유식","아기","유아","장난감","어린이집","유치원","유아용품","아이","키즈","베이비",
    "매일유업","남양유업","일동후디스","파스퇴르","압소바","오가닉맘","페도라","폴드","스토케",
    "尿布","奶粉"
  ] },
  { id: "education", ko: "교육/도서", zh: "教育/书籍", emoji: "📚", keywords: [
    "책","도서","교보문고","교보","YES24","예스24","알라딘","영풍문고","인터파크도서",
    "학원","강의","인강","클래스101","패스트캠퍼스","코드잇","인프런","유데미","UDEMY"
  ] },
  { id: "pet", ko: "반려동물", zh: "宠物", emoji: "🐶", keywords: [
    "강아지","고양이","반려동물","펫","사료","동물병원","펫샵","펫프렌즈","어바웃펫"
  ] },

  // ── 의료/건강 ──
  { id: "medical", ko: "의료", zh: "医疗", emoji: "🏥", keywords: [
    "병원","약국","의원","치과","한의원","안과","피부과","정형외과","산부인과","소아과","내과","이비인후과","비뇨기과",
    "약","의약품","처방","진료비","医院","药店"
  ] },

  // ── 통신/공과금/구독 ──
  { id: "telecom", ko: "통신비", zh: "通信费", emoji: "📞", keywords: [
    "SKT","KT","LGU+","LG유플러스","유플러스","통신비","핸드폰","휴대폰","인터넷","와이파이","WIFI","알뜰폰","통화료","요금"
  ] },
  { id: "utility", ko: "공과금", zh: "公共费用", emoji: "💡", keywords: [
    "전기","전기료","한국전력","한전","가스","가스비","도시가스","수도","수도료","상수도","관리비",
    "电费","水费","燃气","物业费"
  ] },
  { id: "subscription", ko: "구독/멤버십", zh: "订阅/会员", emoji: "📱", keywords: [
    "구독","넷플릭스","NETFLIX","유튜브","유튜브프리미엄","YOUTUBE","디즈니","디즈니플러스","웨이브","WAVVE","티빙","TVING","왓챠","쿠팡플레이",
    "멜론","MELON","지니","FLO","스포티파이","SPOTIFY","애플뮤직","멤버십","와우멤버십",
    "보험료","보험","ChatGPT","OpenAI","Claude","Notion","Adobe","어도비","Github","GitHub"
  ] },

  // ── 여가/여행/기타 ──
  { id: "leisure", ko: "여가/문화", zh: "休闲/文化", emoji: "🎬", keywords: [
    "영화","CGV","메가박스","롯데시네마","공연","콘서트","뮤지컬","연극","전시","박물관","미술관",
    "놀이공원","에버랜드","롯데월드","서울랜드","아쿠아리움",
    "스포츠","골프","스크린골프","헬스","요가","PT","필라테스","수영","볼링"
  ] },
  { id: "travel", ko: "여행/숙박", zh: "旅行/住宿", emoji: "✈️", keywords: [
    "항공","비행기","대한항공","아시아나","제주항공","진에어","티웨이","에어부산",
    "호텔","숙소","에어비앤비","Airbnb","야놀자","여기어때","부킹닷컴","Booking","아고다","Agoda",
    "여행","투어","트리바고","트립닷컴","하나투어","모두투어","인터파크투어"
  ] },
  { id: "alcohol", ko: "술/담배", zh: "酒/烟", emoji: "🍺", keywords: [
    "술","와인","맥주","소주","위스키","막걸리","사케","호프","술집","바BAR","펍","와인바","칵테일","주점","이자카야",
    "담배","액상","전자담배","릴","말보로","에쎄"
  ] },
  { id: "event", ko: "경조사/선물", zh: "红白事/礼物", emoji: "🎁", keywords: [
    "축의금","조의금","선물","돌잔치","결혼","부조","경조사","답례품","花束","红包","礼物"
  ] },

  // ── 기타 (fallback) ──
  { id: "etc", ko: "기타", zh: "其他", emoji: "📦", keywords: [] },
];

const PIE_COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8","#F7DC6F","#BB8FCE","#85C1E9","#F0B27A","#82E0AA","#F8C471","#A9CCE3","#D2B4DE","#A3E4D7","#F5B7B1","#AED6F1","#FAD7A0","#D5DBDB","#E59866","#7FB3D5","#C39BD3","#76D7C4"];
const fmt = (n: number) => n.toLocaleString("ko-KR") + "원";
const todayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const monthKey = (d: string) => d.substring(0, 7);

interface Expense {
  id?: number;
  date: string;
  recorder: string;
  card_id: string;
  item_name: string;
  amount: number;
  category: string;
  created_at?: string;
}
interface Rule { id?: number; keyword: string; category_id: string; }

/* ═══ Classification engine ═══
   - 공백 제거 후 substring 매칭 → "쿠팡 기저귀" / "쿠팡기저귀" 모두 잡힘
   - rules + CATS keywords 모든 후보 수집
   - 가장 긴 키워드 우선 → "스타벅스 강남점"이 "강남"(어딨건)보다 "스타벅스"로 매칭
   - 동률이면 사용자 학습 rule이 우선
*/
const STOPWORDS = new Set([
  "결제","지출","사용","구매","주문","결재","부가세","수수료","승인","취소","환불","현금","카드","신용","체크","원","월","일","건",
  "the","and","for","with","from","com","www","http","https"
]);

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

function classify(name: string, rules: Rule[]): string {
  if (!name) return "etc";
  const norm = normalize(name);

  type Cand = { kw: string; cat: string; src: "rule" | "cat" };
  const cands: Cand[] = [];

  for (const r of rules) {
    const kw = normalize(r.keyword);
    if (kw && norm.includes(kw)) cands.push({ kw, cat: r.category_id, src: "rule" });
  }
  for (const c of CATS) {
    for (const k of c.keywords) {
      const kw = normalize(k);
      if (kw && norm.includes(kw)) cands.push({ kw, cat: c.id, src: "cat" });
    }
  }

  if (cands.length === 0) return "etc";

  cands.sort((a, b) => {
    if (b.kw.length !== a.kw.length) return b.kw.length - a.kw.length;
    if (a.src !== b.src) return a.src === "rule" ? -1 : 1;
    return 0;
  });
  return cands[0].cat;
}

/* ═══ Token extraction (학습용) ═══
   - 한글 2자 이상, 영문 3자 이상, 한자 1자 이상
   - STOPWORDS 제외
   - 너무 흔한 패턴(숫자만, 단위) 제외
*/
function extractTokens(name: string): string[] {
  if (!name) return [];
  const matches = name.match(/[가-힣]{2,}|[a-zA-Z]{3,}|[\u4e00-\u9fff]+/g) || [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of matches) {
    const t = m.toLowerCase();
    if (STOPWORDS.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    result.push(t);
  }
  return result;
}

function getAdvice(mExp: Expense[], lang: string) {
  const t: Record<string, number> = {};
  CARDS.forEach((c) => (t[c.id] = 0));
  mExp.forEach((e) => (t[e.card_id] = (t[e.card_id] || 0) + e.amount));
  const adv: { msg: string; urgent: boolean }[] = [];
  if (t.shinhan < 300000)
    adv.push({ msg: `${CARDS[0].name[lang]} ${fmt(300000 - t.shinhan)} ${LANG[lang].moreFor} ${CARDS[0].benefits[0][lang]}`, urgent: true });
  if (t.samsung < 300000)
    adv.push({ msg: `${CARDS[1].name[lang]} ${fmt(300000 - t.samsung)} ${LANG[lang].moreFor} 50%`, urgent: t.shinhan >= 300000 });
  else if (t.samsung < 600000)
    adv.push({ msg: `${CARDS[1].name[lang]} ${fmt(600000 - t.samsung)} ${LANG[lang].moreFor} 70%`, urgent: false });
  return { cardTotals: t, advice: adv };
}


/* ═══ UI (김가네 v5 디자인 언어) ═══
   색은 globals.css의 토큰(--tx1~3, --bg0~3, --warn/--bad/--good)만 쓴다. 색은 상태에만.
   차트(SVG)는 CSS 변수를 못 받는 곳이 있어 TOK에서 hex로 꺼내 쓴다. */
const TOK = {
  dark: { tx1: "#F5F5F7", tx2: "#B9B9C0", tx3: "#8C8C94", bg1: "#151517", bg3: "#2C2C30", hair: "#2C2C30" },
  light: { tx1: "#1C1C1E", tx2: "#4A4A50", tx3: "#6E6E76", bg1: "#FFFFFF", bg3: "#E5E5EA", hair: "#D1D1D6" },
};
const num = (n: number) => n.toLocaleString("ko-KR");
const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n));

function useDarkMode() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setDark(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return dark;
}

/* 접힘 줄: 제목 + (접혔을 때) 요약 한 줄 + 둥근 ⌄. 위쪽 얇은 선으로만 나눈다. */
function Fold({ title, badge, badgeColor, summary, isOpen, onToggle, children }: {
  title: string; badge?: string | number; badgeColor?: string; summary?: React.ReactNode;
  isOpen: boolean; onToggle: () => void; children?: React.ReactNode;
}) {
  const canOpen = !!children;
  return (
    <div style={S.fold}>
      <button onClick={canOpen ? onToggle : undefined} style={{ ...S.foldBtn, cursor: canOpen ? "pointer" : "default" }} aria-expanded={canOpen ? isOpen : undefined}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={S.foldTitle}>
            {title}
            {badge !== undefined && <span style={{ color: badgeColor || "var(--tx3)", marginLeft: 6 }}>{badge}</span>}
          </div>
          {(!isOpen || !canOpen) && summary && <div style={S.foldSum}>{summary}</div>}
        </div>
        {canOpen && <span style={{ ...S.chev, transform: isOpen ? "rotate(180deg)" : "none" }}>{ICONS.chev}</span>}
      </button>
      {canOpen && isOpen && <div style={S.foldBody}>{children}</div>}
    </div>
  );
}

const svg = (d: React.ReactNode, size = 24) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const ICONS = {
  dashboard: svg(<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />),
  input: svg(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>),
  history: svg(<><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></>),
  report: svg(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>),
  chev: svg(<path d="m6 9 6 6 6-6" />, 14),
  edit: svg(<><path d="M4 20h4L19 9l-4-4L4 16z" /></>, 14),
  close: svg(<path d="M6 6l12 12M18 6 6 18" />, 14),
};

/* ═══ MAIN ═══ */
export default function Home() {
  const [lang, setLang] = useState("ko");
  const t = LANG[lang];
  const [tab, setTab] = useState("dashboard");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentDay, setCurrentDay] = useState(todayStr);
  const previousDay = useRef(currentDay);
  const [selMonth, setSelMonth] = useState(monthKey(currentDay));
  const [form, setForm] = useState({ date: currentDay, recorder: "머슴", cardId: "shinhan", itemName: "", amount: "" });
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editForm, setEditForm] = useState<(Expense & { amount_str: string }) | null>(null);
  const [histFilter, setHistFilter] = useState("all"); // 내역 탭 카드별 필터 ("all" | card_id | "cash")
  const [open, setOpen] = useState<Record<string, boolean>>({}); // 접힘 줄 펼침 상태 (화면 표시 전용)
  const isDark = useDarkMode();

  /* ─ Follow the device's local date, including midnight and timezone changes ─ */
  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      clearTimeout(midnightTimer);
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);
      midnightTimer = setTimeout(syncToday, Math.max(0, nextMidnight.getTime() - Date.now() + 20));
    };
    const syncToday = () => {
      const nextDay = todayStr();
      const oldDay = previousDay.current;
      if (nextDay !== oldDay) {
        previousDay.current = nextDay;
        setCurrentDay(nextDay);
        setForm((f) => f.date === oldDay ? { ...f, date: nextDay } : f);
        setSelMonth((m) => m === monthKey(oldDay) ? monthKey(nextDay) : m);
      }
      scheduleMidnight();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") syncToday();
    };

    syncToday();
    const poll = setInterval(syncToday, 30_000);
    window.addEventListener("focus", syncToday);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearTimeout(midnightTimer);
      clearInterval(poll);
      window.removeEventListener("focus", syncToday);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  /* ─ Load ─ */
  useEffect(() => {
    (async () => {
      const { data: exp } = await supabase.from("expenses").select("*").order("date", { ascending: false });
      const { data: rul } = await supabase.from("category_rules").select("*");
      setExpenses(exp || []);
      setRules(rul || []);
      setLoaded(true);
    })();
  }, []);

  /* ─ Computed ─ */
  const mExp = useMemo(() => expenses.filter((e) => monthKey(e.date) === selMonth), [expenses, selMonth]);
  const { cardTotals, advice } = useMemo(() => getAdvice(mExp, lang), [mExp, lang]);
  const catTotals = useMemo(() => {
    const m: Record<string, number> = {};
    mExp.forEach((e) => (m[e.category] = (m[e.category] || 0) + e.amount));
    return CATS.filter((c) => m[c.id]).map((c) => ({ ...c, name: (c as any)[lang], total: m[c.id] })).sort((a, b) => b.total - a.total);
  }, [mExp, lang]);
  const total = useMemo(() => mExp.reduce((s, e) => s + e.amount, 0), [mExp]);

  // 내역 탭 전용: 선택된 결제수단으로만 필터 (대시보드/리포트의 total 은 건드리지 않음)
  const histExp = useMemo(
    () => (histFilter === "all" ? mExp : mExp.filter((e) => e.card_id === histFilter)),
    [mExp, histFilter]
  );
  const histTotal = useMemo(() => histExp.reduce((s, e) => s + e.amount, 0), [histExp]);

  // 가게통장 입금 = settleToBiz 플래그 있는 카드들의 합 (현재: 신한+국민+현대)
  const settleCardIds = useMemo(() => CARDS.filter((c) => c.settleToBiz).map((c) => c.id), []);
  const bizSettle = useMemo(
    () => mExp.filter((e) => settleCardIds.includes(e.card_id)).reduce((s, e) => s + e.amount, 0),
    [mExp, settleCardIds]
  );

  const months = useMemo(() => {
    const s = new Set(expenses.map((e) => monthKey(e.date)));
    s.add(monthKey(currentDay));
    return [...s].sort().reverse();
  }, [expenses, currentDay]);

  // Month comparison
  const prevMK = useMemo(() => {
    const [y, m] = selMonth.split("-").map(Number);
    return `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  }, [selMonth]);
  const prevExp = useMemo(() => expenses.filter((e) => monthKey(e.date) === prevMK), [expenses, prevMK]);
  const prevTotal = useMemo(() => prevExp.reduce((s, e) => s + e.amount, 0), [prevExp]);
  const monthDiff = total - prevTotal;
  const monthDiffPct = prevTotal > 0 ? ((monthDiff / prevTotal) * 100).toFixed(1) : null;
  const prevCatMap = useMemo(() => {
    const m: Record<string, number> = {};
    prevExp.forEach((e) => (m[e.category] = (m[e.category] || 0) + e.amount));
    return m;
  }, [prevExp]);

  /* ─ Handlers ─ */
  const handleSubmit = async () => {
    if (!form.itemName.trim() || !form.amount) return;
    const cat = classify(form.itemName, rules);
    const row: Expense = { date: form.date, recorder: form.recorder, card_id: form.cardId, item_name: form.itemName.trim(), amount: parseInt(form.amount), category: cat };
    const { data, error } = await supabase.from("expenses").insert(row).select().single();
    if (!error && data) {
      setExpenses((p) => [data, ...p]);
      setForm((f) => ({ ...f, itemName: "", amount: "" }));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    }
  };

  /* 카테고리 수정 시 학습 강화:
     - 전체 item_name (정확 일치, 강한 매칭) → 무조건 저장/덮어쓰기
     - 의미 있는 토큰들 (느슨한 매칭) → 충돌 없을 때만 저장
       (이미 다른 카테고리에 등록된 토큰은 패스 - false positive 방지)
  */
  const handleCatEdit = async (expId: number, newCat: string) => {
    const exp = expenses.find((e) => e.id === expId);
    await supabase.from("expenses").update({ category: newCat }).eq("id", expId);
    setExpenses((p) => p.map((e) => (e.id === expId ? { ...e, category: newCat } : e)));

    if (exp) {
      const fullKey = exp.item_name.trim().toLowerCase();
      const tokens = extractTokens(exp.item_name);
      const candidates = Array.from(new Set([fullKey, ...tokens])).filter(Boolean);

      const updatedRules = [...rules];

      for (const k of candidates) {
        const idx = updatedRules.findIndex((r) => r.keyword.toLowerCase() === k);
        const isFullKey = k === fullKey;

        if (idx >= 0) {
          // 기존 룰 존재
          if (isFullKey) {
            // 전체 일치는 무조건 덮어쓰기
            if (updatedRules[idx].category_id !== newCat) {
              await supabase.from("category_rules").update({ category_id: newCat }).eq("id", updatedRules[idx].id);
              updatedRules[idx] = { ...updatedRules[idx], category_id: newCat };
            }
          } else {
            // 토큰: 같은 카테고리면 그대로, 다른 카테고리면 충돌 → 패스
            continue;
          }
        } else {
          // 신규 룰 등록
          const { data } = await supabase.from("category_rules").insert({ keyword: k, category_id: newCat }).select().single();
          if (data) updatedRules.push(data);
        }
      }

      setRules(updatedRules);
    }
    setEditingCatId(null);
  };

  const handleEditStart = (exp: Expense) => setEditForm({ ...exp, amount_str: exp.amount.toString() });
  const handleEditSave = async () => {
    if (!editForm) return;
    const cat = classify(editForm.item_name, rules);
    await supabase.from("expenses").update({ date: editForm.date, recorder: editForm.recorder, card_id: editForm.card_id, item_name: editForm.item_name, amount: parseInt(editForm.amount_str), category: cat }).eq("id", editForm.id);
    setExpenses((p) => p.map((e) => (e.id === editForm.id ? { ...e, date: editForm.date, recorder: editForm.recorder, card_id: editForm.card_id, item_name: editForm.item_name, amount: parseInt(editForm.amount_str), category: cat } : e)));
    setEditForm(null);
  };

  const handleDelete = async (id: number) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses((p) => p.filter((e) => e.id !== id));
  };

  if (!loaded) return <div style={S.loading}><p>Loading...</p></div>;

  const tok = isDark ? TOK.dark : TOK.light;
  const toggle = (id: string, def = false) => setOpen((o) => ({ ...o, [id]: !(o[id] ?? def) }));
  const isOpen = (id: string, def = false) => open[id] ?? def;
  const shortName = (c: { name: Record<string, string> }) => c.name[lang].split(" ")[0];
  const mLabel = (mk: string) => `${Number(mk.substring(5))}${t.mUnit}`;
  const Dot = ({ color }: { color: string }) => <span style={{ ...S.dot, background: color }} />;

  /* ─ CardGauge ─ */
  const CardGauge = ({ card }: { card: (typeof CARDS)[0] }) => {
    const spent = cardTotals[card.id] || 0;
    const ths = [...new Set(card.benefits.filter((b) => b.threshold > 0).map((b) => b.threshold))];
    const maxT = Math.max(...ths, 1);
    const pct = ths.length > 0 ? Math.min((spent / maxT) * 100, 100) : 100;
    const achieved = card.benefits.filter((b) => b.threshold > 0 && spent >= b.threshold);
    const pending = card.benefits.filter((b) => b.threshold > 0 && spent < b.threshold);
    const allDone = ths.length > 0 && pending.length === 0;
    return (
      <div style={S.cardGauge}>
        <div style={S.cardHead}>
          <Dot color={card.color} />
          <span style={S.cardNm}>{(card.name as any)[lang]}</span>
          <span style={S.cardAmt}>{fmt(spent)}</span>
        </div>
        {ths.length > 0 && (
          <div style={S.gaugeTrack}>
            <div style={{ ...S.gaugeFill, width: `${pct}%`, background: allDone ? "var(--good)" : "var(--tx2)" }} />
            {ths.map((th, i) => (
              <div key={i} style={{ ...S.gaugeMark, left: `${(th / maxT) * 100}%` }}>
                <span style={{ ...S.gaugeLabel, ...(th === maxT ? { left: "auto", right: 0, transform: "none" } : {}) }}>{th / 10000}{t.man}</span>
              </div>
            ))}
          </div>
        )}
        {achieved.map((b, i) => <div key={i} style={S.bOk}>✓ {(b as any)[lang]}</div>)}
        {pending.map((b, i) => <div key={i} style={S.bWait}>○ {fmt(b.threshold - spent)} {t.moreFor} {(b as any)[lang]}</div>)}
      </div>
    );
  };

  const tabItems = [
    { id: "dashboard", label: t.tabs.dashboard, icon: ICONS.dashboard },
    { id: "input", label: t.tabs.input, icon: ICONS.input },
    { id: "history", label: t.tabs.history, icon: ICONS.history },
    { id: "report", label: t.tabs.report, icon: ICONS.report },
  ];

  const hasUrgent = advice.some((a) => a.urgent);
  const firstPending = CARDS.map((c, i) => {
    const sp = cardTotals[c.id] || 0;
    const nextT = [...new Set(c.benefits.filter((b) => b.threshold > 0).map((b) => b.threshold))].find((th) => sp < th);
    return nextT ? `${i + 1}. ${shortName(c)} · ${t.remaining} ${fmt(nextT - sp)}` : null;
  }).find(Boolean);

  return (
    <div style={S.app}>
      {/* Top */}
      <div style={S.top}>
        <div>
          <div style={S.brand}>{t.appName}</div>
          <div style={S.brandSub}>{t.appSub}</div>
        </div>
        <div style={S.topRight}>
          <button onClick={() => setLang((l) => (l === "ko" ? "zh" : "ko"))} style={S.chip}>
            {lang === "ko" ? "中文" : "한국어"}
          </button>
          <div style={S.monthWrap}>
            <select value={selMonth} onChange={(e) => setSelMonth(e.target.value)} style={S.monthSel}>
              {months.map((m) => <option key={m} value={m}>{m.replace("-", ".")}</option>)}
            </select>
            <span style={S.monthCaret}>{ICONS.chev}</span>
          </div>
        </div>
      </div>

      <div style={S.content}>
        {/* ━━━ DASHBOARD ━━━ */}
        {tab === "dashboard" && (
          <>
            <div style={S.hk}>{mLabel(selMonth)} {t.monthSpent.replace(/^月|^월\s?/, "")}</div>
            <div style={S.bigRow}>
              <span style={S.big}>{num(total)}</span>
              <span style={S.bigUnit}>{t.won}</span>
            </div>
            <div style={S.sayLine}>
              {prevExp.length === 0 ? <span style={{ color: "var(--tx3)" }}>{t.noLastMonth}</span>
                : monthDiff === 0 ? t.sameAsPrev
                : (() => {
                  const [pre, post] = t.diffLine(mLabel(prevMK).replace(/[월月]$/, ""), monthDiff > 0);
                  return <>{pre}<span style={{ color: monthDiff > 0 ? "var(--bad)" : "var(--good)" }}>{fmt(Math.abs(monthDiff))}</span>{post}</>;
                })()}
            </div>
            <div style={S.sayMeta}>
              {mExp.length}{t.count}
              {monthDiffPct && <> · {t.vsLastMonth} {monthDiff > 0 ? "+" : monthDiff < 0 ? "−" : ""}{Math.abs(Number(monthDiffPct))}%</>}
            </div>

            <div style={{ height: 26 }} />

            {advice.length > 0 && (
              <Fold title={t.cardGuide} badge={advice.length} badgeColor={hasUrgent ? "var(--warn)" : undefined}
                summary={advice[0].msg} isOpen={isOpen("guide", hasUrgent)} onToggle={() => toggle("guide", hasUrgent)}>
                {advice.map((a, i) => (
                  <div key={i} style={S.lineItem}>
                    <Dot color={a.urgent ? "var(--warn)" : "var(--tx3)"} />
                    <span style={{ color: a.urgent ? "var(--tx1)" : "var(--tx2)", fontWeight: a.urgent ? 600 : 400 }}>{a.msg}</span>
                  </div>
                ))}
              </Fold>
            )}

            <Fold title={t.bizSettle} badge={fmt(bizSettle)} badgeColor="var(--tx1)" summary={t.bizSettleNote}
              isOpen={isOpen("settle")} onToggle={() => toggle("settle")}>
              {settleCardIds.map((cid) => {
                const card = CARDS.find((c) => c.id === cid)!;
                const amt = mExp.filter((e) => e.card_id === cid).reduce((s, e) => s + e.amount, 0);
                return (
                  <div key={cid} style={S.kvRow}>
                    <span style={S.kvKey}><Dot color={card.color} />{shortName(card)}</span>
                    <span style={S.kvVal}>{fmt(amt)}</span>
                  </div>
                );
              })}
              <div style={S.note}>{t.bizSettleNote}</div>
            </Fold>

            <Fold title={t.vsLastMonth}
              summary={prevExp.length > 0 ? `${mLabel(prevMK)} ${fmt(prevTotal)} → ${fmt(total)}` : t.noLastMonth}
              isOpen={isOpen("compare")} onToggle={() => toggle("compare")}>
              {prevExp.length > 0 ? (
                <>
                  <div style={S.kvRow}><span style={S.kvKey}>{mLabel(prevMK)}</span><span style={{ ...S.kvVal, color: "var(--tx2)" }}>{fmt(prevTotal)}</span></div>
                  <div style={S.kvRow}><span style={S.kvKey}>{mLabel(selMonth)}</span><span style={S.kvVal}>{fmt(total)}</span></div>
                  <div style={{ height: 6 }} />
                  {catTotals.slice(0, 4).map((c) => {
                    const diff = c.total - (prevCatMap[c.id] || 0);
                    if (diff === 0) return null;
                    return (
                      <div key={c.id} style={S.kvRow}>
                        <span style={S.kvKey}>{c.emoji} {c.name}</span>
                        <span style={{ ...S.kvVal, color: diff > 0 ? "var(--bad)" : "var(--good)" }}>{signed(diff)}</span>
                      </div>
                    );
                  })}
                </>
              ) : null}
            </Fold>

            <Fold title={t.cardPerf}
              summary={CARDS.map((c) => `${shortName(c)} ${fmt(cardTotals[c.id] || 0)}`).join(" · ")}
              isOpen={isOpen("cards")} onToggle={() => toggle("cards")}>
              {CARDS.map((c) => <CardGauge key={c.id} card={c} />)}
            </Fold>

            {catTotals.length > 0 && (
              <Fold title={t.catTop} summary={catTotals.slice(0, 3).map((c) => `${c.emoji} ${c.name}`).join(" · ")}
                isOpen={isOpen("cats")} onToggle={() => toggle("cats")}>
                {catTotals.slice(0, 5).map((c) => (
                  <div key={c.id} style={S.kvRow}>
                    <span style={S.kvKey}>{c.emoji} {c.name}</span>
                    <span style={S.kvVal}>{fmt(c.total)}</span>
                  </div>
                ))}
              </Fold>
            )}
            <div style={S.foldEnd} />
          </>
        )}

        {/* ━━━ INPUT ━━━ */}
        {tab === "input" && (
          <>
            <Fold title={t.priority} summary={firstPending || t.achieved}
              isOpen={isOpen("prio")} onToggle={() => toggle("prio")}>
              {CARDS.map((c, i) => {
                const sp = cardTotals[c.id] || 0;
                const ths = [...new Set(c.benefits.filter((b) => b.threshold > 0).map((b) => b.threshold))];
                const nextT = ths.find((th) => sp < th);
                const done = ths.length > 0 && ths.every((th) => sp >= th);
                return (
                  <div key={c.id} style={S.kvRow}>
                    <span style={S.kvKey}><span style={S.prNum}>{i + 1}</span><Dot color={c.color} />{(c.name as any)[lang]}</span>
                    {done ? <span style={{ ...S.kvVal, color: "var(--good)" }}>✓ {t.achieved}</span>
                      : nextT ? <span style={{ ...S.kvVal, color: "var(--warn)" }}>{t.remaining} {fmt(nextT - sp)}</span>
                      : <span style={{ ...S.kvVal, color: "var(--tx3)", fontWeight: 400 }}>{t.noReq}</span>}
                  </div>
                );
              })}
            </Fold>
            <div style={S.foldEnd} />

            <div style={{ marginTop: 22 }}>
              <div style={S.fRow}>
                <label style={S.label}>{t.date}</label>
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={S.input} />
              </div>
              <div style={S.fRow}>
                <label style={S.label}>{t.recorder}</label>
                <div style={S.seg}>
                  {[{ key: "머슴", label: "머슴 👨‍🌾", zh: "长工 👨‍🌾" }, { key: "공주", label: "공주 👸", zh: "公主 👸" }].map((r) => (
                    <button key={r.key} onClick={() => setForm((f) => ({ ...f, recorder: r.key }))}
                      style={{ ...S.segBtn, ...(form.recorder === r.key ? S.segAct : {}) }}>
                      {lang === "ko" ? r.label : r.zh}
                    </button>
                  ))}
                </div>
              </div>
              <div style={S.fRow}>
                <label style={S.label}>{t.card}</label>
                <div style={S.cardGrid}>
                  {PAYMENTS.map((c) => (
                    <button key={c.id} onClick={() => setForm((f) => ({ ...f, cardId: c.id }))}
                      style={{ ...S.cardBtn, ...(form.cardId === c.id ? S.cardBtnAct : {}) }}>
                      <Dot color={c.color} />
                      <span>{(c.name as any)[lang].split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={S.fRow}>
                <label style={S.label}>{t.itemName}</label>
                <input type="text" placeholder={t.itemPlaceholder} value={form.itemName}
                  onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} style={S.input} />
                {form.itemName && (() => {
                  const cid = classify(form.itemName, rules);
                  const cat = CATS.find((c) => c.id === cid);
                  return <div style={S.autoCat}>→ {cat?.emoji} {(cat as any)?.[lang]}</div>;
                })()}
              </div>
              <div style={S.fRow}>
                <label style={S.label}>{t.amount} ({t.amountUnit})</label>
                <input type="number" inputMode="numeric" placeholder={t.amountUnit} value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()} style={{ ...S.input, fontSize: 20, fontWeight: 700 }} />
              </div>
              <button onClick={handleSubmit} style={{ ...S.submitBtn, ...(showSuccess ? { background: "var(--good)" } : {}) }}>
                {showSuccess ? t.saved : t.save}
              </button>
            </div>
          </>
        )}

        {/* ━━━ HISTORY ━━━ */}
        {tab === "history" && (
          <>
            <div style={S.histFilterRow}>
              <button onClick={() => setHistFilter("all")}
                style={{ ...S.histChip, ...(histFilter === "all" ? S.histChipAct : {}) }}>
                {t.all}
              </button>
              {PAYMENTS.map((c) => (
                <button key={c.id} onClick={() => setHistFilter(c.id)}
                  style={{ ...S.histChip, ...(histFilter === c.id ? S.histChipAct : {}) }}>
                  <Dot color={c.color} />{(c.name as any)[lang].split(" ")[0]}
                </button>
              ))}
            </div>
            <div style={S.hk}>{histExp.length}{t.count}</div>
            <div style={{ ...S.bigRow, marginBottom: 18 }}>
              <span style={{ ...S.big, fontSize: 40 }}>{num(histTotal)}</span>
              <span style={{ ...S.bigUnit, fontSize: 16 }}>{t.won}</span>
            </div>
            {histExp.length === 0 && <div style={S.empty}>{t.noData}</div>}

            {editForm && (
              <div style={S.editOverlay}>
                <div style={S.editModal}>
                  <div style={S.sheetTitle}>{t.edit}</div>
                  <div style={S.fRow}><input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => f && ({ ...f, date: e.target.value }))} style={S.inputAlt} /></div>
                  <div style={{ ...S.seg, marginBottom: 12, background: "var(--field)" }}>
                    {["머슴", "공주"].map((r) => (
                      <button key={r} onClick={() => setEditForm((f) => f && ({ ...f, recorder: r }))}
                        style={{ ...S.segBtn, ...(editForm.recorder === r ? S.segAct : {}) }}>{r}</button>
                    ))}
                  </div>
                  <div style={{ ...S.cardGrid, marginBottom: 12 }}>
                    {PAYMENTS.map((c) => (
                      <button key={c.id} onClick={() => setEditForm((f) => f && ({ ...f, card_id: c.id }))}
                        style={{ ...S.cardBtn, background: "var(--field)", ...(editForm.card_id === c.id ? S.cardBtnAct : {}) }}>
                        <Dot color={c.color} /><span>{(c.name as any)[lang].split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                  <input type="text" value={editForm.item_name} onChange={(e) => setEditForm((f) => f && ({ ...f, item_name: e.target.value }))} style={{ ...S.inputAlt, marginBottom: 10 }} />
                  <input type="number" inputMode="numeric" value={editForm.amount_str} onChange={(e) => setEditForm((f) => f && ({ ...f, amount_str: e.target.value }))} style={{ ...S.inputAlt, marginBottom: 16 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditForm(null)} style={{ ...S.submitBtn, background: "var(--bg3)", color: "var(--tx1)", flex: 1 }}>{t.cancel}</button>
                    <button onClick={handleEditSave} style={{ ...S.submitBtn, flex: 1 }}>{t.save}</button>
                  </div>
                </div>
              </div>
            )}

            {[...histExp].sort((a, b) => b.date.localeCompare(a.date)).map((e) => {
              const card = PAYMENTS.find((c) => c.id === e.card_id);
              const cat = CATS.find((c) => c.id === e.category) || CATS.at(-1)!;
              return (
                <div key={e.id} style={S.hItem}>
                  <div style={S.hMain}>
                    <div style={S.hName}>{e.item_name}</div>
                    <div style={S.hAmt}>{fmt(e.amount)}</div>
                  </div>
                  <div style={S.hMeta}>
                    <span>{e.date.substring(5).replace("-", ".")}</span>
                    <span>·</span>
                    <span>{e.recorder === "머슴" ? "머슴👨‍🌾" : "공주👸"}</span>
                    <span>·</span>
                    <span style={{ display: "inline-flex", alignItems: "center" }}>{card && <Dot color={card.color} />}{(card?.name as any)?.[lang]?.split(" ")[0]}</span>
                    {editingCatId === e.id ? (
                      <select defaultValue={e.category} onChange={(ev) => e.id && handleCatEdit(e.id, ev.target.value)} style={S.catSel}>
                        {CATS.map((c) => <option key={c.id} value={c.id}>{c.emoji} {(c as any)[lang]}</option>)}
                      </select>
                    ) : (
                      <span onClick={() => setEditingCatId(e.id!)} style={S.catBadge}>{cat.emoji} {(cat as any)[lang]}</span>
                    )}
                    <span style={{ flex: 1 }} />
                    <button onClick={() => handleEditStart(e)} style={S.iconBtn} aria-label={t.edit}>{ICONS.edit}</button>
                    <button onClick={() => e.id && handleDelete(e.id)} style={S.iconBtn} aria-label="delete">{ICONS.close}</button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ━━━ REPORT ━━━ */}
        {tab === "report" && (
          <>
            <div style={S.hk}>{mLabel(selMonth)} {t.reportTotal}</div>
            <div style={S.bigRow}>
              <span style={S.big}>{num(total)}</span>
              <span style={S.bigUnit}>{t.won}</span>
            </div>

            <div style={S.cap}>{t.bizAccount}</div>
            <div style={S.kvRow}>
              <span style={{ ...S.kvKey, fontWeight: 600, color: "var(--tx1)" }}>{t.bizSettle}</span>
              <span style={{ ...S.kvVal, fontSize: 20 }}>{fmt(bizSettle)}</span>
            </div>
            {settleCardIds.map((cid) => {
              const card = CARDS.find((c) => c.id === cid)!;
              const amt = mExp.filter((e) => e.card_id === cid).reduce((s, e) => s + e.amount, 0);
              return (
                <div key={cid} style={S.kvRow}>
                  <span style={S.kvKey}><Dot color={card.color} />{shortName(card)}</span>
                  <span style={{ ...S.kvVal, color: "var(--tx2)", fontWeight: 500 }}>{fmt(amt)}</span>
                </div>
              );
            })}

            <div style={S.cap}>{t.benefitSummary}</div>
            {CARDS.map((c) => {
              const sp = cardTotals[c.id] || 0;
              const ach = c.benefits.filter((b) => b.threshold > 0 && sp >= b.threshold);
              const miss = c.benefits.filter((b) => b.threshold > 0 && sp < b.threshold);
              const ths = [...new Set(c.benefits.filter((b) => b.threshold > 0).map((b) => b.threshold))];
              return (
                <div key={c.id} style={S.rptCard}>
                  <div style={S.kvRow}>
                    <span style={{ ...S.kvKey, color: "var(--tx1)", fontWeight: 600 }}><Dot color={c.color} />{(c.name as any)[lang]}</span>
                    <span style={S.kvVal}>{fmt(sp)}</span>
                  </div>
                  {ach.map((b, i) => <div key={i} style={{ ...S.bOk, fontSize: 13 }}>✓ {(b as any)[lang]}</div>)}
                  {miss.map((b, i) => <div key={i} style={{ ...S.bWait, fontSize: 13 }}>○ {t.notAchieved} · {(b as any)[lang]} ({fmt(b.threshold - sp)} {t.short})</div>)}
                  {ths.length === 0 && <div style={{ ...S.bWait, fontSize: 13 }}>{t.noLimit}</div>}
                </div>
              );
            })}

            {catTotals.length > 0 && (
              <>
                <div style={S.cap}>{t.catBreakdown}</div>
                {catTotals.map((c) => (
                  <div key={c.id} style={{ padding: "8px 0" }}>
                    <div style={S.kvRowTight}>
                      <span style={S.kvKey}>{c.emoji} {c.name}</span>
                      <span style={S.kvVal}>{fmt(c.total)} <span style={{ color: "var(--tx3)", fontWeight: 500, fontSize: 12.5 }}>{total > 0 ? ((c.total / total) * 100).toFixed(1) : 0}%</span></span>
                    </div>
                    <div style={S.barTrack}><div style={{ ...S.barFill, width: `${(c.total / catTotals[0].total) * 100}%` }} /></div>
                  </div>
                ))}
              </>
            )}

            <div style={S.cap}>{t.cardUsage}</div>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={PAYMENTS.map((c) => ({ name: (c.name as any)[lang].split(" ")[0], amount: cardTotals[c.id] || 0 }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: tok.tx3 }} axisLine={{ stroke: tok.hair }} tickLine={false} />
                  <YAxis tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}${t.man}`} tick={{ fontSize: 11, fill: tok.tx3 }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip formatter={(v: any) => fmt(v)} cursor={{ fill: tok.bg3, opacity: 0.4 }}
                    contentStyle={{ background: tok.bg1, border: `1px solid ${tok.hair}`, borderRadius: 12, color: tok.tx1 }}
                    labelStyle={{ color: tok.tx2 }} itemStyle={{ color: tok.tx1 }} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {PAYMENTS.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Bottom tab bar */}
      <nav style={S.tabBar}>
        {tabItems.map((ti) => (
          <button key={ti.id} onClick={() => setTab(ti.id)} style={{ ...S.tabBtn, color: tab === ti.id ? "var(--tx1)" : "var(--tx3)" }}
            aria-current={tab === ti.id ? "page" : undefined}>
            {ti.icon}
            <span style={{ fontSize: 11, fontWeight: 600 }}>{ti.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ═══ Styles ═══
   김가네 v5 토큰(globals.css). 숫자는 tabular, 큰 숫자 하나, 나머지는 접힘 줄. */
const S: Record<string, React.CSSProperties> = {
  app: { maxWidth: 480, margin: "0 auto", background: "var(--bg0)", minHeight: "100vh", color: "var(--tx1)" },
  top: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "calc(14px + env(safe-area-inset-top)) 20px 6px" },
  brand: { fontSize: 17, fontWeight: 800, letterSpacing: 0.5, color: "var(--tx1)" },
  brandSub: { fontSize: 12, color: "var(--tx3)", marginTop: 2 },
  topRight: { display: "flex", gap: 8, alignItems: "center" },
  chip: { background: "var(--bg1)", color: "var(--tx2)", border: "none", borderRadius: 12, padding: "0 12px", height: 34, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  monthWrap: { position: "relative", display: "flex", alignItems: "center" },
  monthSel: { appearance: "none", WebkitAppearance: "none", background: "var(--bg1)", color: "var(--tx1)", border: "none", borderRadius: 12, padding: "0 30px 0 12px", height: 34, fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  monthCaret: { position: "absolute", right: 10, pointerEvents: "none", color: "var(--tx2)", display: "flex" },
  content: { padding: "18px 20px calc(110px + env(safe-area-inset-bottom))" },

  hk: { fontSize: 14, fontWeight: 600, color: "var(--tx2)", marginTop: 10 },
  bigRow: { display: "flex", alignItems: "baseline", gap: 4, marginTop: 10, flexWrap: "wrap" },
  big: { fontSize: "clamp(40px, 13vw, 56px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1, color: "var(--tx1)" },
  bigUnit: { fontSize: 21, fontWeight: 600, color: "var(--tx2)" },
  sayLine: { fontSize: 17, fontWeight: 600, marginTop: 18, lineHeight: 1.5 },
  sayMeta: { fontSize: 14, color: "var(--tx3)", marginTop: 2 },

  fold: { borderTop: "1px solid var(--hair)" },
  foldEnd: { borderTop: "1px solid var(--hair)" },
  foldBtn: { width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 0", minHeight: 56, background: "none", border: "none", color: "inherit", textAlign: "left" },
  foldTitle: { fontSize: 16, fontWeight: 600, color: "var(--tx1)" },
  foldSum: { fontSize: 13, color: "var(--tx3)", marginTop: 4, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  foldBody: { paddingBottom: 16 },
  chev: { width: 30, height: 30, borderRadius: 15, background: "var(--bg1)", color: "var(--tx2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.25s" },

  dot: { display: "inline-block", width: 8, height: 8, borderRadius: 4, marginRight: 7, flexShrink: 0, boxShadow: "0 0 0 1.5px var(--dot-ring)" },
  lineItem: { display: "flex", alignItems: "baseline", fontSize: 14, padding: "6px 0", lineHeight: 1.5 },
  kvRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", fontSize: 14 },
  kvRowTight: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 14 },
  kvKey: { display: "inline-flex", alignItems: "center", color: "var(--tx2)", minWidth: 0 },
  kvVal: { fontWeight: 600, color: "var(--tx1)", whiteSpace: "nowrap" },
  note: { fontSize: 12.5, color: "var(--tx3)", marginTop: 4 },
  cap: { fontSize: 12, fontWeight: 600, letterSpacing: 0.6, color: "var(--tx3)", margin: "30px 0 6px" },

  cardGauge: { padding: "12px 0", borderTop: "1px solid var(--hair)" },
  cardHead: { display: "flex", alignItems: "center", marginBottom: 10 },
  cardNm: { fontWeight: 600, fontSize: 15, flex: 1 },
  cardAmt: { fontWeight: 600, fontSize: 15 },
  gaugeTrack: { position: "relative", height: 8, background: "var(--bg3)", borderRadius: 2, marginBottom: 20 },
  gaugeFill: { position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 2, transition: "width 0.5s" },
  gaugeMark: { position: "absolute", top: -3, width: 2, height: 14, marginLeft: -1, background: "var(--hair2)", borderRadius: 1 },
  gaugeLabel: { position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: "var(--tx3)", whiteSpace: "nowrap" },
  bOk: { fontSize: 12.5, color: "var(--good)", marginTop: 3 },
  bWait: { fontSize: 12.5, color: "var(--tx3)", marginTop: 3 },

  prNum: { width: 20, height: 20, borderRadius: 10, background: "var(--bg3)", color: "var(--tx1)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, marginRight: 8, flexShrink: 0 },

  fRow: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 7, color: "var(--tx2)" },
  input: { width: "100%", height: 50, padding: "0 14px", borderRadius: 12, border: "1px solid var(--hair)", fontSize: 17, outline: "none", background: "var(--bg1)", color: "var(--tx1)" },
  inputAlt: { width: "100%", height: 48, padding: "0 14px", borderRadius: 12, border: "1px solid var(--hair2)", fontSize: 16, outline: "none", background: "var(--field)", color: "var(--tx1)" },
  seg: { display: "flex", gap: 4, background: "var(--bg1)", borderRadius: 12, padding: 4 },
  segBtn: { flex: 1, height: 40, border: "none", borderRadius: 9, background: "transparent", color: "var(--tx3)", fontSize: 15, fontWeight: 600, cursor: "pointer" },
  segAct: { background: "var(--bg3)", color: "var(--tx1)" },
  cardGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  cardBtn: { display: "flex", alignItems: "center", height: 46, padding: "0 14px", border: "1.5px solid transparent", borderRadius: 12, background: "var(--bg1)", color: "var(--tx2)", fontSize: 15, fontWeight: 600, cursor: "pointer" },
  cardBtnAct: { borderColor: "var(--tx1)", color: "var(--tx1)" },
  autoCat: { marginTop: 7, fontSize: 13, color: "var(--tx2)", fontWeight: 600 },
  submitBtn: { width: "100%", height: 54, border: "none", borderRadius: 14, background: "var(--action)", color: "var(--on-action)", fontSize: 17, fontWeight: 700, cursor: "pointer", marginTop: 6 },

  histFilterRow: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 4, WebkitOverflowScrolling: "touch" as any, scrollbarWidth: "none" },
  histChip: { flexShrink: 0, display: "inline-flex", alignItems: "center", height: 34, padding: "0 13px", border: "none", borderRadius: 12, background: "var(--bg1)", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", color: "var(--tx3)" },
  histChipAct: { background: "var(--bg3)", color: "var(--tx1)" },
  empty: { textAlign: "center", padding: 36, color: "var(--tx3)", fontSize: 14 },
  hItem: { padding: "12px 0", borderTop: "1px solid var(--hair)" },
  hMain: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 },
  hName: { fontWeight: 600, fontSize: 15, color: "var(--tx1)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  hAmt: { fontWeight: 600, fontSize: 16, whiteSpace: "nowrap" },
  hMeta: { display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, color: "var(--tx3)", marginTop: 4, flexWrap: "wrap" },
  iconBtn: { width: 30, height: 30, borderRadius: 15, background: "var(--bg1)", border: "none", color: "var(--tx2)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  catBadge: { background: "var(--bg1)", color: "var(--tx2)", padding: "3px 8px", borderRadius: 8, cursor: "pointer", fontSize: 12 },
  catSel: { fontSize: 12, padding: "3px 4px", borderRadius: 8, border: "1px solid var(--hair2)", background: "var(--field)", color: "var(--tx1)" },
  editOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 },
  editModal: { background: "var(--bg1)", borderRadius: "22px 22px 0 0", padding: "20px 20px calc(20px + env(safe-area-inset-bottom))", width: "100%", maxWidth: 480 },
  sheetTitle: { fontSize: 17, fontWeight: 700, marginBottom: 14 },

  rptCard: { padding: "4px 0 10px", borderTop: "1px solid var(--hair)" },
  barTrack: { height: 6, background: "var(--bg3)", borderRadius: 2, marginTop: 7 },
  barFill: { height: "100%", background: "var(--tx2)", borderRadius: 2 },

  tabBar: { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, display: "flex", justifyContent: "center", gap: 8, background: "var(--bg0)", borderTop: "1px solid var(--hair)", padding: "8px 12px calc(8px + env(safe-area-inset-bottom))" },
  tabBtn: { flex: 1, maxWidth: 110, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 0", border: "none", background: "transparent", cursor: "pointer" },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--tx3)" },
};
