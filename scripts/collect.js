// 정기 수집 스크립트 — GitHub Actions가 이 파일을 주기적으로 실행해서
// data/notices.json 을 최신 상태로 갱신합니다.

const fs = require("fs");
const path = require("path");
const { fetchLhList, fetchLhDetail, fetchLhSupply, normalizeLhNotice } = require("../lib/collectors/lh");
//const { fetchGhAll, normalizeGhNotice } = require("../lib/collectors/gh");
const { fetchCheongyakhomeAll, normalizeCheongyakhomeNotice } = require("../lib/collectors/cheongyakhome");

const SHARED_SERVICE_KEY =
  process.env.PUBLIC_DATA_API_KEY || process.env.LH_SERVICE_KEY || process.env.GH_SERVICE_KEY;

const OUTPUT_PATH = path.join(__dirname, "..", "data", "notices.json");

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

async function collectLh() {
  const serviceKey = SHARED_SERVICE_KEY;
  if (!serviceKey) {
    console.warn("⚠️ 인증키가 없어 LH 수집을 건너뜁니다.");
    return [];
  }

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
      results.push(normalizeLhNotice(item, {}, []));
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return results;
}

async function collectGh() {
  const serviceKey = SHARED_SERVICE_KEY;
  if (!serviceKey) {
    console.warn("⚠️ 인증키가 없어 GH 수집을 건너뜁니다.");
    return [];
  }
  try {
    const { notices, supplies, housingTypes, projects } = await fetchGhAll(serviceKey);
    console.log(`GH 모집정보(필터 전): ${notices.length}건`);

    // GH API에는 "테스트지구", "테스트(...)" 같은 시스템 점검용 더미 데이터가 섞여 있어 제외
    const realNotices = notices.filter((n) => {
      const title = n["공고명"] ?? "";
      return !title.includes("테스트") && !title.includes("점검") && !title.includes("샘플");
    });
    console.log(`GH 모집정보(테스트 데이터 제외): ${realNotices.length}건`);

    return realNotices
      .map((n) => normalizeGhNotice(n, supplies, housingTypes, projects))
      .filter((n) => n.apply_end_date);
  } catch (err) {
    console.error("GH 수집 실패:", err.message);
    return [];
  }
}
async function collectCheongyakhome() {
  console.warn("⚠️ 청약홈 수집은 아직 준비되지 않아 건너뜁니다.");
  return [];
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

function isStillRelevant(notice, now) {
  const end = parseFlexibleDate(notice.apply_end_date);
  if (!end) return true;
  return end.getTime() >= now.getTime();
}

async function main() {
  console.log("=== 청약나라 데이터 수집 시작 ===");
  const [lhNotices, ghNotices, chNotices] = await Promise.all([
    collectLh(),
    collectGh(),
    collectCheongyakhome(),
  ]);
  const combined = [...lhNotices, ...ghNotices, ...chNotices];

  const now = new Date();
  const relevant = combined.filter((n) => isStillRelevant(n, now));
  console.log(`마감 제외 필터: ${combined.length}건 → ${relevant.length}건`);

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
