// SH(서울주택도시공사) 모집공고 스크래핑 / API 연동
// SH 청약센터는 JSON API 형태의 POST 응답을 제공합니다.

const SH_LIST_URL = "https://www.i-sh.co.kr/app/sh/sub/getAppGuideList.do";

/** YYYYMMDD 또는 YYYY.MM.DD 포맷을 YYYY-MM-DD 표준 규격으로 변환 */
function parseShDate(str) {
  if (!str) return null;
  const digits = String(str).replace(/[^0-9]/g, "");
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return null;
}

/** SH 청약센터 목록 API 호출 */
async function fetchShListPage(pageIndex = 1, pageSize = 20) {
  const payload = {
    pageIndex: pageIndex,
    recordCountPerPage: pageSize,
    searchNoticeType: "", // 전체 조회
    searchTxt: "",
  };

  const res = await fetch(SH_LIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.i-sh.co.kr/app/index.do",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`SH API 오류: ${res.status}`);
  return res.json();
}

/** SH 전 일정/게시판 공고 수집 */
async function fetchShScrapeAll({ maxPages = 5 } = {}) {
  const allRows = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const data = await fetchShListPage(page, 20);
      const list = data?.resultList || data?.list || [];

      console.log(`[디버그] SH 스크래핑 ${page}페이지: ${list.length}건 수집`);
      if (!list || list.length === 0) break;

      allRows.push(...list);
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error(`[오류] SH 스크래핑 ${page}페이지 실패:`, err.message);
      break;
    }
  }

  console.log(`[디버그] SH 스크래핑 총 ${allRows.length}건 수집 완료`);
  return allRows;
}

/** 앱 표준 공고 규격으로 변환 (Normalize) */
function normalizeShScraped(row, index) {
  const noticeId = row.pbancNo || row.noticeId || row.seq || index;
  
  return {
    id: `sh-scrape-${noticeId}`,
    source_agency: "SH",
    source_notice_id: String(noticeId),
    title: row.pbancNm || row.title || row.noticeTitle,
    notice_type: row.houseTypeNm || row.cateNm || "임대주택",
    region_sido: "서울특별시",
    region_sigungu: row.sigunguNm || null,
    address_detail: null,
    household_count: parseInt(row.totTotHshldCo || row.hshldCo, 10) || null,
    area_range: null,
    supply_kind: null,
    deposit_range: null,
    monthly_rent_range: null,
    price_range: null,
    apply_start_date: parseShDate(row.rceptBgnde || row.applyStartDate),
    apply_end_date: parseShDate(row.rceptEndde || row.applyEndDate),
    announce_date: parseShDate(row.pbancDe || row.announceDate),
    winner_date: parseShDate(row.przwerPznoDe || row.winnerDate),
    move_in_date: null,
    contact_phone: "1600-3456", // SH 대표 콜센터
    contact_address: null,
    contact_note: null,
    etc_note: null,
    status: row.pbancSttusNm || row.statusNm || "진행중",
    special_supply_tags: [],
    detail_url: `https://www.i-sh.co.kr/app/sh/sub/appGuideDetail.do?pbancNo=${noticeId}`,
    attachment_urls: [],
    image_urls: [],
    unit_types: [],
    fetched_at: new Date().toISOString(),
    data_source_type: "scrape",
  };
}

module.exports = { fetchShScrapeAll, normalizeShScraped };
