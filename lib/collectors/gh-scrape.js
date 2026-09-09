// GH(경기주택도시공사) 모집공고 게시판 스크래핑
const cheerio = require("cheerio");

const GH_LIST_URLS = {
  임대주택: "https://apply.gh.or.kr/sb/sr/sr7150/selectPbancRentHouseList.do",
  매입임대: "https://apply.gh.or.kr/sb/sr/sr7155/selectPbancRentHouseList.do",
  임대상가: "https://apply.gh.or.kr/sb/sr/sr7170/selectPbancRentSopsrtList.do",
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

/** 실패 시 재시도하는 페이지 요청 */
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

// (parseGhDate, parseGhListHtml 함수는 기존과 동일하게 유지)

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
        // 이 게시판/페이지만 건너뛰고 나머지는 계속 진행
        console.log(`[디버그] GH ${label} ${page}페이지 최종 실패, 건너뜀: ${err.message}`);
        break; // 해당 게시판의 다음 페이지들은 스킵하고 다음 게시판으로
      }
    }
    console.log(`[디버그] GH 스크래핑 ${label} 게시판 총합: ${boardCount}건`);
  }

  return all;
}

function normalizeGhScraped(row, index) {
  // 기존 코드 그대로 유지
}

module.exports = { fetchGhScrapeAll, normalizeGhScraped };
