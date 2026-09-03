// 한국부동산원 청약홈 분양정보 조회 서비스 연동
// odcloud 방식 (serviceKey, page, perPage) — GH와 동일한 호출 패턴
//
// 원래 5개 세부 API로 나뉘어 있음: APT / 오피스텔·도시형·민간임대·생활숙박시설 /
// APT 무순위·잔여세대 / 공공지원 민간임대 / 임의공급
// 이 중 APT가 "민간사전청약 및 신혼희망타운 포함"이라 가장 핵심적이라 우선 연동.
// (실제 사용 사례 블로그 기준 엔드포인트 확인 — 2026-09-01)

const CH_APT_URL = "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail";

async function fetchChJson(url, serviceKey, page, perPage) {
  const params = new URLSearchParams({ serviceKey, page: String(page), perPage: String(perPage) });
  const res = await fetch(`${url}?${params.toString()}`);
  if (!res.ok) throw new Error(`청약홈 API 오류(${url}): ${res.status}`);
  return res.json();
}

async function fetchChJsonAll(url, serviceKey) {
  const perPage = 500;
  const first = await fetchChJson(url, serviceKey, 1, perPage);
  let rows = first?.data ?? [];
  const totalCount = first?.totalCount ?? rows.length;
  const totalPages = Math.min(Math.ceil(totalCount / perPage), 20); // 안전장치: 최대 10,000건

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchChJson(url, serviceKey, page, perPage);
    rows = rows.concat(next?.data ?? []);
  }
  return rows;
}

async function fetchCheongyakhomeAll(serviceKey) {
  const apt = await fetchChJsonAll(CH_APT_URL, serviceKey);
  return { apt };
}

function normalizeCheongyakhomeNotice(row) {
  return {
    id: `ch-${row.PBLANC_NO}`,
    source_agency: "청약홈",
    source_notice_id: String(row.PBLANC_NO ?? ""),
    title: row.HOUSE_NM,
    notice_type: row.HOUSE_SECD_NM ?? null, // 국민주택/민영주택
    region_sido: row.SUBSCRPT_AREA_CODE_NM ?? null,
    region_sigungu: null,
    address_detail: null,
    household_count: row.TOT_SUPLY_HSHLDCO ?? null,
    area_range: null,
    supply_kind: "분양",
    deposit_range: null,
    monthly_rent_range: null,
    price_range: null,
    apply_start_date: row.RCEPT_BGNDE ?? null,
    apply_end_date: row.RCEPT_ENDDE ?? null,
    announce_date: row.RCRIT_PBLANC_DE ?? null,
    winner_date: row.PRZWNER_PRESNATN_DE ?? null,
    move_in_date: null,
    contact_phone: null,
    contact_address: null,
    contact_note: null,
    etc_note: null,
    status: null,
    special_supply_tags: [],
    detail_url: row.HMPG_ADRES ?? "https://www.applyhome.co.kr/",
    attachment_urls: [],
    image_urls: [],
    unit_types: [],
    fetched_at: new Date().toISOString(),
    data_source_type: "api",
  };
}

module.exports = { fetchCheongyakhomeAll, normalizeCheongyakhomeNotice };
