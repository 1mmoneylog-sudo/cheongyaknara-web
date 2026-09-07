// GH(경기주택도시공사) 모집공고 게시판 스크래핑
const cheerio = require("cheerio");

const GH_LIST_URLS = {
  임대주택: "https://apply.gh.or.kr/sb/sr/sr7150/selectPbancRentHouseList.do",
  매입임대: "https://apply.gh.or.kr/sb/sr/sr7155/selectPbancRentHouseList.do",
  임대상가: "https://apply.gh.or.kr/sb/sr/sr7170/selectPbancRentSopsrtList.do",
};

async function fetchGhListPage(url, pageIndex) {
  const body = new URLSearchParams({
    searchArea: "",
    searchCate: "",
    searchState: "",
    searchTitle: "",
    previewYn: "",
    pbancNo: "",
    pbancKndCd: "",
    bizTyNm: "",
    pageIndex: String(pageIndex),
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`GH 게시판 오류(${url} p${pageIndex}): ${res.status}`);
  return res.text();
}

/** 다양한 날짜 수집 문자열에서 YYYY-MM-DD 표준 날짜만 추출하는 헬퍼 */
function parseGhDate(str) {
  if (!str) return null;
  // 문자열 내 연속된 8자리 숫자나 YYYY-MM-DD / YYYY.MM.DD 패턴 탐색
  const cleaned = str.replace(/\./g, "-");
  const match = cleaned.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  
  // 물결표(~) 등으로 범위가 입력된 경우 마지막 날짜(마감일) 추출
  const dates = cleaned.match(/\d{4}-\d{2}-\d{2}/g);
  if (dates && dates.length > 0) return dates[dates.length - 1];

  return null;
}

function parseGhListHtml(html, sourceLabel) {
  const $ = cheerio.load(html);
  const rows = [];

  const tableFound = $("table").length;
  const trs = $("table tbody tr");
  console.log(`[디버그] ${sourceLabel} 파싱: table 발견=${tableFound}개, tr=${trs.length}개`);

  trs.each((_, el) => {
    const tds = $(el).find("td");
    
    // 데이터 없는 빈 행 안내 메시지 예외 처리
    if (tds.length <= 1 || $(el).find("td.no_data").length > 0) return;

    // a 태그 속성 및 텍스트 추출 (게시판 컬럼 위치 유연하게 탐색)
    const titleLink = $(el).find("a[data-pbancno], a[href*='pbancNo']").first();
    const pbancNo = titleLink.attr("data-pbancno") || titleLink.attr("href")?.match(/pbancNo=([^&]+)/)?.[1];
    const bizTyNm = titleLink.attr("data-biztynm");
    const title = titleLink.text().trim() || $(tds[1]).text().trim();

    if (!pbancNo || !title) return;

    // td 셀 텍스트 목록 수집
    const tdTexts = tds.map((_, td) => $(td).text().trim()).get();

    // 모집 기간 및 공고일자 추출 (보통 뒤쪽 컬럼에 위치)
    let announceDate = null;
    let endDateRaw = null;
    let statusRaw = null;

    tdTexts.forEach((txt) => {
      if (txt.includes("접수") || txt.includes("마감") || txt.includes("공고")) {
        statusRaw = txt;
      } else if (txt.match(/\d{4}[.-]\d{2}[.-]\d{2}/)) {
        if (!announceDate) announceDate = txt;
        else endDateRaw = txt;
      }
    });

    rows.push({
      source: sourceLabel,
      pbancNo,
      bizTyNm: bizTyNm || sourceLabel,
      title,
      region: tdTexts[2] || null,
      announceDate: parseGhDate(announceDate || tdTexts[4]),
      endDate: parseGhDate(endDateRaw || tdTexts[5]),
      status: statusRaw || "진행중",
    });
  });

  return rows;
}

async function fetchGhScrapeAll({ maxPagesPerBoard = 5 } = {}) {
  const all = [];

  for (const [label, url] of Object.entries(GH_LIST_URLS)) {
    let boardCount = 0;
    for (let page = 1; page <= maxPagesPerBoard; page++) {
      const html = await fetchGhListPage(url, page);
      const rows = parseGhListHtml(html, label);
      console.log(`[디버그] GH 스크래핑 ${label} ${page}페이지: ${rows.length}건`);
      
      if (rows.length === 0) break;
      all.push(...rows);
      boardCount += rows.length;
      await new Promise((r) => setTimeout(r, 300));
    }
    console.log(`[디버그] GH 스크래핑 ${label} 게시판 총합: ${boardCount}건`);
  }

  return all;
}

function normalizeGhScraped(row, index) {
  return {
    id: `gh-scrape-${row.pbancNo}-${index}`,
    source_agency: "GH",
    source_notice_id: String(row.pbancNo),
    title: row.title,
    notice_type: row.bizTyNm,
    region_sido: "경기도",
    region_sigungu: row.region || null,
    address_detail: null,
    household_count: null,
    area_range: null,
    supply_kind: null,
    deposit_range: null,
    monthly_rent_range: null,
    price_range: null,
    apply_start_date: null,
    // ✅ 마감일/공고일자를 표준 YYYY-MM-DD 규격으로 정규화
    apply_end_date: row.endDate,
    announce_date: row.announceDate,
    winner_date: null,
    move_in_date: null,
    contact_phone: null,
    contact_address: null,
    contact_note: null,
    etc_note: null,
    status: row.status,
    special_supply_tags: [],
    detail_url: GH_LIST_URLS[row.source] || GH_LIST_URLS["임대주택"],
    attachment_urls: [],
    image_urls: [],
    unit_types: [],
    fetched_at: new Date().toISOString(),
    data_source_type: "scrape",
  };
}

module.exports = { fetchGhScrapeAll, normalizeGhScraped };
