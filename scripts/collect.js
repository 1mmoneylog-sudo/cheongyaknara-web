// 정기 수집 스크립트 — GitHub Actions가 이 파일을 주기적으로 실행해서
// data/notices.json 을 최신 상태로 갱신합니다.
//
// 로컬에서 테스트하려면:
//   LH_SERVICE_KEY=발급받은키 GH_SERVICE_KEY=발급받은키 REB_SERVICE_KEY=발급받은키 npm run collect
//
// ✅ 2026-09-02: 청약홈(한국부동산원) API로 GH 세대수를 보완하는 단계 추가
// ✅ 2026-09-03 (1차): "테스트지구" 등 GH 내부 테스트용 더미 공고 필터 추가,
//    청약홈 API를 세대수 보완용뿐 아니라 자체 공고(분양+임대)도 목록에 추가
// ✅ 2026-09-03 (2차): source_agency를 "REB" → "청약홈"으로 통일,
//    "OOOO년 데이터관리" 같은 GH 관리용 더미 공고 필터 추가
// ✅ 2026-09-03 (3차): 마감 페이지를 따로 두지 않기로 하고 단순화함
//    - 접수마감일이 지난 지 3일이 넘은 공고는 완전히 제외 (그 안에는 노출 유지)
//    - 접수시작일이 한 달(30일)보다 더 뒤인 "너무 먼 예정" 공고는 이번 회차에서 제외
//      (시작일이 가까워지면 다음 수집 때 자동으로 포함됨)
// ✅ 2026-09-05: LH청약플러스가 정기 점검(예: 매주 토요일)에 들어가면 목록 API 자체가
//    HTML 안내 페이지를 반환해 collectLh() 전체가 예외를 던지는 문제가 있었음.
//    LH 목록 수집만 별도로 try/catch로 감싸서, LH가 점검 중이어도 GH·청약홈은
//    정상적으로 계속 수집·저장되도록 격리함. LH는 점검이 끝나면 다음 회차에 자동 복구됨.

const fs = require("fs");
const path = require("path");
const { fetchLhList, fetchLhDetail, fetchLhSupply, normalizeLhNotice } = require("../lib/collectors/lh");
const { fetchGhAll, normalizeGhNotice } = require("../lib/collectors/gh");
const { fetchRebAll, normalizeAllRebNotices, fillHouseholdCountFromReb } = require("../lib/collectors/reb");

const OUTPUT_PATH = path.join(__dirname, "..", "data", "notices.json");

// ✅ 2026-09-04: 마감 유예(3일) 없애고 바로 제외하도록 단순화.
//    대신 당첨자 발표일이 있는 공고는 "당첨자 발표" 페이지에서 볼 수 있도록
//    발표일 기준 WINNER_TRACK_DAYS일 동안은 데이터에 남겨둠 (메인 목록에는 안 뜨고
//    당첨자 발표 페이지에서만 조회됨 — 프론트엔드가 dday<0인 건 메인 목록에서 걸러냄)
const WINNER_TRACK_DAYS = 14;

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

  const today = new Date();
  const past = new Date(today);
  past.setDate(past.getDate() - 60);
  const future = new Date(today);
  future.setDate(future.getDate() + 180);

  let listItems;
  try {
    listItems = await fetchLhList(serviceKey, formatDate(past), formatDate(future));
  } catch (err) {
    // LH청약플러스 정기 점검 등으로 목록 자체를 못 가져오는 경우, LH만 건너뛰고
    // GH·청약홈은 정상적으로 계속 수집되도록 함 (다음 회차에 LH 자동 복구)
    console.error("⚠️ LH 목록 수집 실패, 이번 회차는 LH를 건너뜁니다:", err.message);
    return [];
  }
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

/** 제목에 이런 단어가 포함되면 실제 공고가 아닌 내부 테스트/점검/관리용 데이터로 보고 제외한다. */
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
 * 공고를 화면 데이터에 남길지 판단한다.
 *  - 당첨자 발표일이 있고, 그 발표일로부터 WINNER_TRACK_DAYS일이 안 지났으면 → 유지
 *    (접수는 끝났어도 "당첨자 발표" 페이지에서 조회할 수 있어야 하므로)
 *  - 그 외의 경우, 접수마감일이 이미 지났으면 → 제외 (유예 없음)
 *  - 접수시작일이 UPCOMING_WINDOW_DAYS일보다 더 뒤인 "너무 먼 예정"이면 → 제외
 */
function shouldKeep(notice, now) {
  const start = parseFlexibleDate(notice.apply_start_date);
  const end = parseFlexibleDate(notice.apply_end_date);
  const winner = parseFlexibleDate(notice.winner_date);

  if (winner) {
    const daysSinceWinner = (now.getTime() - winner.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceWinner <= WINNER_TRACK_DAYS) {
      // 당첨자 발표 페이지용으로는 유지하되, "너무 먼 예정" 규칙은 그대로 적용
      if (start && start.getTime() > now.getTime()) {
        const daysUntilStart = (start.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
        if (daysUntilStart > UPCOMING_WINDOW_DAYS) return false;
      }
      return true;
    }
  }

  if (end && end.getTime() < now.getTime()) return false; // 마감된 공고는 바로 제외 (유예 없음)

  if (start && start.getTime() > now.getTime()) {
    const daysUntilStart = (start.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    if (daysUntilStart > UPCOMING_WINDOW_DAYS) return false; // 너무 먼 예정
  }

  return true;
}

async function main() {
  console.log("=== 청약나라 데이터 수집 시작 ===");
  const [lhNotices, ghNotices, reb] = await Promise.all([collectLh(), collectGh(), collectReb()]);
  const combined = [...lhNotices, ...ghNotices, ...reb.notices];

  const noTestNotices = combined.filter((n) => !isTestNotice(n));
  console.log(`테스트/점검/관리용 공고 제외: ${combined.length}건 → ${noTestNotices.length}건`);

  const seen = new Set();
  const deduped = noTestNotices.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });
  console.log(`중복 제거: ${noTestNotices.length}건 → ${deduped.length}건`);

  // GH 등 세대수가 비어있는 공고를 청약홈 데이터로 보완
  const supplemented = fillHouseholdCountFromReb(deduped, reb.rebResults);

  const now = new Date();
  const kept = supplemented.filter((n) => shouldKeep(n, now));
  console.log(
    `마감(당첨자 발표 ${WINNER_TRACK_DAYS}일 이내 제외)·너무 먼 예정(${UPCOMING_WINDOW_DAYS}일 초과) 제외: ` +
      `${supplemented.length}건 → ${kept.length}건`
  );

  kept.sort(
    (a, b) =>
      (parseFlexibleDate(a.apply_end_date)?.getTime() ?? Infinity) -
      (parseFlexibleDate(b.apply_end_date)?.getTime() ?? Infinity)
  );

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify({ generated_at: new Date().toISOString(), count: kept.length, notices: kept }, null, 2)
  );
  console.log(`=== 완료: 총 ${kept.length}건 저장 (${OUTPUT_PATH}) ===`);
}

main().catch((err) => {
  console.error("수집 스크립트 실패:", err);
  process.exit(1);
});
