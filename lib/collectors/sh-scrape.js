const cheerio = require("cheerio");

// ✅ 수정: main 도메인의 잘못된 게시판(m_241, 공지사항) → app 도메인의 진짜 "주택임대 공고 및 공지" 게시판(m_247)
const SH_NOTICE_URL = "https://www.i-sh.co.kr/app/lay2/program/S48T1581C563/www/brd/m_247/list.do";
const SH_DETAIL_URL = "https://www.i-sh.co.kr/app/lay2/program/S48T1581C563/www/brd/m_247/view.do";

const NON_RECRUIT_PATTERN =
  /설문조사|만족도|서류전형|면접전형|합격자\s*발표|당첨자\s*발표|당첨자\s*및\s*예비자\s*발표|사전방문|입주\s*안내문|수행기관\s*지정|안전점검|인턴|채용/;

function isRecruitNotice(title) {
  return !NON_RECRUIT_PATTERN.test(title);
}

async function fetchShListPage(pageNum) {
  const body = new URLSearchParams({
    page: String(pageNum),
    srchFr: "",
    srchTo: "",
    srchWord: "",
    srchTp: "",
    itm_seq_1: "",
    itm_seq_2: "0",
    multi_itm_seq: "2",
    multi_itm_seqs: "",
    seq: "",
  });
  const res = await fetch(`${SH_NOTICE_URL}?multi_itm_seq=2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Referer": "https://www.i-sh.co.kr/app/index.do",
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`목록 HTTP ${pageNum}페이지: ${res.status}`);
  return res.text();
}

function parseShListHtml(html, pageNum) {
  const $ = cheerio.load(html);
  const rows = [];

  // 🔍 진단 로그: 새 게시판(m_247)에서 테이블 구조가 예상대로 나오는지 확인
  const tableCount = $("table").length;
  const trList = $("table tbody tr");
  console.log(`[SH Log] ${pageNum}페이지: table ${tableCount}개, tbody tr ${trList.length}개`);

  trList.each((index, element) => {
    const $row = $(element);
    const $a = $row.find("a").first();
    const title = $a.text().trim();
    if (!title || title.includes("등록된 게시물") || title.length < 3) return;

    // 🔍 진단 로그: 첫 페이지의 첫 3개 행만 원본 HTML을 찍어서, seq 추출이 맞는 방식인지 확인
    if (pageNum === 1 && index < 3) {
      console.log(`[SH Log] 행[${index}] 원본: ${$row.html()?.slice(0, 500)}`);
    }

    const onclickAttr = $a.attr("onclick") || "";
    const hrefAttr = $a.attr("href") || "";
    const seqMatch = (onclickAttr + hrefAttr).match(/\d{5,}/);
    const seq = seqMatch ? seqMatch[0] : `${Date.now()}-${index}`;

    let rawDate = "";
    $row.find("td").each((_, td) => {
      const text = $(td).text().trim().replace(/[^0-9]/g, "");
      if (text.length === 8 && text.startsWith("20")) rawDate = text;
      else if (/^\d{4}-\d{2}-\d{2}$/.test($(td).text().trim())) {
        rawDate = $(td).text().trim().replace(/-/g, "");
      }
    });
    const announceDate = rawDate.length === 8
      ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
      : new Date().toISOString().slice(0, 10);

    rows.push({
      seq,
      title,
      announceDate,
      detailUrl: `${SH_DETAIL_URL}?seq=${seq}&multi_itm_seq=2`,
    });
  });
  return rows;
}

async function fetchShScrapeAll() {
  console.log("[SH Log] 스크래핑 시작...");
  try {
    const rawNotices = [];
    for (let page = 1; page <= 5; page++) {
      const html = await fetchShListPage(page);
      const rows = parseShListHtml(html, page);
      console.log(`[SH Log] ${page}페이지 파싱 결과: ${rows.length}건`);
      if (rows.length === 0) break;
      rawNotices.push(...rows);
      await new Promise((r) => setTimeout(r, 250));
    }
    console.log(`[SH Log] 목록 수집(필터 전): ${rawNotices.length}건`);

    const shNotices = rawNotices.filter((n) => isRecruitNotice(n.title));
    console.log(`[SH Log] 모집공고만 필터링: ${shNotices.length}건`);

    // ⚠️ 상세페이지 파라미터(seq 방식)가 새 게시판에서도 맞는지 아직 100% 확신 못 함
    // 실패해도 목록 정보는 살리기 위해 개별로 try/catch 처리
    for (const notice of shNotices) {
      try {
        const detail = await fetchShDetail(notice.seq);
        Object.assign(notice, detail);
      } catch (err) {
        console.error(`[SH Log] 상세 수집 실패 (seq=${notice.seq}): ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    console.log(`[SH Log] 상세 수집까지 완료: ${shNotices.length}건`);

    return shNotices;
  } catch (error) {
    console.error(`[SH Log] 수집 실패: ${error.message}`);
    return [];
  }
}

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
      "Referer": "https://www.i-sh.co.kr/app/index.do",
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`상세 HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const contText = $("td.cont").text().replace(/\s+/g, " ").trim();

  // 🔍 진단 로그: 상세페이지 본문이 실제로 뭔가 잡히는지(글자수) 확인
  console.log(`[SH Log] 상세(seq=${seq}) 본문 길이: ${contText.length}`);

  const householdMatch = contText.match(/(?:공급호수|공급세대수|모집세대수)\s*[:：]?\s*(?:총\s*)?([\d,]+)\s*세대/);
  const household_count = householdMatch ? parseInt(householdMatch[1].replace(/,/g, ""), 10) : null;

  const dateRangeMatch = contText.match(
    /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\([^)]*\)\s*\d{1,2}:\d{2}\s*~\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\([^)]*\)\s*\d{1,2}:\d{2}/
  );
  let apply_start_date = null;
  let apply_end_date = null;
  if (dateRangeMatch) {
    apply_start_date = `${dateRangeMatch[1]}-${dateRangeMatch[2].padStart(2, "0")}-${dateRangeMatch[3].padStart(2, "0")}`;
    apply_end_date = `${dateRangeMatch[4]}-${dateRangeMatch[5].padStart(2, "0")}-${dateRangeMatch[6].padStart(2, "0")}`;
  }

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
    apply_start_date: row.apply_start_date ?? null,
    apply_end_date: row.apply_end_date ?? null,
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
    data_source_type: "scrape",
  };
}

module.exports = { fetchShScrapeAll, normalizeShScraped };
