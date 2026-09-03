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
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
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
