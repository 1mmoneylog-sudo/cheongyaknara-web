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
// ✅ 2026-09-07: SH 공고 웹 스크래핑 수집 모듈(collectShScrape) 추가 통합
// ✅ 2026-09-08: SH 장기전세/미리내집 날짜 파싱 예외 처리 보완 (수집 누락 방지)

const fs = require("fs");
const path = require("path");
const { fetchLhList, fetchLhDetail, fetchLhSupply, normalizeLhNotice } = require("../lib/collectors/lh");
const { fetchGhAll, normalizeGhNotice } = require("../lib/collectors/gh");
const { fetchRebAll, normalizeAllRebNotices, fillHouseholdCountFromReb } = require("../lib/collectors/reb");
const { fetchGhScrapeAll, normalizeGhScraped } = require("../lib/collectors/gh-scrape");
const { fetchShScrapeAll, normalizeShScraped } = require("../lib/collectors/sh-scrape");

const OUTPUT_PATH = path.join(__dirname, "..", "data", "notices.json");

const WINNER_TRACK_DAYS = 14;
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

async function collectGhScrape() {
  try {
    const rows = await fetchGhScrapeAll({ maxPagesPerBoard: 5 });
    console.log(`GH 스크래핑: ${rows.length}건`);
    return rows.map((row, i) => normalizeGhScraped(row, i));
  } catch (err) {
    console.error("GH 스크래핑 실패:", err.message);
    return [];
  }
}

async function collectShScrape() {
  try {
    const rows = await fetchShScrapeAll();
    console.log(`SH 스크래핑: ${rows.length}건`);
    return rows.map((row, i) => normalizeShScraped(row, i));
  } catch (err) {
    console.error("SH 스크래핑 실패:", err.message);
    return [];
  }
}

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
const TEST_TITLE_PATTERN = /테스트|점검용|오픈테스트|시스템\s*점검|데이터\s*관리|\d{4}년.*데이터|인턴|설문조사|안전점검|행사\s*안내/;

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
 */
function shouldKeep(notice, now) {
  const title = notice.title || "";
  
  // 💡 SH 장기전세/미리내집 및 SH 관련 주요 공고 예외 승인
  // 스크래핑 특성상 날짜 파싱이 일시적으로 누락되더라도 핵심 청약 공고는 버리지 않고 남김
  const isSHCoreNotice = notice.source_agency === "SH" || 
                         title.includes("장기전세") || 
                         title.includes("미리내집");

  const start = parseFlexibleDate(notice.apply_start_date);
  const end = parseFlexibleDate(notice.apply_end_date);
  const winner = parseFlexibleDate(notice.winner_date);

  // SH 주요 공고이고 시작/마감 날짜가 누락된 경우 필터링 통과
  if (isSHCoreNotice && !start && !end) {
    return true;
  }

  if (winner) {
    const daysSinceWinner = (now.getTime() - winner.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceWinner <= WINNER_TRACK_DAYS) {
      if (start && start.getTime() > now.getTime()) {
        const daysUntilStart = (start.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
        if (daysUntilStart > UPCOMING_WINDOW_DAYS) return false;
      }
      return true;
    }
  }

  if (end && end.getTime() < now.getTime()) return false;

  if (start && start.getTime() > now.getTime()) {
    const daysUntilStart = (start.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    if (daysUntilStart > UPCOMING_WINDOW_DAYS) return false;
  }

  return true;
}

async function main() {
  console.log("=== 청약나라 데이터 수집 시작 ===");
  const [lhNotices, ghNotices, reb, ghScrapedNotices, shScrapedNotices] = await Promise.all([
    collectLh(),
    collectGh(),
    collectReb(),
    collectGhScrape(),
    collectShScrape(),
  ]);
  
  const combined = [
    ...lhNotices, 
    ...ghNotices, 
    ...reb.notices, 
    ...ghScrapedNotices, 
    ...shScrapedNotices
  ];

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

  // 🔍 임시 디버그: SH로 재분류된 공고 확인
  const shBeforeFilter = supplemented.filter((n) => n.source_agency === "SH" || (n.title && n.title.includes("미리내집")));
  console.log(
    `[디버그] 마감 필터 적용 전 SH/미리내집 공고 ${shBeforeFilter.length}건:`,
    JSON.stringify(
      shBeforeFilter.map((n) => ({
        title: n.title,
        apply_start_date: n.apply_start_date,
        apply_end_date: n.apply_end_date,
        winner_date: n.winner_date,
      })),
      null,
      2
    )
  );

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
