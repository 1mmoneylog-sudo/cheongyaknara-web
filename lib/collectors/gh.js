// GH(경기주택도시공사) 공공데이터포털 API 연동
// odcloud 자동변환 방식 — 인증키는 쿼리 파라미터 "serviceKey"로 전달

const GH_NOTICE_URL =
  "https://api.odcloud.kr/api/15119414/v1/uddi:d22eef31-f232-464a-9547-dbff71668860";
const GH_SUPPLY_URL =
  "https://api.odcloud.kr/api/15119391/v1/uddi:bf1ffc81-75a7-45c2-9136-d0ad5b88b90c";
const GH_HOUSING_TYPE_URL =
  "https://api.odcloud.kr/api/15119422/v1/uddi:065d05e1-efbd-47c1-9e2f-9ebe1fd33e0b";
const GH_PROJECT_STATUS_URL =
  "https://api.odcloud.kr/api/15016337/v1/uddi:e7f2c4ef-0bbe-4118-935c-d23c1204837f";

const DEBUG_HOUSEHOLD_COUNT = true;

/** 값이 null/undefined/빈 문자열이면 다음 후보로 넘어감 */
function pick(...values) {
  for (const v of values) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return null;
}

/** 8자리 숫자(YYYYMMDD) 또는 다양한 날짜 형식을 표준 YYYY-MM-DD 형태로 변환 */
function formatDate(val) {
  if (!val) return null;
  const str = String(val).replace(/[^0-9]/g, "");
  if (str.length === 8) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }
  return String(val);
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
    // ✅ 날짜 포맷 정규화(YYYY-MM-DD 적용)
    apply_start_date: formatDate(pick(notice["접수시작일자"], notice["서류접수시작일자"])),
    apply_end_date: formatDate(pick(notice["접수종료일자"], notice["서류접수종료일자"])),
    announce_date: formatDate(pick(notice["게시일자"], notice["공고일자"])),
    winner_date: formatDate(pick(notice["당첨자발표일자"])),
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
