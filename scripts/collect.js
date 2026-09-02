// 정기 수집 스크립트 — GitHub Actions가 이 파일을 주기적으로 실행해서
// data/notices.json 을 최신 상태로 갱신합니다.
//
// 로컬에서 테스트하려면:
//   LH_SERVICE_KEY=발급받은키 GH_SERVICE_KEY=발급받은키 npm run collect

const fs = require("fs");
const path = require("path");
const { fetchLhList, fetchLhDetail, fetchLhSupply, normalizeLhNotice } = require("../lib/collectors/lh");
const { fetchGhAll, normalizeGhNotice } = require("../lib/collectors/gh");

const OUTPUT_PATH = path.join(__dirname, "..", "data", "notices.json");

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

async function collectLh() {
  const serviceKey = process.env.LH_SERVICE_KEY;
  if (!serviceKey) {
    console.warn("⚠️ LH_SERVICE_KEY가 없어 LH 수집을 건너뜁니다.");
    return [];
  }

  // 오늘 기준 앞뒤 넓게 잡아서 현재 접수중/예정 공고를 최대한 포함
  const today = new Date();
  const past = new Date(today);
  past.setDate(past.getDate() - 60);
  const future = new Date(today);
  future.setDate(future.getDate() + 180);

  const listItems = await fetchLhList(serviceKey, formatDate(past), formatDate(future));
  console.log(`LH 목록: ${listItems.length}건 (필터링 후)`);

  const results = [];
  for (const item of listItems) {
    try {
      const [detail, supplyRows] = await Promise.all([
        fetchLhDetail(serviceKey, item),
        fetchLhSupply(serviceKey, item).catch(() => []),
      ]);
      results.push(normalizeLhNotice(item, detail, supplyRows));
    } catch (err) {
      console.error(`LH 상세 수집 실패 (PAN_ID=${item.PAN_ID}):`, err.message);
      // 상세 실패해도 목록 정보만으로 최소한의 카드는 유지
      results.push(normalizeLhNotice(item, {}, []));
    }
    // 공공데이터포털 트래픽 보호를 위해 약간의 간격을 둠
    await new Promise((r) => setTimeout(r, 150));
  }
  return results;
}

async function collectGh() {
  const serviceKey = process.env.GH_SERVICE_KEY;
  if (!serviceKey) {
    console.warn("⚠️ GH_SERVICE_KEY가 없어 GH 수집을 건너뜁니다.");
    return [];
  }
  try {
    const { notices, supplies, housingTypes, projects } = await fetchGhAll(serviceKey);
    console.log(`GH 모집정보: ${notices.length}건`);
    return (notices ?? []).map((n) => normalizeGhNotice(n, supplies, housingTypes, projects));
  } catch (err) {
    console.error("GH 수집 실패:", err.message);
    return [];
  }
}

function parseFlexibleDate(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return null;
  const y = cleaned.slice(0, 4);
  const m = cleaned.slice(4, 6);
  const d = cleaned.slice(6, 8);
  const parsed = new Date(`${y}-${m}-${d}T23:59:59+09:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** 접수마감일이 오늘 이후(=진행중이거나 예정)인 공고만 남긴다. 마감일을 알 수 없는 경우는 일단 보여준다. */
function isStillRelevant(notice, now) {
  const end = parseFlexibleDate(notice.apply_end_date);
  if (!end) return true; // 마감일 정보가 없으면 판단 보류하고 노출
  return end.getTime() >= now.getTime();
}

async function main() {
  console.log("=== 청약나라 데이터 수집 시작 ===");
  const [lhNotices, ghNotices] = await Promise.all([collectLh(), collectGh()]);
  const combined = [...lhNotices, ...ghNotices];

  const now = new Date();
  const relevant = combined.filter((n) => isStillRelevant(n, now));
  console.log(`마감 제외 필터: ${combined.length}건 → ${relevant.length}건`);

  // 같은 id가 중복으로 들어오는 경우(원본 데이터 중복 등) 제거
  const seen = new Set();
  const deduped = relevant.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });
  console.log(`중복 제거: ${relevant.length}건 → ${deduped.length}건`);

  deduped.sort(
    (a, b) =>
      (parseFlexibleDate(a.apply_end_date)?.getTime() ?? Infinity) -
      (parseFlexibleDate(b.apply_end_date)?.getTime() ?? Infinity)
  );

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(
      { generated_at: new Date().toISOString(), count: deduped.length, notices: deduped },
      null,
      2
    )
  );
  console.log(`=== 완료: 총 ${deduped.length}건 저장 (${OUTPUT_PATH}) ===`);
}

main().catch((err) => {
  console.error("수집 스크립트 실패:", err);
  process.exit(1);
});
