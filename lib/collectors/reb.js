// 한국부동산원 '청약홈' API 연동 (odcloud 방식)
// 승인된 "청약홈 분양정보 조회 서비스" 중 APT 분양정보 상세 데이터를 사용해
// GH(경기주택도시공사) 공고에서 채우지 못한 세대수를 보완합니다.
//
// 왜 이렇게 하는가:
// GH 자체 API는 공고와 세대수 데이터를 "사업코드"로 연결하도록 되어 있는데,
// 실제 공고 데이터에는 이 사업코드가 거의 비어 있어 연결이 안 되는 경우가
// 대부분입니다 (GH 원본 데이터 자체의 한계로 확인됨, 2026-09-02).
// 청약홈은 공고명(주택명)만으로 세대수를 바로 제공하므로, 이걸로 채웁니다.
//
// 참고: 청약홈이 GH의 모든 사업 유형(매입임대, 지역 자체사업 등)을 커버하지는
// 않을 수 있어 "있으면 채우고 없으면 그대로 둔다"는 보완용으로만 씁니다.

const REB_APT_DETAIL_URL =
  "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail";

async function fetchRebJson(url, serviceKey, page = 1, perPage = 1000) {
  const params = new URLSearchParams({ serviceKey, page: String(page), perPage: String(perPage) });
  const res = await fetch(`${url}?${params.toString()}`);
  if (!res.ok) throw new Error(`청약홈 API 오류(${url}): ${res.status}`);
  return res.json();
}

/** 전체 페이지를 순회해서 APT 분양정보 상세 데이터를 모두 가져옴 (최대 20페이지 안전장치) */
async function fetchRebAptAll(serviceKey) {
  const perPage = 1000;
  const first = await fetchRebJson(REB_APT_DETAIL_URL, serviceKey, 1, perPage);
  let rows = first?.data ?? [];
  const totalCount = first?.totalCount ?? rows.length;
  const totalPages = Math.min(Math.ceil(totalCount / perPage), 20);

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchRebJson(REB_APT_DETAIL_URL, serviceKey, page, perPage);
    rows = rows.concat(next?.data ?? []);
  }
  return rows;
}

/** 공고명을 비교하기 쉽게 정리한다 (괄호, 공백, 특수문자 제거) */
function normalizeTitle(str) {
  if (!str) return "";
  return String(str)
    .replace(/[[\]()「」『』【】]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * 청약홈 데이터에서 세대수를 찾아 보완한다.
 * notices: 정규화된 공고 배열 (household_count가 비어있는 것들이 대상)
 * rebRows: fetchRebAptAll()로 가져온 청약홈 원본 데이터
 * 반환값: 보완된 notices 배열 (원본을 직접 수정함)
 */
function fillHouseholdCountFromReb(notices, rebRows) {
  const rebByTitle = new Map();
  for (const row of rebRows) {
    const key = normalizeTitle(row.HOUSE_NM);
    if (!key) continue;
    const count = parseInt(row.TOT_SUPLY_HSHLDCO, 10);
    if (Number.isFinite(count) && count > 0) {
      rebByTitle.set(key, count);
    }
  }

  let filledCount = 0;
  for (const notice of notices) {
    if (notice.household_count) continue; // 이미 값이 있으면 건너뜀

    const key = normalizeTitle(notice.title);
    let match = rebByTitle.get(key);

    // 정확히 일치하는 게 없으면, 공고명이 청약홈 주택명을 포함하는지도 확인
    // (예: "다산역A2 경기행복주택 입주자 모집" 안에 "다산역A2행복주택"이 포함되는 경우)
    if (!match) {
      for (const [rebKey, count] of rebByTitle) {
        if (rebKey && key.includes(rebKey)) {
          match = count;
          break;
        }
      }
    }

    if (match) {
      notice.household_count = match;
      notice.household_count_source = "reb"; // 어디서 채웠는지 표시 (디버깅용)
      filledCount++;
    }
  }
  console.log(`청약홈으로 세대수 보완: ${filledCount}건`);
  return notices;
}

module.exports = { fetchRebAptAll, fillHouseholdCountFromReb };
