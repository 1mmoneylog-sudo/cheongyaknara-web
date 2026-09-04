// GH(경기주택도시공사) 공공데이터포털 API 연동
// odcloud 자동변환 방식 — 인증키는 쿼리 파라미터 "serviceKey"로 전달
//
// ✅ 확인 완료 (2026-08-28), 4개 API 모두 실제 Swagger 문서로 검증됨:
//   - GH주택청약 모집정보 (15119414, 20250821판) — 공고·일정·접수처
//   - GH주택청약 공급정보 (15119391, 20250821판) — 사업코드별 주택형·면적·세대수
//   - GH주택청약 주택유형정보 (15119422, 20250821판) — 사업코드별 방수·공용면적
//   - 경기주택도시공사_공공주택분양 현황 (15016337, 20260611판) — 위치·수용세대
//
// ⚠️ 2026-09-04 수정: 날짜 필드가 null이 아니라 빈 문자열("")로 오는 경우가 있어
// 기존 "??" 연산자가 이를 걸러내지 못했음. pick() 헬퍼로 교체하여 해결.
//
// ⚠️ 2026-09-04 (2차) 추가: 날짜 필드가 실제로 어떤 형식(YYYYMMDD/YYYY-MM-DD 등)으로
// 오는지 확인하기 위한 임시 디버그 로그 추가.

const GH_NOTICE_URL =
  "https://api.odcloud.kr/api/15119414/v1/uddi:d22eef31-f232-464a-9547-dbff71668860";
const GH_SUPPLY_URL =
  "https://api.odcloud.kr/api/15119391/v1/uddi:bf1ffc81-75a7-45c2-9136-d0ad5b88b90c";
const GH_HOUSING_TYPE_URL =
  "https://api.odcloud.kr/api/15119422/v1/uddi:065d05e1-efbd-47c1-9e2f-9ebe1fd33e0b";
const GH_PROJECT_STATUS_URL =
  "https://api.odcloud.kr/api/15016337/v1/uddi:e7f2c4ef-0bbe-4118-935c-d23c1204837f";

const DEBUG_HOUSEHOLD_COUNT = true;

/** 값이 null/undefined/빈 문자열이면 다음 후보로 넘어감. 기존 "??"는 빈 문자열을 걸러내지 못해서 새로 추가함 */
function pick(...values) {
  for (const v of values) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return null;
}

async function fetchGhJson(url, serviceKey, page = 1, perPage = 300) {
  const params = new URLSearchParams({ serviceKey, page: String(page), perPage: String(perPage) });
  const res = await fetch(`${url}?${params.toString()}`);
  if (!res.ok) throw new Error(`GH API 오류(${url}): ${res.status}`);
  return res.json();
}

async function fetchGhJsonAll(url, serviceKey) {
  const perPage = 300;
  const first = await fetchGhJson(url, serviceKey, 1, perPage);
  let rows = first?.data ?? [];
  const totalCount = first?.totalCount ?? rows.length;
  const totalPages = Math.min(Math.ceil(totalCount / perPage), 20);

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchGhJson(url, serviceKey, page, perPage);
    rows = rows.concat(next?.data ?? []);
  }
  return rows;
}

async function fetchGhAll(serviceKey) {
  const [notices, supplies, housingTypes, projects] = await Promise.all([
    fetchGhJsonAll(GH_NOTICE_URL, serviceKey),
    fetchGhJson(GH_SUPPLY_URL, serviceKey, 1, 500).then((r) => r?.data ?? []),
    fetchGhJson(GH_HOUSING_TYPE_URL, serviceKey, 1, 500).then((r) => r?.data ?? []),
    fetchGhJson(GH_PROJECT_STATUS_URL, serviceKey, 1, 500).then((r) => r?.data ?? []),
  ]);

  if (notices[0]) console.log("[필드명 확인] 모집정보 필드들:", Object.keys(notices[0]));

  // 🔍 임시 디버그: 날짜 필드의 실제 형식(YYYYMMDD인지 YYYY-MM-DD인지 등) 확인용.
  // 원인 파악 후에는 이 블록을 지워도 된다.
  if (notices.length > 0) {
    const sample = notices.slice(0, 5).map((n) => ({
      공고번호: n["공고번호"],
      공고명: n["공고명"],
      접수시작일자: n["접수시작일자"],
      접수종료일자: n["접수종료일자"],
      서류접수시작일자: n["서류접수시작일자"],
      서류접수종료일자: n["서류접수종료일자"],
    }));
    console.log("[날짜값 확인] GH 공고 샘플 5건:", JSON.stringify(sample, null, 2));
  }

  if (supplies[0]) console.log("[필드명 확인] 공급정보 필드들:", Object.keys(supplies[0]));
  if (housingTypes[0]) console.log("[필드명 확인] 주택유형정보 필드들:", Object.keys(housingTypes[0]));
  if (projects[0]) console.log("[필드명 확인] 분양현황 필드들:", Object.keys(projects[0]));

  return { notices, supplies, housingTypes, projects };
}

