const axios = require("axios");
const cheerio = require("cheerio");

const SH_NOTICE_URL = "https://www.i-sh.co.kr/main/lay2/program/S1T294C297/www/brd/m_241/list.do";

async function fetchShScrapeAll() {
  console.log("[SH Log] 스크래핑 시작...");
  try {
    const response = await axios.get(SH_NOTICE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.i-sh.co.kr/"
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const shNotices = [];

    $("tr").each((index, element) => {
      const $row = $(element);
      const $a = $row.find("a").first();
      const title = $a.text().trim();

      if (!title || title.includes("등록된 게시물") || title.length < 3) return;

      const onclickAttr = $a.attr("onclick") || "";
      const hrefAttr = $a.attr("href") || "";
      const seqMatch = (onclickAttr + hrefAttr).match(/\d+/);
      const seq = seqMatch ? seqMatch[0] : `${Date.now()}-${index}`;

      let rawDate = "";
      $row.find("td").each((_, td) => {
        const text = $(td).text().trim().replace(/[^0-9]/g, "");
        if (text.length === 8 && text.startsWith("20")) rawDate = text;
      });

      const announceDate = rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : new Date().toISOString().slice(0, 10);

      shNotices.push({
        seq,
        title,
        announceDate,
        detailUrl: seqMatch
          ? `https://www.i-sh.co.kr/main/lay2/program/S1T294C297/www/brd/m_241/view.do?seq=${seq}`
          : SH_NOTICE_URL
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
  return {
    id: `sh-scrape-${row.seq || index}`,
    source_agency: "SH",
    source_notice_id: String(row.seq || index),
    title: formattedTitle,
    notice_type: "임대/분양",
    region_sido: "서울특별시",
    region_sigungu: "전체",
    address_detail: null,
    household_count: null,
    area_range: null,
    supply_kind: row.title.includes("분양") ? "분양" : "임대",
    deposit_range: null,
    monthly_rent_range: null,
    price_range: null,
    apply_start_date: row.announceDate,
    apply_end_date: row.announceDate,
    announce_date: row.announceDate,
    winner_date: null,
    move_in_date: null,
    contact_phone: null,
    contact_address: null,
    contact_note: null,
    etc_note: null,
    status: "진행중",
    special_supply_tags: [],
    detail_url: row.detailUrl,
    attachment_urls: [],
    image_urls: [],
    unit_types: [],
    fetched_at: new Date().toISOString(),
    data_source_type: "scrape"
  };
}

module.exports = { fetchShScrapeAll, normalizeShScraped };
