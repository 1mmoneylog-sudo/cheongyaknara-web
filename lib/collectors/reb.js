// 한국부동산원 '청약홈' API 연동 (odcloud 방식)
// 승인된 "청약홈 분양정보 조회 서비스"는 성격별로 5개 API로 나뉘어 있음:
//   - APT 분양 (getAPTLttotPblancDetail)
//   - 오피스텔/도시형/민간임대 (getUrbtyOfctlLttotPblancDetail) ← 임대
//   - 무순위/잔여세대 (getRemndrLttotPblancDetail)
//   - 공공지원 민간임대 (getPblPvtRentLttotPblancDetail) ← 임대
//   - 임의공급 (getOPTLttotPblancDetail)
//
// ✅ 2026-09-03: 세대수 보완용으로만 쓰던 걸 확장해서, 청약홈 공고 자체를
// 청약나라 목록에 "청약홈" 소스로 추가함 (분양 + 임대 전부 포함)
//
// ⚠️ 5개 API가 서로 필드명이 다를 수 있다는 보고가 있어(응답 스키마가
// 완전히 동일하지 않음), 각 유형의 첫 행 필드를 한 번 로그로 찍어서
// 확인할 수 있게 해뒀다. 필드가 다르게 나오면 normalizeRebNotice에서
// 해당 유형만 별도로 매핑을 조정하면 됨.

const REB_ENDPOINTS = [
  {
    key: "apt",
    label: "APT 분양",
    supply_kind: "분양",
    url: "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail",
  },
  {
    key: "urbty",
    label: "오피스텔·도시형·민간임대",
    supply_kind: "임대",
    url: "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getUrbtyOfctlLttotPblancDetail",
  },
  {
    key: "remndr",
    label: "무순위·잔여세대",
    supply_kind: "무순위",
    url: "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getRemndrLttotPblancDetail",
  },
  {
    key: "pblPvtRent",
    label: "공공지원 민간임대",
    supply_kind: "임대",
    url: "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getPblPvtRentLttotPblancDetail",
  },
  {
    key: "opt",
    label: "임의공급",
    supply_kind: "임의공급",
    url: "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getOPTLttotPblancDetail",
  },
];

const DEBUG_FIELD_NAMES = true; // 원인 파악 끝나면 false로 바꿔도 됨

async function fetchRebJson(url, serviceKey, page = 1, perPage = 1000) {
  const params = new URLSearchParams({ serviceKey, page: String(page), perPage: String(perPage) });
  const res = await fetch(`${url}?${params.toString()}`);
  if (!res.ok) throw new Error(`청약홈 API 오류(${url}): ${res.status}`);
  return res.json();
}

/** 특정 청약홈 하위 API의 전체 페이지를 순회해서 다 가져옴 (최대 20페이지 안전장치) */
async function fetchRebEndpointAll(endpoint, serviceKey) {
  const perPage = 1000;
  const first = await fetchRebJson(endpoint.url, serviceKey, 1, perPage);
  let rows = first?.data ?? [];
  const totalCount = first?.totalCount ?? rows.length;
  const totalPages = Math.min(Math.ceil(totalCount / perPage), 20);

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchRebJson(endpoint.url, serviceKey, page, perPage);
    rows = rows.concat(next?.data ?? []);
  }

  if (DEBUG_FIELD_NAMES && rows.length > 0) {
    console.log(`[필드명 확인] 청약홈 ${endpoint.label} 필드들:`, Object.keys(rows[0]));
  }

  return rows;
}

/** 5개 청약홈 API를 전부 가져와 { endpoint, rows } 형태의 배열로 반환 */
async function fetchRebAll(serviceKey) {
  const results = [];
  for (const endpoint of REB_ENDPOINTS) {
    try {
      const rows = await fetchRebEndpointAll(endpoint, serviceKey);
      console.log(`청약홈 ${endpoint.label}: ${rows.length}건`);
      results.push({ endpoint, rows });
    } catch (err) {
      console.error(`청약홈 ${endpoint.label} 수집 실패:`, err.message);
      results.push({ endpoint, rows: [] });
    }
  }
  return results;
}

/** 청약홈 원본 필드를 보고 이 공고가 어떤 접수 유형(특별공급/1순위/2순위/무순위/임의공급)을
 *  가지고 있는지 태그로 뽑아낸다. 순위별 접수 일정이 실제로 존재하는 필드만 태그로 남긴다. */
function buildSupplyRankTags(row, endpoint) {
  const tags = [];

  // 특별공급: 대부분의 유형에 공통으로 존재하는 SPSPLY_RCEPT_* 로 판단
  if (row.SPSPLY_RCEPT_BGNDE || row.SPSPLY_RCEPT_ENDDE) {
    tags.push("특별공급");
  }

  // 1순위: 해당지역/기타지역/경기 중 하나라도 접수일이 있으면 인정
  if (
    row.GNRL_RNK1_CRSPAREA_RCPTDE ||
    row.GNRL_RNK1_ETC_AREA_RCPTDE ||
    row.GNRL_RNK1_ETC_GG_RCPTDE
  ) {
    tags.push("1순위");
  }

  // 2순위
  if (
    row.GNRL_RNK2_CRSPAREA_RCPTDE ||
    row.GNRL_RNK2_ETC_AREA_RCPTDE ||
    row.GNRL_RNK2_ETC_GG_RCPTDE
  ) {
    tags.push("2순위");
  }

  // 무순위: "무순위·잔여세대" 유형 자체이거나, 순위 구분 없는 일반접수(GNRL_RCEPT_*)만 있는 경우
  if (endpoint.key === "remndr" || row.GNRL_RCEPT_BGNDE || row.GNRL_RCEPT_ENDDE) {
    tags.push("무순위");
  }

  // ⚠️ "임의공급" 유형(endpoint.key === "opt")은 이미 notice_type 배지로 노출되고 있어서
  // 여기서 또 추가하면 카드에 "임의공급"이 두 번 찍힘 (2026-09-03 발견, 제거함)

  return tags;
}

