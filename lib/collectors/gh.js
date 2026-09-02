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

  return {
    id: `gh-${notice["공고번호"]}`,
    source_agency: "GH",
    source_notice_id: String(notice["공고번호"] ?? ""),
    title: notice["공고명"],
    notice_type: null,
    region_sido: matchedProject?.["공사위치"] ?? null,
    region_sigungu: null,
    address_detail: matchedProject?.["공사위치"] ?? notice["접수처주소"] ?? null,
    household_count: matchedProject?.["수용세대"] ?? (householdFromSupply || null),
    area_range: areaList.length ? areaList.join(", ") : null,
    room_count_range: roomCounts.length ? roomCounts.join("~") + "룸" : null,
    supply_kind: null,
    deposit_range: null,
    monthly_rent_range: null,
    price_range: null,
    apply_start_date: notice["접수시작일자"] ?? notice["서류접수시작일자"] ?? null,
    apply_end_date: notice["접수종료일자"] ?? notice["서류접수종료일자"] ?? null,
    announce_date: notice["게시일자"] ?? notice["공고일자"] ?? null,
    winner_date: notice["당첨자발표일자"] ?? null,
    move_in_date: notice["입주예정연월"] ?? null,
    contact_phone: notice["접수처전화번호"] ?? null,
    contact_address: notice["접수처주소"] ?? null,
    contact_note: notice["접수처안내사항"] ?? null,
    etc_note: notice["유의사항"] ?? notice["기타사항"] ?? null,
    status: null,
    special_supply_tags: [],
    detail_url: matchedProject?.["웹페이지주소"] ?? notice["지도링크URL"] ?? null,
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
