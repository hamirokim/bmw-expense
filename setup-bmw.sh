#!/bin/bash
# ═══════════════════════════════════════
# B.M.W 가계부 - 프로젝트 파일 자동 생성
# bmw-expense 폴더 안에서 실행할 것
# ═══════════════════════════════════════

echo "🚗 B.M.W 가계부 파일 생성 시작..."

# ─── 1) .env.local (여기에 Supabase 키 넣기) ───
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL_붙여넣기
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key_붙여넣기
ENVEOF

# ─── 2) Supabase client ───
mkdir -p src/lib
cat > src/lib/supabase.ts << 'EOF'
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
EOF

# ─── 3) Layout ───
cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "B.M.W 가계부",
  description: "爸爸妈妈 AND ME",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800;900&family=Noto+Sans+SC:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body>{children}</body>
    </html>
  );
}
EOF

# ─── 4) globals.css ───
cat > src/app/globals.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: 'Noto Sans KR', 'Noto Sans SC', sans-serif;
  background: #f5f5f7;
  -webkit-font-smoothing: antialiased;
}
input, select, button {
  font-family: inherit;
}
EOF

# ─── 5) Main page ───
cat > src/app/page.tsx << 'PAGEEOF'
"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from "recharts";

/* ═══ i18n ═══ */
const LANG: Record<string, Record<string, any>> = {
  ko: {
    appName: "B.M.W", appSub: "爸爸妈妈 AND ME",
    tabs: { dashboard: "대시보드", input: "입력", history: "내역", report: "리포트" },
    totalSpent: "이번 달 총 지출", bizSettle: "가게통장 입금 예정",
    bizSettleNote: "국민+현대 개인지출분", cardGuide: "카드 사용 가이드",
    cardPerf: "카드별 실적", catTop: "카테고리별 지출 TOP",
    priority: "사용 우선순위", achieved: "달성", remaining: "잔여",
    noReq: "실적 무관", date: "날짜", recorder: "입력자", card: "카드",
    itemName: "물품명", itemPlaceholder: "예: 쿠팡 기저귀, 스타벅스",
    amount: "금액", amountUnit: "원", save: "저장", saved: "✅ 저장됨!",
    count: "건", noData: "이번 달 기록이 없어요", reportTotal: "총 지출",
    bizAccount: "가게통장 입금액", benefitSummary: "카드 혜택 달성",
    catBreakdown: "카테고리별 지출", cardUsage: "카드별 사용액",
    notAchieved: "미달성", short: "부족", moreFor: "더 →",
    noLimit: "적립 한도 없음", kookmin: "국민 쿠팡", hyundai: "현대 사업자",
    won: "원", man: "만", vsLastMonth: "지난달 대비", noLastMonth: "지난달 데이터 없음",
    edit: "수정", cancel: "취소",
  },
  zh: {
    appName: "B.M.W", appSub: "爸爸妈妈 AND ME",
    tabs: { dashboard: "仪表盘", input: "记账", history: "明细", report: "报表" },
    totalSpent: "本月总支出", bizSettle: "店铺账户待转入",
    bizSettleNote: "国民+现代个人消费部分", cardGuide: "刷卡指南",
    cardPerf: "各卡实绩", catTop: "分类支出 TOP",
    priority: "刷卡优先顺序", achieved: "已达标", remaining: "还差",
    noReq: "无实绩要求", date: "日期", recorder: "记录人", card: "卡片",
    itemName: "商品名", itemPlaceholder: "例: Coupang 尿布, 星巴克",
    amount: "金额", amountUnit: "韩元", save: "保存", saved: "✅ 已保存!",
    count: "笔", noData: "本月暂无记录", reportTotal: "总支出",
    bizAccount: "店铺账户转入金额", benefitSummary: "卡片优惠达标情况",
    catBreakdown: "分类支出", cardUsage: "各卡使用金额",
    notAchieved: "未达标", short: "不足", moreFor: "再刷 →",
    noLimit: "无积分上限", kookmin: "国民 Coupang", hyundai: "现代 商务卡",
    won: "韩元", man: "万", vsLastMonth: "对比上月", noLastMonth: "无上月数据",
    edit: "修改", cancel: "取消",
  },
};

