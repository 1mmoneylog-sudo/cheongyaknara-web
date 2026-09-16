// GH(경기주택도시공사) 모집공고 게시판 스크래핑
const cheerio = require("cheerio");

const GH_LIST_URLS = {
  임대주택: "https://apply.gh.or.kr/sb/sr/sr7150/selectPbancRentHouseList.do",
  매입임대: "https://apply.gh.or.kr/sb/sr/sr7155/selectPbancRentHouseList.do",
  임대상가: "https://apply.gh.or.kr/sb/sr/sr7170/selectPbancRentSopsrtList.do",
};

// ✅ 상세페이지 URL. "임대주택"(sr7150)만 실제로 확인된 방식이고,
//    나머지 두 게시판은 같은 패턴일 것으로 추정만 한 상태 (미확인).
//    확인이 안 맞으면 fetchGhDetail 안의 경고 로그에 걸려서 콘솔에 남게 됨.
const GH_DETAIL_URLS = {
  임대주택: "https://apply.gh.or.kr/sb/sr/sr7150/selectPbancDetailView.do",
  매입임대: "https://apply.gh.or.kr/sb/sr/sr7155/selectPbancDetailView.do",
  임대상가: "https://apply.gh.or.kr/sb/sr/sr7170/selectPbancDetailView.do",
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 15000;

/** 타임아웃 걸린 fetch */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 실패 시 재시도하는 페이지 요청 (목록용) */
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

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Referer: "https://apply.gh.or.kr/",
          },
          body: body.toString(),
        },
        FETCH_TIMEOUT_MS
      );

      if (!res.ok) throw new Error(`GH 게시판 오류(${url} p${pageIndex}): ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      console.log(
        `[디버그] GH 요청 실패 (${url} p${pageIndex}, 시도 ${attempt}/${MAX_RETRIES}): ${err.message}`
      );
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw lastError;
}

/** 다양한 날짜 수집 문자열에서 YYYY-MM-DD 표준 날짜만 추출하는 헬퍼 */
function parseGhDate(str) {
  if (!str) return null;
  const cleaned = str.replace(/\./g, "-");
  const match = cleaned.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

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

    if (tds.length <= 1 || $(el).find("td.no_data").length > 0) return;

    const titleLink = $(el).find("a[data-pbancno], a[href*='pbancNo']").first();
    const pbancNo = titleLink.attr("data-pbancno") || titleLink.attr("href")?.match(/pbancNo=([^&]+)/)?.[1];
    const bizTyNm = titleLink.attr("data-biztynm");
    const title = titleLink.text().trim() || $(tds[1]).text().trim();

    if (!pbancNo || !title) return;

    const tdTexts = tds.map((_, td) => $(td).text().trim()).get();

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

/** GH 상세페이지 HTML에서 주소·이미지·첨부파일을 뽑아낸다 */
function parseGhDetailHtml(html) {
  const $ = cheerio.load(html);

  // 첨부파일 (공고문 PDF/HWP)
  const attachment_urls = [];
  $("th:contains('공고문')").each((_, th) => {
    const $td = $(th).next("td");
    $td.find("a").each((__, a) => {
      const $a = $(a);
      const href = $a.attr("href");
      const rawText = $a.clone().find("img").remove().end().text().replace(/\s+/g, " ").trim();
      if (href) attachment_urls.push({ url: href, name: rawText });
    });
  });

  // 공급정보 표: 소재지 / 전용면적 / 모집호수
  let address_detail = null;
  let area_range = null;
  let household_count = null;

  $("table").each((_, table) => {
    const $table = $(table);
    const caption = $table.find("caption").text();
    if (!caption.includes("공급정보")) return;

    $table.find("tbody tr").each((__, tr) => {
      const $tr = $(tr);
      const ths = $tr.find("th");
      const tds = $tr.find("td");
      ths.each((i, th) => {
        const label = $(th).text().trim();
        const value = $(tds[i]).text().replace(/\s+/g, " ").trim();
        if (label === "소재지") address_detail = value || null;
        if (label.startsWith("전용면적")) area_range = value || null;
        if (label === "모집호수") {
          const n = parseInt(value, 10);
          household_count = Number.isFinite(n) ? n : null;
        }
      });
    });
  });

  // 단지 관련 이미지 (조감도/단지배치도/평면도 탭)
  const labels = [];
  $(".ltab_box li button").each((_, btn) => {
    labels.push($(btn).text().trim());
  });
  const image_urls = [];
  $(".ltab_content > div img").each((i, img) => {
    const src = $(img).attr("src");
    if (src) image_urls.push({ url: src, label: labels[i] || `이미지${i + 1}` });
  });

  return { address_detail, area_range, household_count, attachment_urls, image_urls };
}

/** 공고 하나의 상세페이지를 방문해서 주소·이미지·첨부파일을 가져온다 */
async function fetchGhDetail(pbancNo, sourceLabel) {
  const detailUrl = GH_DETAIL_URLS[sourceLabel] || GH_DETAIL_URLS["임대주택"];
  const url = `${detailUrl}?pbancNo=${encodeURIComponent(pbancNo)}`;

  const res = await fetchWithTimeout(
    url,
    {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://apply.gh.or.kr/",
      },
    },
    FETCH_TIMEOUT_MS
  );

  if (!res.ok) throw new Error(`GH 상세 오류(pbancNo=${pbancNo}): ${res.status}`);
  const html = await res.text();

  // ⚠️ 확인용 로그: 응답이 진짜 상세페이지가 맞는지 확인하는 안전장치.
  // "청약공고 상세정보"라는 글자가 없으면 URL/파라미터가 이 게시판엔 안 맞는다는 뜻.
  if (!html.includes("청약공고 상세정보")) {
    console.warn(
      `[디버그] GH 상세페이지가 예상과 다름 (${sourceLabel}, pbancNo=${pbancNo}). ` +
        `응답 앞부분: ${html.slice(0, 200)}`
    );
    return null;
  }

  return parseGhDetailHtml(html);
}

async function fetchGhScrapeAll({ maxPagesPerBoard = 5 } = {}) {
  const all = [];

  for (const [label, url] of Object.entries(GH_LIST_URLS)) {
    let boardCount = 0;
    for (let page = 1; page <= maxPagesPerBoard; page++) {
      try {
        const html = await fetchGhListPage(url, page);
        const rows = parseGhListHtml(html, label);
        console.log(`[디버그] GH 스크래핑 ${label} ${page}페이지: ${rows.length}건`);

        if (rows.length === 0) break;
        all.push(...rows);
        boardCount += rows.length;
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.log(`[디버그] GH ${label} ${page}페이지 최종 실패, 건너뜀: ${err.message}`);
        break;
      }
    }
    console.log(`[디버그] GH 스크래핑 ${label} 게시판 총합: ${boardCount}건`);
  }

  // ✅ 여기서부터 추가: 목록을 다 모은 뒤, 공고 하나하나마다 상세페이지를 방문해서
  //    주소·이미지·첨부파일을 채워넣는다. (SH 스크래퍼와 같은 방식)
  console.log(`[디버그] GH 상세정보 수집 시작 (총 ${all.length}건)`);
  let detailSuccessCount = 0;
  for (const row of all) {
    try {
      const detail = await fetchGhDetail(row.pbancNo, row.source);
      if (detail) {
        Object.assign(row, detail);
        detailSuccessCount++;
      }
    } catch (err) {
      console.log(`[디버그] GH 상세 수집 실패 (pbancNo=${row.pbancNo}): ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 200)); // 서버 부담을 줄이기 위한 대기
  }
  console.log(`[디버그] GH 상세정보 수집 완료: ${detailSuccessCount}/${all.length}건 성공`);

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
    address_detail: row.address_detail ?? null,
    household_count: row.household_count ?? null,
    area_range: row.area_range ?? null,
    supply_kind: null,
    deposit_range: null,
    monthly_rent_range: null,
    price_range: null,
    apply_start_date: null,
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
    attachment_urls: row.attachment_urls ?? [],
    image_urls: row.image_urls ?? [],
    unit_types: [],
    fetched_at: new Date().toISOString(),
    data_source_type: "scrape",
  };
}

module.exports = { fetchGhScrapeAll, normalizeGhScraped };
