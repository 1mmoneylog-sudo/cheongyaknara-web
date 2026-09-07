const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

// SH 서울주택도시공사 주택모집공고 URL
const SH_NOTICE_URL = "https://www.i-sh.co.kr/main/lay2/program/S1T294C297/www/brd/m_241/list.do";

async function fetchSHNotices() {
  console.log("SH 모집공고 수집 시작...");

  try {
    // SH 웹사이트 보안 방화벽 우회를 위한 User-Agent 및 헤더 설정
    const response = await axios.get(SH_NOTICE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: "https://www.i-sh.co.kr/main/index.do",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const shNotices = [];

    // SH 공고 목록 테이블 파싱 (게시판 구조에 맞춰 파싱)
    $("#contents table tbody tr").each((index, element) => {
      const $row = $(element);
      
      // 공고 제목 및 링크 추출
      const $titleEl = $row.find("td.txtL a, td.al a").first();
      const title = $titleEl.text().trim();
      
      if (!title) return; // 제목 없는 라인 통과

      const onclickAttr = $titleEl.attr("onclick") || "";
      const hrefAttr = $titleEl.attr("href") || "";
      
      // 글 번호/ID 추출
      let noticeId = "";
      const match = onclickAttr.match(/\d+/) || hrefAttr.match(/\d+/);
      if (match) {
        noticeId = `sh-${match[0]}`;
      } else {
        noticeId = `sh-${Date.now()}-${index}`;
      }

      // 작성일/공고일 추출
      const dateText = $row.find("td").eq(3).text().trim().replace(/[^0-9]/g, "");
      const announceDate = dateText.length === 8 
        ? `${dateText.slice(0, 4)}-${dateText.slice(4, 6)}-${dateText.slice(6, 8)}`
        : new Date().toISOString().slice(0, 10);

      // 상세페이지 URL 구성
      const detailUrl = noticeId.includes("-") && !isNaN(noticeId.split("-")[1])
        ? `https://www.i-sh.co.kr/main/lay2/program/S1T294C297/www/brd/m_241/view.do?seq=${noticeId.split("-")[1]}`
        : SH_NOTICE_URL;

      // 공급 유형 판별 (임대 vs 분양)
      let supplyKind = "임대";
      if (title.includes("분양") || title.includes("토지")) {
        supplyKind = "분양";
      }

      shNotices.push({
        id: noticeId,
        title: title,
        source_agency: "SH",
        region_sido: "서울",
        region_gugun: "전체",
        supply_kind: supplyKind,
        household_count: 0,
        announce_date: announceDate,
        apply_start_date: announceDate,
        apply_end_date: announceDate, // 상세페이지 파싱으로 연장 가능
        detail_url: detailUrl,
      });
    });

    console.log(`총 ${shNotices.length}개의 SH 공고를 수집했습니다.`);
    return shNotices;

  } catch (error) {
    console.error("SH 공고 수집 실패:", error.message);
    return [];
  }
}

// 기존 data/notices.json 파일 업데이트 함수
async function updateNoticesJson() {
  const filePath = path.join(process.cwd(), "data", "notices.json");
  let existingData = { generated_at: "", notices: [] };

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      existingData = JSON.parse(raw);
    } catch (e) {
      console.error("기존 notices.json 읽기 오류:", e.message);
    }
  }

  const newShNotices = await fetchSHNotices();

  if (newShNotices.length === 0) {
    console.log("수집된 SH 공고가 없어 JSON 업데이트를 취소합니다.");
    return;
  }

  // SH 이외의 기존 공고(LH, GH 등)는 유지하고 SH 공고만 업데이트
  const nonShNotices = existingData.notices.filter((n) => n.source_agency !== "SH");
  const mergedNotices = [...nonShNotices, ...newShNotices];

  const updatedPayload = {
    generated_at: new Date().toISOString(),
    notices: mergedNotices,
  };

  fs.writeFileSync(filePath, JSON.stringify(updatedPayload, null, 2), "utf-8");
  console.log("data/notices.json 파일에 SH 공고가 성공적으로 업데이트되었습니다!");
}

updateNoticesJson();
