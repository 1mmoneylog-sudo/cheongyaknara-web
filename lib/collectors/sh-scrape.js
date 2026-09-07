const cheerio = require("cheerio");

// SH공사 분양/임대 공고 목록 요청 URL (파라미터 포함)
const SH_NOTICE_URL = "https://www.i-sh.co.kr/main/lay2/program/S1T294C297/www/brd/m_241/list.do?srchTp=3&cpage=1";

async function fetchShScrapeAll() {
  console.log("[SH Log] 스크래핑 시작...");
  try {
    const response = await fetch(SH_NOTICE_URL, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Referer": "https://www.i-sh.co.kr/main/lay2/program/S1T294C297/www/brd/m_241/list.do"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP 오류 발생! Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const shNotices = [];

    // 공고 테이블 행 추출 (보통 tbody tr 또는 게시판 tr 구조)
    $("table tr").each((index, element) => {
      const $row = $(element);
      const $a = $row.find("a").first();
      const title = $a.text().trim();

      // 유효하지 않은 제목 스킵
      if (!title || title.includes("등록된 게시물") || title.length < 3) return;

      const onclickAttr = $a.attr("onclick") || "";
      const hrefAttr = $a.attr("href") || "";
      
      // seq 번호 정확하게 파싱 (fn_goView('1234') 또는 seq=1234 대응)
      const seqMatch = (onclickAttr + hrefAttr).match(/(?:seq=|goView\(['"]?|\b)(\d{4,10})/);
      const seq = seqMatch ? seqMatch[1] : null;

      if (!seq) return; // seq 없으면 상세페이지 연결 불가능하므로 패스

      // 날짜 추출 (YYYY-MM-DD 또는 YYYY.MM.DD)
      let rawDate = "";
      $row.find("td").each((_, td) => {
        const text = $(td).text().trim();
        const dateMatch = text.match(/\d{4}[.-]\d{2}[.-]\d{2}/);
        if (dateMatch) rawDate = dateMatch[0].replace(/\./g, "-");
      });

      const announceDate = rawDate || new Date().toISOString().slice(0, 10);

      shNotices.push({
        seq,
        title,
        announceDate,
        detailUrl: `https://www.i-sh.co.kr/main/lay2/program/S1T294C297/www/brd/m_241/view.do?seq=${seq}`
      });
    });

    console.log(`[SH Log] 수집 완료: ${shNotices.length}건`);
    return shNotices;
  } catch (error) {
    console.error(`[SH Log] 수집 실패: ${error.message}`);
    return [];
  }
}

function normalizeShScraped(row, index) {
  const formattedTitle = row.title.startsWith("[SH]") ? row.title : `[SH] ${row.title}`;
  
  // 공급 유형 정밀 판별 (미리내집, 장기전세 추가)
  let supplyKind = "임대";
  if (row.title.includes("미리내집")) supplyKind = "장기전세II(미리내집)";
  else if (row.title.includes("장기전세")) supplyKind = "장기전세";
  else if (row.title.includes("분양")) supplyKind = "분양";

  return {
    id: `sh-scrape-${row.seq || index}`,
    source_agency: "SH",
    source_notice_id: String(row.seq || index),
    title: formattedTitle,
    notice_type: supplyKind,
    region_sido: "서울특별시",
    region_sigungu: "전체",
    address_detail: null,
    household_count: null,
    area_range: null,
    supply_kind: supplyKind,
    deposit_range: null,
    monthly_rent_range: null,
    price_range: null,
    apply_start_date: row.announceDate,
    apply_end_date: row.announceDate,
    announce_date: row.announceDate,
    winner_date: null,
    move_in_date: null,
    contact_phone: "1600-3456",
    contact_address: null,
    contact_note: null,
    etc_note: null,
    status: "진행중",
    special_supply_tags: row.title.includes("신혼부부") ? ["신혼부부"] : [],
    detail_url: row.detailUrl,
    attachment_urls: [],
    image_urls: [],
    unit_types: [],
    fetched_at: new Date().toISOString(),
    data_source_type: "scrape"
  };
}

module.exports = { fetchShScrapeAll, normalizeShScraped };
