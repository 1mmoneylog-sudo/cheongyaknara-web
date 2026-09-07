const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const SH_NOTICE_URL = "https://www.i-sh.co.kr/main/lay2/program/S1T294C297/www/brd/m_241/list.do";

async function fetchSHNotices() {
  console.log("SH 모집공고 수집 시작...");

  try {
    const response = await axios.get(SH_NOTICE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: "https://www.i-sh.co.kr/main/index.do",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const shNotices = [];

    // 게시판 내의 모든 tr 행 파싱
    $("tr").each((index, element) => {
      const $row = $(element);
      const $a = $row.find("a").first();
      const title = $a.text().trim();

      // 제목이 없거나 공지사항 안내문인 경우 제외
      if (!title || title.includes("등록된 게시물") || title.length < 5) return;

      const onclickAttr = $a.attr("onclick") || "";
      const hrefAttr = $a.attr("href") || "";
      const seqMatch = (onclickAttr + hrefAttr).match(/\d+/);
      const seq = seqMatch ? seqMatch[0] : `${Date.now()}-${index}`;

      // 날짜 형태(YYYY-MM-DD 또는 YYYY.MM.DD 또는 YYYYMMDD) 추출
      let rawDate = "";
      $row.find("td").each((_, td) => {
        const text = $(td).text().trim().replace(/[^0-9]/g, "");
        if (text.length === 8 && text.startsWith("20")) {
          rawDate = text;
        }
      });

      const announceDate = rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : new Date().toISOString().slice(0, 10);

      const detailUrl = seqMatch
        ? `https://www.i-sh.co.kr/main/lay2/program/S1T294C297/www/brd/m_241/view.do?seq=${seq}`
        : SH_NOTICE_URL;

      const formattedTitle = title.startsWith("[SH]") ? title : `[SH] ${title}`;

      shNotices.push({
        id: `sh-${seq}`,
        title: formattedTitle,
        source_agency: "SH",
        region_sido: "서울",
        region_gugun: "전체",
        supply_kind: title.includes("분양") ? "분양" : "임대",
        household_count: 0,
        announce_date: announceDate,
        apply_start_date: announceDate,
        apply_end_date: announceDate,
        detail_url: detailUrl,
      });
    });

    // 중복 수집 제거 (id 기준)
    const uniqueNotices = Array.from(
      new Map(shNotices.map((item) => [item.id, item])).values()
    );

    console.log(`총 ${uniqueNotices.length}개의 SH 공고를 수집했습니다.`);
    return uniqueNotices;
  } catch (error) {
    console.error("SH 수집 실패 원인:", error.message);
    return [];
  }
}

async function updateNoticesJson() {
  const filePath = path.join(process.cwd(), "data", "notices.json");
  let existingData = { generated_at: "", notices: [] };

  if (fs.existsSync(filePath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (e) {
      console.error("notices.json 읽기 오류:", e.message);
    }
  }

  const newShNotices = await fetchSHNotices();

  if (newShNotices.length === 0) {
    console.log("수집된 SH 공고가 없어 JSON 업데이트를 취소합니다.");
    return;
  }

  const nonShNotices = (existingData.notices || []).filter(
    (n) => n.source_agency !== "SH"
  );
  const mergedNotices = [...nonShNotices, ...newShNotices];

  const updatedPayload = {
    generated_at: new Date().toISOString(),
    notices: mergedNotices,
  };

  fs.writeFileSync(filePath, JSON.stringify(updatedPayload, null, 2), "utf-8");
  console.log("data/notices.json 파일 업데이트 완려!");
}

updateNoticesJson();
// lib/collectors/sh-scrape.js 상단 로직 동일...

async function fetchShScrapeAll() {
  // SH 공고 가져오는 로직 (기존 함수 내용)
  // ...
  return shNotices; 
}

function normalizeShScraped(row, index) {
  return {
    id: `sh-scrape-${row.seq || index}`,
    source_agency: "SH",
    title: row.title,
    // ... 표준 규격 정규화 객체 반환
  };
}

module.exports = { fetchShScrapeAll, normalizeShScraped };
