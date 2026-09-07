// GH(경기주택도시공사) 모집공고 게시판 스크래핑
// GH 오픈API(gh.js)는 데이터가 낡아서, 실제 서비스용 최신 데이터는 이 스크래퍼가 담당한다.
// 목록 페이지는 POST 방식으로 pageIndex를 넘겨야 페이지 이동이 된다.

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

function parseGhListHtml(html, sourceLabel) {
  const $ = cheerio.load(html);
  const rows = [];

  $("table.board_tbl tbody tr").each((_, el) => {
    const tds = $(el).find("td");
    if (tds.length < 10) return; // 형식이 다른 행은 건너뜀

    const titleLink = $(tds[2]).find("a");
    const pbancNo = titleLink.attr("data-pbancno");
    const bizTyNm = titleLink.attr("data-biztynm");
    const title = titleLink.text().trim();
    if (!pbancNo || !title) return;

    const type = $(tds[1]).text().trim();
    const region = $(tds[3]).text().trim();
    const announceDate = $(tds[5]).text().trim();
    const endDateRaw = $(tds[6]).text().trim();
    const statusRaw = $(tds[7]).text().trim();

    rows.push({
      source: sourceLabel,
      pbancNo,
      bizTyNm: bizTyNm || type,
      title,
      region,
      announceDate,
      endDate: endDateRaw === "-" ? null : endDateRaw,
      status: statusRaw === "-" ? null : statusRaw,
    });
  });

  return rows;
}

async function fetchGhScrapeAll({ maxPagesPerBoard = 5 } = {}) {
  const all = [];

  for (const [label, url] of Object.entries(GH_LIST_URLS)) {
    for (let page = 1; page <= maxPagesPerBoard; page++) {
      const html = await fetchGhListPage(url, page);
      const rows = parseGhListHtml(html, label);
      if (rows.length === 0) break; // 더 이상 데이터 없으면 그 게시판은 중단
      all.push(...rows);
      await new Promise((r) => setTimeout(r, 300)); // 서버 부담 줄이기용 딜레이
    }
  }

  return all;
}

function parseGhDate(str) {
  if (!str) return null;
  return str.replace(/-/g, "."); // "2026-08-24" -> "2026.08.24"
}

function normalizeGhScraped(row, index) {
  return {
    id: `gh-scrape-${row.pbancNo}-${index}`,
    source_agency: "GH",
    source_notice_id: row.pbancNo,
    title: row.title,
    notice_type: row.bizTyNm,
    region_sido: null,
    region_sigungu: row.region || null,
    address_detail: null,
    household_count: null,
    area_range: null,
    supply_kind: null,
    deposit_range: null,
    monthly_rent_range: null,
    price_range: null,
    apply_start_date: null, // 목록엔 접수시작일이 없어서 비워둠
    apply_end_date: parseGhDate(row.endDate),
    announce_date: parseGhDate(row.announceDate),
    winner_date: null,
    move_in_date: null,
    contact_phone: null,
    contact_address: null,
    contact_note: null,
    etc_note: null,
    status: row.status,
    special_supply_tags: [],
    detail_url: "https://apply.gh.or.kr/sb/sr/sr7150/selectPbancRentHouseList.do",
    attachment_urls: [],
    image_urls: [],
    unit_types: [],
    fetched_at: new Date().toISOString(),
    data_source_type: "scrape",
  };
}

module.exports = { fetchGhScrapeAll, normalizeGhScraped };