/* ═══ Cards ═══ */
const CARDS = [
  { id: "shinhan", name: { ko: "신한 신용", zh: "新韩信用卡" }, icon: "💳", color: "#0046FF",
    benefits: [{ threshold: 300000, ko: "전세대출 이자 감면", zh: "全租贷款利息减免" }],
    priority: 1, prNote: { ko: "최우선 30만 채우기", zh: "最优先刷满30万" } },
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

/* ═══ Categories ═══ */
const CATS = [
  { id: "food", ko: "식비", zh: "食材", emoji: "🍚", keywords: ["마트","이마트","홈플러스","쌀","고기","야채","과일","반찬","식재료"] },
  { id: "eating_out", ko: "외식/배달", zh: "外食/外卖", emoji: "🍔", keywords: ["배달","쿠팡이츠","배민","요기요","맥도날드","치킨","피자","카페","스타벅스","커피","식당","밥","饭"] },
  { id: "grocery", ko: "생활용품", zh: "生活用品", emoji: "🧴", keywords: ["다이소","생활용품","세제","휴지","치약","샴푸","쿠팡"] },
  { id: "transport", ko: "교통/충전", zh: "交通/充电", emoji: "🚗", keywords: ["주유","충전","전기차","주차","톨비","고속도로","택시","교통","加油"] },
  { id: "shopping", ko: "쇼핑/의류", zh: "购物/服装", emoji: "👕", keywords: ["옷","신발","유니클로","자라","무신사","네이버쇼핑","G마켓","11번가","옥션","淘宝"] },
  { id: "baby", ko: "육아", zh: "育儿", emoji: "👶", keywords: ["기저귀","분유","이유식","아기","유아","장난감","어린이집","尿布","奶粉"] },
  { id: "medical", ko: "의료", zh: "医疗", emoji: "🏥", keywords: ["병원","약국","의원","치과","한의원","안과","医院"] },
  { id: "subscription", ko: "구독/멤버십", zh: "订阅/会员", emoji: "📱", keywords: ["구독","넷플릭스","유튜브","멤버십","와우","보험료"] },
  { id: "utility", ko: "공과금", zh: "公共费用", emoji: "💡", keywords: ["전기","가스","수도","관리비","통신","인터넷","핸드폰","电费","水费"] },
  { id: "event", ko: "경조사", zh: "红白事", emoji: "🎉", keywords: ["축의금","조의금","선물","돌잔치","결혼","红包"] },
  { id: "etc", ko: "기타", zh: "其他", emoji: "📦", keywords: [] },
];

const PIE_COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8","#F7DC6F","#BB8FCE","#85C1E9","#F0B27A"];
const fmt = (n: number) => n.toLocaleString("ko-KR") + "원";
const todayStr = () => new Date().toISOString().split("T")[0];
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

function classify(name: string, rules: Rule[]) {
  const l = name.toLowerCase();
  for (const r of rules) if (l.includes(r.keyword.toLowerCase())) return r.category_id;
  for (const c of CATS) for (const k of c.keywords) if (l.includes(k)) return c.id;
  return "etc";
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

/* ═══ MAIN ═══ */
export default function Home() {
  const [lang, setLang] = useState("ko");
  const t = LANG[lang];
  const [tab, setTab] = useState("dashboard");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selMonth, setSelMonth] = useState(monthKey(todayStr()));
  const [form, setForm] = useState({ date: todayStr(), recorder: "머슴", cardId: "shinhan", itemName: "", amount: "" });
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editForm, setEditForm] = useState<(Expense & { amount_str: string }) | null>(null);

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
  const bizSettle = useMemo(() => mExp.filter((e) => e.card_id === "kookmin" || e.card_id === "hyundai").reduce((s, e) => s + e.amount, 0), [mExp]);
  const months = useMemo(() => {
    const s = new Set(expenses.map((e) => monthKey(e.date)));
    s.add(monthKey(todayStr()));
    return [...s].sort().reverse();
  }, [expenses]);

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

  const handleCatEdit = async (expId: number, newCat: string) => {
    const exp = expenses.find((e) => e.id === expId);
    await supabase.from("expenses").update({ category: newCat }).eq("id", expId);
    setExpenses((p) => p.map((e) => (e.id === expId ? { ...e, category: newCat } : e)));
    if (exp) {
      const kw = exp.item_name.toLowerCase();
      const existing = rules.find((r) => r.keyword.toLowerCase() === kw);
      if (existing) {
        await supabase.from("category_rules").update({ category_id: newCat }).eq("id", existing.id);
        setRules((p) => p.map((r) => (r.id === existing.id ? { ...r, category_id: newCat } : r)));
      } else {
        const { data } = await supabase.from("category_rules").insert({ keyword: kw, category_id: newCat }).select().single();
        if (data) setRules((p) => [...p, data]);
      }
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

  /* ─ CardGauge ─ */
  const CardGauge = ({ card }: { card: (typeof CARDS)[0] }) => {
    const spent = cardTotals[card.id] || 0;
    const ths = [...new Set(card.benefits.filter((b) => b.threshold > 0).map((b) => b.threshold))];
    const maxT = Math.max(...ths, 1);
    const pct = ths.length > 0 ? Math.min((spent / maxT) * 100, 100) : 100;
    const achieved = card.benefits.filter((b) => b.threshold > 0 && spent >= b.threshold);
    const pending = card.benefits.filter((b) => b.threshold > 0 && spent < b.threshold);
    return (
      <div style={{ ...S.cardGauge, borderLeft: `4px solid ${card.color}` }}>
        <div style={S.cardHead}>
          <span style={{ fontSize: 18 }}>{card.icon}</span>
          <span style={S.cardNm}>{(card.name as any)[lang]}</span>
          <span style={S.cardAmt}>{fmt(spent)}</span>
        </div>
        {ths.length > 0 && (
          <div style={S.gaugeTrack}>
            <div style={{ ...S.gaugeFill, width: `${pct}%`, backgroundColor: card.color }} />
            {ths.map((th, i) => (
              <div key={i} style={{ ...S.gaugeMark, left: `${(th / maxT) * 100}%` }}>
                <span style={S.gaugeLabel}>{th / 10000}{t.man}</span>
              </div>
            ))}
          </div>
        )}
        {achieved.map((b, i) => <div key={i} style={S.bOk}>✅ {(b as any)[lang]}</div>)}
        {pending.map((b, i) => <div key={i} style={S.bWait}>⬜ {fmt(b.threshold - spent)} {t.moreFor} {(b as any)[lang]}</div>)}
      </div>
    );
  };

  const tabItems = [
    { id: "dashboard", label: t.tabs.dashboard, icon: "📊" },
    { id: "input", label: t.tabs.input, icon: "✏️" },
    { id: "history", label: t.tabs.history, icon: "📋" },
    { id: "report", label: t.tabs.report, icon: "📈" },
  ];

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>{t.appName}</h1>
          <div style={S.subtitle}>{t.appSub}</div>
        </div>
        <div style={S.headerRight}>
          <button onClick={() => setLang((l) => (l === "ko" ? "zh" : "ko"))} style={S.langBtn}>
            {lang === "ko" ? "中文" : "한국어"}
          </button>
          <select value={selMonth} onChange={(e) => setSelMonth(e.target.value)} style={S.monthPicker}>
            {months.map((m) => <option key={m} value={m}>{m.replace("-", ".")}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabWrap}>
        <div style={S.tabBar}>
          {tabItems.map((ti) => (
            <button key={ti.id} onClick={() => setTab(ti.id)} style={{ ...S.tabBtn, ...(tab === ti.id ? S.tabAct : {}) }}>
              <span style={{ fontSize: 16 }}>{ti.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{ti.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={S.content}>
        {/* ━━━ DASHBOARD ━━━ */}
        {tab === "dashboard" && (
          <>
            <div style={S.sumRow}>
              <div style={{ ...S.sumCard, background: "linear-gradient(135deg,#667eea,#764ba2)" }}>
                <div style={S.sumLabel}>{t.totalSpent}</div>
                <div style={S.sumVal}>{fmt(total)}</div>
              </div>
              <div style={{ ...S.sumCard, background: "linear-gradient(135deg,#f093fb,#f5576c)" }}>
                <div style={S.sumLabel}>{t.bizSettle}</div>
                <div style={S.sumVal}>{fmt(bizSettle)}</div>
                <div style={S.sumNote}>{t.bizSettleNote}</div>
              </div>
            </div>

            {/* Month comparison */}
            {prevExp.length > 0 ? (
              <div style={S.compareBox}>
                <div style={S.compareTitle}>📊 {t.vsLastMonth}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <span style={{ fontSize: 13, color: "#888" }}>{prevMK.replace("-", ".")}</span>
                  <span style={{ fontSize: 13, color: "#888" }}>{fmt(prevTotal)}</span>
                  <span style={{ fontSize: 16 }}>→</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{fmt(total)}</span>
                </div>
                <div style={{ textAlign: "center", marginTop: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: monthDiff > 0 ? "#e74c3c" : "#27ae60" }}>
                    {monthDiff > 0 ? "▲" : "▼"} {fmt(Math.abs(monthDiff))}
                  </span>
                  {monthDiffPct && <span style={{ fontSize: 12, color: "#888", marginLeft: 6 }}>({monthDiff > 0 ? "+" : ""}{monthDiffPct}%)</span>}
                </div>
                <div style={{ marginTop: 10 }}>
                  {catTotals.slice(0, 4).map((c) => {
                    const prev = prevCatMap[c.id] || 0;
                    const diff = c.total - prev;
                    if (diff === 0) return null;
                    return (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0" }}>
                        <span>{c.emoji} {c.name}</span>
                        <span style={{ color: diff > 0 ? "#e74c3c" : "#27ae60", fontWeight: 600 }}>{diff > 0 ? "+" : ""}{fmt(diff)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ ...S.compareBox, textAlign: "center" as const, color: "#aaa", fontSize: 12 }}>📊 {t.noLastMonth}</div>
            )}

            {advice.length > 0 && (
              <div style={S.advBox}>
                <div style={S.advTitle}>💡 {t.cardGuide}</div>
                {advice.map((a, i) => (
                  <div key={i} style={{ ...S.advItem, fontWeight: a.urgent ? 700 : 400 }}>{a.urgent ? "🔴" : "🔵"} {a.msg}</div>
                ))}
              </div>
            )}

            <div style={S.secTitle}>{t.cardPerf}</div>
            {CARDS.map((c) => <CardGauge key={c.id} card={c} />)}

            {catTotals.length > 0 && (
              <>
                <div style={S.secTitle}>{t.catTop}</div>
                {catTotals.slice(0, 5).map((c) => (
                  <div key={c.id} style={S.catRow}>
                    <span>{c.emoji} {c.name}</span>
                    <span style={{ fontWeight: 700 }}>{fmt(c.total)}</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ━━━ INPUT ━━━ */}
        {tab === "input" && (
          <>
            <div style={S.prGuide}>
              <div style={S.prTitle}>🎯 {t.priority}</div>
              {CARDS.map((c, i) => {
                const sp = cardTotals[c.id] || 0;
                const ths = [...new Set(c.benefits.filter((b) => b.threshold > 0).map((b) => b.threshold))];
                const nextT = ths.find((th) => sp < th);
                const done = ths.length > 0 && ths.every((th) => sp >= th);
                return (
                  <div key={c.id} style={{ ...S.prItem, opacity: done ? 0.5 : 1 }}>
                    <span style={S.prNum}>{i + 1}</span>
                    <span>{c.icon} {(c.name as any)[lang]}</span>
                    {done ? <span style={S.prDone}>✅ {t.achieved}</span>
                      : nextT ? <span style={S.prLeft}>{t.remaining} {fmt(nextT - sp)}</span>
                      : <span style={S.prFree}>{t.noReq}</span>}
                  </div>
                );
              })}
            </div>

            <div style={S.formBox}>
              <div style={S.fRow}>
                <label style={S.label}>{t.date}</label>
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={S.input} />
              </div>
              <div style={S.fRow}>
                <label style={S.label}>{t.recorder}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ key: "머슴", label: "머슴 👨‍🌾", zh: "长工 👨‍🌾" }, { key: "공주", label: "공주 👸", zh: "公主 👸" }].map((r) => (
                    <button key={r.key} onClick={() => setForm((f) => ({ ...f, recorder: r.key }))}
                      style={{ ...S.togBtn, ...(form.recorder === r.key ? S.togAct : {}) }}>
                      {lang === "ko" ? r.label : r.zh}
                    </button>
                  ))}
                </div>
              </div>
              <div style={S.fRow}>
                <label style={S.label}>{t.card}</label>
                <div style={S.cardGrid}>
                  {CARDS.map((c) => (
                    <button key={c.id} onClick={() => setForm((f) => ({ ...f, cardId: c.id }))}
                      style={{ ...S.cardBtn, ...(form.cardId === c.id ? { borderColor: c.color, background: `${c.color}15` } : {}) }}>
                      <span style={{ fontSize: 15 }}>{c.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{(c.name as any)[lang].split(" ")[0]}</span>
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
                <input type="number" placeholder={t.amountUnit} value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()} style={S.input} />
              </div>
              <button onClick={handleSubmit} style={S.submitBtn}>{showSuccess ? t.saved : `💾 ${t.save}`}</button>
            </div>
          </>
        )}

        {/* ━━━ HISTORY ━━━ */}
        {tab === "history" && (
          <>
            <div style={S.hCount}>{mExp.length}{t.count} · {fmt(total)}</div>
            {mExp.length === 0 && <div style={S.empty}>{t.noData}</div>}

            {editForm && (
              <div style={S.editOverlay}>
                <div style={S.editModal}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>✏️ {t.edit}</h3>
                  <div style={S.fRow}><input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => f && ({ ...f, date: e.target.value }))} style={S.input} /></div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    {["머슴", "공주"].map((r) => (
                      <button key={r} onClick={() => setEditForm((f) => f && ({ ...f, recorder: r }))}
                        style={{ ...S.togBtn, flex: 1, ...(editForm.recorder === r ? S.togAct : {}) }}>{r}</button>
                    ))}
                  </div>
                  <div style={{ ...S.cardGrid, marginBottom: 10 }}>
                    {CARDS.map((c) => (
                      <button key={c.id} onClick={() => setEditForm((f) => f && ({ ...f, card_id: c.id }))}
                        style={{ ...S.cardBtn, ...(editForm.card_id === c.id ? { borderColor: c.color, background: `${c.color}15` } : {}) }}>
                        <span>{c.icon}</span><span style={{ fontSize: 11 }}>{(c.name as any)[lang].split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                  <input type="text" value={editForm.item_name} onChange={(e) => setEditForm((f) => f && ({ ...f, item_name: e.target.value }))} style={{ ...S.input, marginBottom: 8 }} />
                  <input type="number" value={editForm.amount_str} onChange={(e) => setEditForm((f) => f && ({ ...f, amount_str: e.target.value }))} style={{ ...S.input, marginBottom: 12 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditForm(null)} style={{ ...S.submitBtn, background: "#aaa", flex: 1 }}>{t.cancel}</button>
                    <button onClick={handleEditSave} style={{ ...S.submitBtn, flex: 1 }}>{t.save}</button>
                  </div>
                </div>
              </div>
            )}

            {[...mExp].sort((a, b) => b.date.localeCompare(a.date)).map((e) => {
              const card = CARDS.find((c) => c.id === e.card_id);
              const cat = CATS.find((c) => c.id === e.category) || CATS.at(-1)!;
              return (
                <div key={e.id} style={S.hItem}>
                  <div style={S.hTop}>
                    <span style={S.hDate}>{e.date.substring(5)} · {e.recorder === "머슴" ? "머슴👨‍🌾" : "공주👸"}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleEditStart(e)} style={S.editBtn}>✎</button>
                      <button onClick={() => e.id && handleDelete(e.id)} style={S.delBtn}>✕</button>
                    </div>
                  </div>
                  <div style={S.hMain}>
                    <div>
                      <div style={S.hName}>{e.item_name}</div>
                      <div style={S.hMeta}>
                        <span style={{ color: card?.color }}>{card?.icon} {(card?.name as any)?.[lang]?.split(" ")[0]}</span>
                        {editingCatId === e.id ? (
                          <select defaultValue={e.category} onChange={(ev) => e.id && handleCatEdit(e.id, ev.target.value)} style={S.catSel}>
                            {CATS.map((c) => <option key={c.id} value={c.id}>{c.emoji} {(c as any)[lang]}</option>)}
                          </select>
                        ) : (
                          <span onClick={() => setEditingCatId(e.id!)} style={S.catBadge}>{cat.emoji} {(cat as any)[lang]} ✎</span>
                        )}
                      </div>
                    </div>
                    <div style={S.hAmt}>{fmt(e.amount)}</div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ━━━ REPORT ━━━ */}
        {tab === "report" && (
          <>
            <div style={S.rptTotal}>
              <div style={{ fontSize: 13, color: "#888" }}>{t.reportTotal}</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{fmt(total)}</div>
            </div>

            <div style={S.settleBox}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>🏦 {t.bizAccount}</div>
              <div style={S.settleAmt}>{fmt(bizSettle)}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {t.kookmin}: {fmt(mExp.filter((e) => e.card_id === "kookmin").reduce((s, e) => s + e.amount, 0))} + {t.hyundai}: {fmt(mExp.filter((e) => e.card_id === "hyundai").reduce((s, e) => s + e.amount, 0))}
              </div>
            </div>

            <div style={S.secTitle}>{t.benefitSummary}</div>
            {CARDS.map((c) => {
              const sp = cardTotals[c.id] || 0;
              const ach = c.benefits.filter((b) => b.threshold > 0 && sp >= b.threshold);
              const miss = c.benefits.filter((b) => b.threshold > 0 && sp < b.threshold);
              const ths = [...new Set(c.benefits.filter((b) => b.threshold > 0).map((b) => b.threshold))];
              return (
                <div key={c.id} style={{ ...S.rptCard, borderLeft: `3px solid ${c.color}` }}>
                  <div style={{ fontWeight: 700 }}>{c.icon} {(c.name as any)[lang]}: {fmt(sp)}</div>
                  {ach.map((b, i) => <div key={i} style={{ color: "#27ae60", fontSize: 13 }}>✅ {(b as any)[lang]}</div>)}
                  {miss.map((b, i) => <div key={i} style={{ color: "#e74c3c", fontSize: 13 }}>❌ {t.notAchieved}: {(b as any)[lang]} ({fmt(b.threshold - sp)} {t.short})</div>)}
                  {ths.length === 0 && <div style={{ color: "#888", fontSize: 13 }}>{t.noLimit}</div>}
                </div>
              );
            })}

            {catTotals.length > 0 && (
              <>
                <div style={S.secTitle}>{t.catBreakdown}</div>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={catTotals} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={48} paddingAngle={2}
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {catTotals.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {catTotals.map((c) => (
                  <div key={c.id} style={S.catRow}>
                    <span>{c.emoji} {c.name}</span>
                    <span style={{ fontWeight: 700 }}>{fmt(c.total)} ({total > 0 ? ((c.total / total) * 100).toFixed(1) : 0}%)</span>
                  </div>
                ))}
              </>
            )}

            <div style={S.secTitle}>{t.cardUsage}</div>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={CARDS.map((c) => ({ name: (c.name as any)[lang].split(" ")[0], amount: cardTotals[c.id] || 0 }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}${t.man}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {CARDS.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══ Styles ═══ */
const S: Record<string, React.CSSProperties> = {
  app: { fontFamily: "'Noto Sans KR','Noto Sans SC',sans-serif", maxWidth: 480, margin: "0 auto", background: "#f5f5f7", minHeight: "100vh", color: "#1a1a2e" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 16px 14px", background: "linear-gradient(135deg,#1a1a2e,#16213e)", color: "#fff", borderRadius: "0 0 18px 18px" },
  title: { fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: 1 },
  subtitle: { fontSize: 11, opacity: 0.7, marginTop: 2 },
  headerRight: { display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" },
  langBtn: { background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  monthPicker: { background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 13, fontWeight: 600 },
  tabWrap: { padding: "10px 16px 0" },
  tabBar: { display: "flex", gap: 6, background: "#e8e8ed", borderRadius: 14, padding: 4 },
  tabBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 4px", border: "none", borderRadius: 10, background: "transparent", color: "#888", cursor: "pointer", transition: "all 0.2s" },
  tabAct: { background: "#fff", color: "#1a1a2e", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", fontWeight: 700 },
  content: { padding: "12px 16px 80px" },
  sumRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 },
  sumCard: { borderRadius: 14, padding: 14, color: "#fff" },
  sumLabel: { fontSize: 11, opacity: 0.85 },
  sumVal: { fontSize: 18, fontWeight: 800, marginTop: 3 },
  sumNote: { fontSize: 9, opacity: 0.7, marginTop: 3 },
  compareBox: { background: "#fff", borderRadius: 12, padding: 14, marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  compareTitle: { fontWeight: 800, fontSize: 13, marginBottom: 8, textAlign: "center" },
  advBox: { background: "linear-gradient(135deg,#fff9c4,#fff3e0)", borderRadius: 12, padding: 12, marginBottom: 14 },
  advTitle: { fontWeight: 800, fontSize: 13, marginBottom: 6 },
  advItem: { fontSize: 12, padding: "3px 0", lineHeight: 1.5 },
  cardGauge: { background: "#fff", borderRadius: 11, padding: 12, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardHead: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 },
  cardNm: { fontWeight: 700, fontSize: 13, flex: 1 },
  cardAmt: { fontWeight: 800, fontSize: 15 },
  gaugeTrack: { position: "relative", height: 7, background: "#e9ecef", borderRadius: 4, marginBottom: 6 },
  gaugeFill: { position: "absolute", top: 0, left: 0, height: "100%", borderRadius: 4, transition: "width 0.5s" },
  gaugeMark: { position: "absolute", top: -2, width: 2, height: 11, background: "#666", borderRadius: 1 },
  gaugeLabel: { position: "absolute", top: 13, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#999", whiteSpace: "nowrap" },
  bOk: { fontSize: 11, color: "#27ae60", marginTop: 2 },
  bWait: { fontSize: 11, color: "#888", marginTop: 2 },
  secTitle: { fontWeight: 800, fontSize: 15, margin: "18px 0 8px", letterSpacing: -0.3 },
  catRow: { display: "flex", justifyContent: "space-between", padding: "7px 10px", background: "#fff", borderRadius: 8, marginBottom: 5, fontSize: 13 },
  prGuide: { background: "linear-gradient(135deg,#e8f5e9,#f1f8e9)", borderRadius: 12, padding: 12, marginBottom: 16 },
  prTitle: { fontWeight: 800, fontSize: 13, marginBottom: 6 },
  prItem: { display: "flex", alignItems: "center", gap: 6, padding: "5px 0", fontSize: 12 },
  prNum: { width: 20, height: 20, borderRadius: "50%", background: "#1a1a2e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 },
  prDone: { marginLeft: "auto", color: "#27ae60", fontWeight: 700, fontSize: 11 },
  prLeft: { marginLeft: "auto", color: "#e74c3c", fontWeight: 600, fontSize: 11 },
  prFree: { marginLeft: "auto", color: "#888", fontSize: 11 },
  formBox: { background: "#fff", borderRadius: 14, padding: 14, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" },
  fRow: { marginBottom: 12 },
  label: { display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5, color: "#666" },
  input: { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, outline: "none", boxSizing: "border-box" as const, background: "#f8f9fa" },
  togBtn: { flex: 1, padding: "8px", border: "2px solid #ddd", borderRadius: 9, background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  togAct: { borderColor: "#667eea", background: "#667eea15", color: "#667eea" },
  cardGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 },
  cardBtn: { display: "flex", alignItems: "center", gap: 5, padding: "9px", border: "2px solid #ddd", borderRadius: 9, background: "transparent", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  autoCat: { marginTop: 3, fontSize: 11, color: "#667eea", fontWeight: 600 },
  submitBtn: { width: "100%", padding: "12px", border: "none", borderRadius: 10, background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", marginTop: 2 },
  hCount: { fontSize: 13, color: "#888", marginBottom: 10, fontWeight: 600 },
  empty: { textAlign: "center", padding: 36, color: "#bbb", fontSize: 13 },
  hItem: { background: "#fff", borderRadius: 10, padding: 10, marginBottom: 7, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
  hTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  hDate: { fontSize: 10, color: "#999" },
  editBtn: { background: "none", border: "none", color: "#667eea", fontSize: 14, cursor: "pointer", padding: "2px 4px" },
  delBtn: { background: "none", border: "none", color: "#ccc", fontSize: 13, cursor: "pointer", padding: "2px 4px" },
  hMain: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  hName: { fontWeight: 700, fontSize: 14, marginBottom: 3 },
  hMeta: { display: "flex", gap: 6, alignItems: "center", fontSize: 11 },
  hAmt: { fontWeight: 800, fontSize: 16, whiteSpace: "nowrap" },
  catBadge: { background: "#f0f0f0", padding: "2px 6px", borderRadius: 5, cursor: "pointer", fontSize: 10 },
  catSel: { fontSize: 11, padding: "2px 3px", borderRadius: 5, border: "1px solid #ddd" },
  editOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  editModal: { background: "#fff", borderRadius: 16, padding: 20, width: "90%", maxWidth: 400 },
  rptTotal: { textAlign: "center", padding: 18, background: "#fff", borderRadius: 14, marginBottom: 14, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" },
  settleBox: { background: "linear-gradient(135deg,#e3f2fd,#e8eaf6)", borderRadius: 12, padding: 14, marginBottom: 14, textAlign: "center" },
  settleAmt: { fontSize: 26, fontWeight: 800, margin: "6px 0", color: "#1565c0" },
  rptCard: { background: "#fff", borderRadius: 9, padding: 10, marginBottom: 7 },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" },
};
PAGEEOF

echo ""
echo "✅ 파일 생성 완료!"
echo ""
echo "⚠️  중요! .env.local 파일을 열어서 Supabase 키를 입력해야 해:"
echo "   NEXT_PUBLIC_SUPABASE_URL=https://osyfclfoomudpcuzeyht.supabase.co"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (복사한 anon key)"
echo ""
echo "키 입력 후 아래 명령어로 앱 실행:"
echo "   npm run dev"
