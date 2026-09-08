const cheerio = require("cheerio");

const SH_NOTICE_URL = "https://www.i-sh.co.kr/main/lay2/program/S1T294C297/www/brd/m_241/list.do";
// 상세페이지는 목록과 같은 폴더 안의 view.do 로, seq 값을 POST로 넘겨서 접근한다.
const SH_DETAIL_URL = "https://www.i-sh.co.kr/main/lay2/program/S1T294C297/www/brd/m_241/view.do";

async function fetchShScrapeAll() {
  console.log("[SH Log] 스크래핑 시작...");
  try {
    const response = await fetch(SH_NOTICE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.i-sh.co.kr/"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP 오류 발생! Status: ${response.status}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
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
    console.log(`[SH Log] 목록 수집 완료: ${shNotices.length}건`);

    // 2차: 상세페이지를 하나씩 열어서 접수기간/세대수/당첨자발표를 문장에서 뽑아온다.
    for (const notice of shNotices) {
      try {
        const detail = await fetchShDetail(notice.seq);
        Object.assign(notice, detail);
      } catch (err) {
        console.error(`[SH Log] 상세 수집 실패 (seq=${notice.seq}):`, err.message);
      }
      await new Promise((r) => setTimeout(r, 200)); // 서버 부담 줄이기
    }
    console.log(`[SH Log] 상세 수집까지 완료: ${shNotices.length}건`);

    return shNotices;
  } catch (error) {
    console.error(`[SH Log] 수집 실패: ${error.message}`);
    return [];
  }
}

/** 상세페이지 본문에서 접수기간/세대수/당첨자발표를 정규식으로 추출한다.
 *  공고마다 문구가 조금씩 달라서 못 찾는 항목은 null로 남는다. */
async function fetchShDetail(seq) {
  const body = new URLSearchParams({
    page: "1",
    srchFr: "",
    srchTo: "",
    srchWord: "",
    srchTp: "",
    itm_seq_1: "",
    itm_seq_2: "0",
    multi_itm_seq: "2",
    multi_itm_seqs: "",
    seq: String(seq),
  });
  const res = await fetch(SH_DETAIL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`상세 HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // 본문(.cont) 텍스트를 한 줄로 펴서 정규식이 걸리기 쉽게 만듦
  const contText = $("td.cont").text().replace(/\s+/g, " ").trim();

  // 세대수: "공급호수: 총 496세대" / "공급세대수 120세대" 등
  const householdMatch = contText.match(/(?:공급호수|공급세대수|모집세대수)\s*[:：]?\s*(?:총\s*)?([\d,]+)\s*세대/);
  const household_count = householdMatch ? parseInt(householdMatch[1].replace(/,/g, ""), 10) : null;

  // 접수기간: "2026. 9. 7.(월) 10:00 ~ 2026. 9. 9.(수) 17:00" 형태
  const dateRangeMatch = contText.match(
    /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\([^)]*\)\s*\d{1,2}:\d{2}\s*~\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\([^)]*\)\s*\d{1,2}:\d{2}/
  );
  let apply_start_date = null;
  let apply_end_date = null;
  if (dateRangeMatch) {
    apply_start_date = `${dateRangeMatch[1]}-${dateRangeMatch[2].padStart(2, "0")}-${dateRangeMatch[3].padStart(2, "0")}`;
    apply_end_date = `${dateRangeMatch[4]}-${dateRangeMatch[5].padStart(2, "0")}-${dateRangeMatch[6].padStart(2, "0")}`;
  }

  // 당첨자 발표: "당첨자 발표: 2027. 1. 22.(금) 17:00 이후"
  const winnerMatch = contText.match(/당첨자\s*발표\s*[:：]?\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
  const winner_date = winnerMatch
    ? `${winnerMatch[1]}-${winnerMatch[2].padStart(2, "0")}-${winnerMatch[3].padStart(2, "0")}`
    : null;

  return { household_count, apply_start_date, apply_end_date, winner_date };
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
    household_count: row.household_count ?? null,
    area_range: null,
    supply_kind: row.title.includes("분양") ? "분양" : "임대",
    deposit_range: null,
    monthly_rent_range: null,
    price_range: null,
    apply_start_date: row.apply_start_date ?? row.announceDate,
    apply_end_date: row.apply_end_date ?? row.announceDate,
    announce_date: row.announceDate,
    winner_date: row.winner_date ?? null,
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
