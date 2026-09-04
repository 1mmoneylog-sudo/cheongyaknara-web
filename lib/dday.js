// D-day 및 접수기간 진행률(게이지) 계산
function parseDate(str) {
  if (!str) return null;
  // "2026.09.23" 또는 "20260923" 둘 다 지원
  const cleaned = str.replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return null;
  const y = cleaned.slice(0, 4);
  const m = cleaned.slice(4, 6);
  const d = cleaned.slice(6, 8);
  return new Date(`${y}-${m}-${d}T23:59:59+09:00`);
}

function getDday(applyEndDate, now = new Date()) {
  const end = parseDate(applyEndDate);
  if (!end) return null;
  const diffMs = end.getTime() - now.getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  // ✅ 2026-09-04 수정: 마감이 이미 지난 경우(diffMs가 음수) Math.ceil이
  // "-0.4일" 같은 값을 0으로 반올림해버려서, 이미 마감된 공고가 "D-0(오늘 마감)"으로
  // 잘못 보이는 버그가 있었음. 마감 전(양수)에는 기존처럼 ceil로 "오늘 포함 며칠 남았는지"
  // 세고, 마감 후(음수)에는 floor를 써서 확실히 음수가 나오도록 함 → 화면에서 "마감"으로 표시됨.
  return days >= 0 ? Math.ceil(days) : Math.floor(days);
}

function getUrgencyLevel(dday) {
  if (dday === null) return "calm";
  if (dday <= 3) return "urgent";
  if (dday <= 7) return "soon";
  return "calm";
}

/** 접수 시작~마감 사이 진행률(%) 계산 — 카드의 게이지 바에 사용 */
function getProgressPercent(applyStartDate, applyEndDate, now = new Date()) {
  const start = parseDate(applyStartDate);
  const end = parseDate(applyEndDate);
  if (!start || !end || end <= start) return 0;
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const pct = (elapsed / total) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

module.exports = { parseDate, getDday, getUrgencyLevel, getProgressPercent };