/** 공통 스키마로 정규화. 필드명은 APT 유형에서 확인된 이름을 기준으로 하되,
 *  다른 유형에서 이름이 다를 경우를 대비해 값이 없으면 null로 남긴다. */
function normalizeRebNotice(row, endpoint, index) {
  const householdCount = parseInt(row.TOT_SUPLY_HSHLDCO, 10);

  return {
    id: `reb-${endpoint.key}-${row.PBLANC_NO ?? index}`,
    source_agency: "청약홈", // 프론트엔드 필터 탭 라벨과 동일한 문자열로 맞춤 (2026-09-03 수정: REB→청약홈)
    source_notice_id: String(row.PBLANC_NO ?? ""),
    title: row.HOUSE_NM ?? null,
    notice_type: endpoint.label,
    region_sido: row.SUBSCRPT_AREA_CODE_NM ?? null,
    region_sigungu: null,
    address_detail: row.HSSPLY_ADRES ?? null,
    household_count: Number.isFinite(householdCount) && householdCount > 0 ? householdCount : null,
    area_range: null,
    supply_kind: endpoint.supply_kind,
    deposit_range: null,
    monthly_rent_range: null,
    price_range: null,
    // 2026-09-03 수정: APT 분양은 RCEPT_BGNDE/RCEPT_ENDDE를 쓰지만,
    // 나머지 4개 유형(오피스텔·도시형, 무순위·잔여세대, 공공지원 민간임대, 임의공급)은
    // SUBSCRPT_RCEPT_BGNDE/SUBSCRPT_RCEPT_ENDDE를 쓰는 걸 로그로 확인함.
    // 둘 다 없으면 GNRL_RCEPT_*(무순위의 일반접수)까지 순서대로 확인.
    apply_start_date:
      row.RCEPT_BGNDE ?? row.SUBSCRPT_RCEPT_BGNDE ?? row.GNRL_RCEPT_BGNDE ?? null,
    apply_end_date:
      row.RCEPT_ENDDE ?? row.SUBSCRPT_RCEPT_ENDDE ?? row.GNRL_RCEPT_ENDDE ?? null,
    announce_date: row.RCRIT_PBLANC_DE ?? null,
    winner_date: row.PRZWNER_PRESNATN_DE ?? null,
    // 2026-09-03 추가: 입주예정, 연락처, 사업주체/시공사, 임대·주택유형 등
    // 원본에 있었는데 지금까지 안 옮기고 있던 정보를 채움 (상세페이지 정보 빈약 문제 대응)
    move_in_date: row.MVN_PREARNGE_YM ?? null,
    contact_phone: row.MDHS_TELNO ?? null,
    contact_address: row.HSSPLY_ADRES ?? null,
    contact_note:
      [row.BSNS_MBY_NM && `사업주체: ${row.BSNS_MBY_NM}`, row.CNSTRCT_ENTRPS_NM && `시공사: ${row.CNSTRCT_ENTRPS_NM}`]
        .filter(Boolean)
        .join(" · ") || null,
    etc_note:
      [row.RENT_SECD_NM, row.HOUSE_SECD_NM, row.HOUSE_DTL_SECD_NM].filter(Boolean).join(" · ") || null,
    status: null,
    // 2026-09-03 추가: 특별공급/1순위/2순위/무순위/임의공급 태그
    special_supply_tags: buildSupplyRankTags(row, endpoint),
    // 원문 공고 URL(PBLANC_URL)이 있으면 그걸 우선 쓰고, 없으면 사업 홈페이지(HMPG_ADRES)로 대체
    detail_url: row.PBLANC_URL ?? row.HMPG_ADRES ?? null,
    attachment_urls: [],
    image_urls: [],
    unit_types: [],
    fetched_at: new Date().toISOString(),
    data_source_type: "api",
  };
}

/** fetchRebAll() 결과를 전부 정규화해서 하나의 배열로 합친다 */
function normalizeAllRebNotices(rebResults) {
  const notices = [];
  for (const { endpoint, rows } of rebResults) {
    rows.forEach((row, i) => {
      notices.push(normalizeRebNotice(row, endpoint, i));
    });
  }
  return notices;
}

/** 공고명을 비교하기 쉽게 정리한다 (괄호, 공백, 특수문자 제거) — GH 세대수 보완용 */
function normalizeTitle(str) {
  if (!str) return "";
  return String(str)
    .replace(/[[\]()「」『』【】]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/** GH 등 다른 소스에서 세대수가 비어있는 공고를, 청약홈 데이터로 보완한다 */
function fillHouseholdCountFromReb(notices, rebResults) {
  const rebByTitle = new Map();
  for (const { rows } of rebResults) {
    for (const row of rows) {
      const key = normalizeTitle(row.HOUSE_NM);
      if (!key) continue;
      const count = parseInt(row.TOT_SUPLY_HSHLDCO, 10);
      if (Number.isFinite(count) && count > 0) {
        rebByTitle.set(key, count);
      }
    }
  }

  let filledCount = 0;
  for (const notice of notices) {
    if (notice.household_count) continue;
    const key = normalizeTitle(notice.title);
    let match = rebByTitle.get(key);
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
      notice.household_count_source = "reb";
      filledCount++;
    }
  }
  console.log(`청약홈으로 세대수 보완: ${filledCount}건`);
  return notices;
}

module.exports = {
  fetchRebAll,
  normalizeAllRebNotices,
  fillHouseholdCountFromReb,
};
