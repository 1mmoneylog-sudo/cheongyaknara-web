// 정기 수집 스크립트 — GitHub Actions가 이 파일을 주기적으로 실행해서
// data/notices.json (진행중·예정) 과 data/notices-closed.json (마감) 을 갱신합니다.
//
// 로컬에서 테스트하려면:
//   LH_SERVICE_KEY=발급받은키 GH_SERVICE_KEY=발급받은키 REB_SERVICE_KEY=발급받은키 npm run collect
//
// ✅ 2026-09-02: 청약홈(한국부동산원) API로 GH 세대수를 보완하는 단계 추가
// ✅ 2026-09-03 (1차): "테스트지구" 등 GH 내부 테스트용 더미 공고 필터 추가,
//    청약홈 API를 세대수 보완용뿐 아니라 자체 공고(분양+임대)도 목록에 추가
// ✅ 2026-09-03 (2차):
//    - source_agency를 "REB" → "청약홈"으로 통일 (프론트 필터 탭과 매칭)
//    - "OOOO년 데이터관리" 같은 GH 관리용 더미 공고도 걸러내는 패턴 추가
//    - 공고를 마감 / 진행중·예정(1개월 이내) / 너무 먼 예정(제외) 세 그룹으로 분류
//      → 마감은 notices-closed.json, 진행중·예정은 notices.json 으로 따로 저장
//      → "너무 먼 예정"은 이번 회차에는 빼고, 시작일이 가까워지면 다음 수집 때 자동 포함됨

const fs = require("fs");
const path = require("path");
const { fetchLhList, fetchLhDetail, fetchLhSupply, normalizeLhNotice } = require("../lib/collectors/lh");
const { fetchGhAll, normalizeGhNotice } = require("../lib/collectors/gh");
const { fetchRebAll, normalizeAllRebNotices, fillHouseholdCountFromReb } = require("../lib/collectors/reb");

const OUTPUT_PATH = path.join(__dirname, "..", "data", "notices.json");
const CLOSED_OUTPUT_PATH = path.join(__dirname, "..", "data", "notices-closed.json");

// 예정 공고를 얼마나 먼 미래까지 노출할지 (일 단위). 이보다 먼 예정 공고는
// 이번 회차에서는 빼고, 시작일이 이 범위 안으로 들어오면 다음 수집 때 자동으로 포함됨.
const UPCOMING_WINDOW_DAYS = 30;

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

/** 청약홈 원본 데이터를 한 번만 가져와서, ① 자체 공고 목록과 ② GH 세대수 보완에 함께 쓴다 */
async function collectReb() {
  const serviceKey = process.env.REB_SERVICE_KEY;
  if (!serviceKey) {
    console.warn("⚠️ REB_SERVICE_KEY가 없어 청약홈 수집을 건너뜁니다.");
    return { notices: [], rebResults: [] };
  }
  try {
    const rebResults = await fetchRebAll(serviceKey);
    const notices = normalizeAllRebNotices(rebResults);
    console.log(`청약홈 전체(분양+임대 등): ${notices.length}건`);
    return { notices, rebResults };
  } catch (err) {
    console.error("청약홈 수집 실패:", err.message);
    return { notices: [], rebResults: [] };
  }
}

/** 제목에 이런 단어가 포함되면 실제 공고가 아닌 내부 테스트/점검/관리용 데이터로 보고 제외한다.
 *  (GH 원본 데이터에 "테스트지구", "오픈테스트", "OOOO년 데이터관리" 등 더미 공고가
 *   섞여 있는 게 확인됨, 2026-09-03) */
const TEST_TITLE_PATTERN = /테스트|점검용|오픈테스트|시스템\s*점검|데이터\s*관리|\d{4}년.*데이터/;

function isTestNotice(notice) {
  return TEST_TITLE_PATTERN.test(notice.title || "");
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

/**
 * 공고를 세 그룹으로 분류한다.
 *  - "closed": 접수종료일이 이미 지남 → 마감 목록으로
 *  - "active": 이미 접수 시작했거나(진행중), 시작일이 UPCOMING_WINDOW_DAYS 이내(예정) → 메인 목록으로
 *  - "too_far": 시작일이 UPCOMING_WINDOW_DAYS보다 더 뒤 → 이번엔 제외 (다음 수집 때 자동 재검토)
 * 날짜 정보가 아예 없는 경우는 판단을 보류하고 "active"로 둔다 (정보 없다고 숨기면 더 위험함).
 */
function classifyNotice(notice, now) {
  const start = parseFlexibleDate(notice.apply_start_date);
  const end = parseFlexibleDate(notice.apply_end_date);

  if (end && end.getTime() < now.getTime()) {
    return "closed";
  }

  if (start && start.getTime() > now.getTime()) {
    const daysUntilStart = (start.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    return daysUntilStart <= UPCOMING_WINDOW_DAYS ? "active" : "too_far";
  }

  // 시작일이 이미 지났거나(진행중) 날짜 정보를 알 수 없는 경우
  return "active";
}

async function main() {
  console.log("=== 청약나라 데이터 수집 시작 ===");
  const [lhNotices, ghNotices, reb] = await Promise.all([collectLh(), collectGh(), collectReb()]);
  const combined = [...lhNotices, ...ghNotices, ...reb.notices];

  const noTestNotices = combined.filter((n) => !isTestNotice(n));
  console.log(`테스트/점검/관리용 공고 제외: ${combined.length}건 → ${noTestNotices.length}건`);

  // 같은 id가 중복으로 들어오는 경우(원본 데이터 중복 등) 제거
  const seen = new Set();
  const deduped = noTestNotices.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });
  console.log(`중복 제거: ${noTestNotices.length}건 → ${deduped.length}건`);

  // GH 등 세대수가 비어있는 공고를 청약홈 데이터로 보완 (분류 전에 실행)
  const supplemented = fillHouseholdCountFromReb(deduped, reb.rebResults);

  const now = new Date();
  const closed = [];
  const active = [];
  let tooFarCount = 0;

  for (const notice of supplemented) {
    const group = classifyNotice(notice, now);
    if (group === "closed") {
      closed.push(notice);
    } else if (group === "active") {
      active.push(notice);
    } else {
      tooFarCount++;
    }
  }

  console.log(
    `분류 결과: 마감 ${closed.length}건 / 진행중·예정(1개월 이내) ${active.length}건 / ` +
      `너무 먼 예정(이번엔 제외) ${tooFarCount}건`
  );

  active.sort(
    (a, b) =>
      (parseFlexibleDate(a.apply_end_date)?.getTime() ?? Infinity) -
      (parseFlexibleDate(b.apply_end_date)?.getTime() ?? Infinity)
  );
  // 마감 목록은 최근에 마감된 것부터 보이게 내림차순 정렬
  closed.sort(
    (a, b) =>
      (parseFlexibleDate(b.apply_end_date)?.getTime() ?? 0) -
      (parseFlexibleDate(a.apply_end_date)?.getTime() ?? 0)
  );

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify({ generated_at: new Date().toISOString(), count: active.length, notices: active }, null, 2)
  );
  fs.writeFileSync(
    CLOSED_OUTPUT_PATH,
    JSON.stringify({ generated_at: new Date().toISOString(), count: closed.length, notices: closed }, null, 2)
  );

  console.log(`=== 완료: 진행중·예정 ${active.length}건(${OUTPUT_PATH}), 마감 ${closed.length}건(${CLOSED_OUTPUT_PATH}) ===`);
}

main().catch((err) => {
  console.error("수집 스크립트 실패:", err);
  process.exit(1);
});