function normalizeGhNotice(notice, supplies, housingTypes, projects) {
  const bizCode = notice["사업코드"];
  const matchedSupplies = (supplies ?? []).filter(
    (s) => bizCode && String(s["사업코드"]) === String(bizCode)
  );
  const matchedHousingTypes = (housingTypes ?? []).filter(
    (h) => bizCode && String(h["사업코드"]) === String(bizCode)
  );
  const matchedProject = (projects ?? []).find(
    (p) => p["사업명"] && notice["공고명"] && notice["공고명"].includes(p["사업명"])
  );

  const areaList = matchedSupplies.map((s) => s["전용면적내용"]).filter(Boolean);
  const householdFromSupply = matchedSupplies.reduce(
    (sum, s) => sum + (parseInt(s["공급호수"], 10) || 0),
    0
  );
  const roomCounts = [...new Set(matchedHousingTypes.map((h) => h["방수"]).filter(Boolean))];

  const projectHousehold = parseInt(matchedProject?.["수용세대"], 10);
  const householdCount = Number.isFinite(projectHousehold) && projectHousehold > 0
    ? projectHousehold
    : (householdFromSupply > 0 ? householdFromSupply : null);

  if (DEBUG_HOUSEHOLD_COUNT && householdCount === null) {
    console.warn(
      `[디버그] GH 세대수 확인 불가 공고번호=${notice["공고번호"]} 공고명="${notice["공고명"]}" ` +
        `사업코드=${bizCode ?? "없음"} matchedSupplies개수=${matchedSupplies.length} ` +
        `matchedProject=${matchedProject ? "찾음" : "못찾음"}`
    );
  }

  return {
    id: `gh-${notice["공고번호"]}`,
    source_agency: "GH",
    source_notice_id: String(notice["공고번호"] ?? ""),
    title: notice["공고명"],
    notice_type: null,
    region_sido: pick(matchedProject?.["공사위치"]),
    region_sigungu: null,
    address_detail: pick(matchedProject?.["공사위치"], notice["접수처주소"]),
    household_count: householdCount,
    area_range: areaList.length ? areaList.join(", ") : null,
    room_count_range: roomCounts.length ? roomCounts.join("~") + "룸" : null,
    supply_kind: null,
    deposit_range: null,
    monthly_rent_range: null,
    price_range: null,
    apply_start_date: pick(notice["접수시작일자"], notice["서류접수시작일자"]),
    apply_end_date: pick(notice["접수종료일자"], notice["서류접수종료일자"]),
    announce_date: pick(notice["게시일자"], notice["공고일자"]),
    winner_date: pick(notice["당첨자발표일자"]),
    move_in_date: pick(notice["입주예정연월"]),
    contact_phone: pick(notice["접수처전화번호"]),
    contact_address: pick(notice["접수처주소"]),
    contact_note: pick(notice["접수처안내사항"]),
    etc_note: pick(notice["유의사항"], notice["기타사항"]),
    status: null,
    special_supply_tags: [],
    detail_url: pick(matchedProject?.["웹페이지주소"], notice["지도링크URL"]),
    attachment_urls: [],
    image_urls: [],
    unit_types: matchedSupplies.map((s) => ({
      area: s["전용면적내용"],
      household_count: s["공급호수"],
      move_in: s["입주예정년월"],
    })),
    fetched_at: new Date().toISOString(),
    data_source_type: "file",
  };
}

module.exports = { fetchGhAll, normalizeGhNotice };
