// LH(한국토지주택공사) 공공데이터포털 API 연동
// 확인된 3개 API: 목록(list) → 상세정보(detail) → 공급정보(supply)
// 실제 호출 테스트로 검증된 필드 기준으로 작성 (2026-08-28)
//
// ✅ 2026-09-02 수정: 세대수(household_count)가 0으로 표시되던 버그 수정
//   - 문제: 공급정보(supplyRows) 합계가 0일 때도 "값 있음"으로 취급되어
//     0이 그대로 화면에 노출됨
//   - 수정: 합계가 0이면 "데이터 없음(null)"으로 처리하도록 변경
//   - 추가: 실제 API 응답 필드를 확인할 수 있도록 콘솔 로그 추가
//
// ✅ 2026-09-04 수정: LH API가 가끔 JSON 대신 HTML 에러 페이지("<!DOCTYPE ...")를
// 돌려주는 경우가 있어, 그럴 때 원인 파악 없이 그냥 죽어버리는 문제가 있었음.
// 응답 본문을 먼저 텍스트로 받은 뒤 JSON 파싱을 시도하고, 실패하면 응답 앞부분을
// 로그로 남기도록 fetchLhJson() 공통 헬퍼를 추가함.

const LH_LIST_URL =
  "https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1";
const LH_DETAIL_URL =
  "https://apis.data.go.kr/B552555/lhLeaseNoticeDtlInfo1/getLeaseNoticeDtlInfo1";
const LH_SUPPLY_URL =
  "https://apis.data.go.kr/B552555/lhLeaseNoticeSplInfo1/getLeaseNoticeSplInfo1";

// 청약나라에서 다룰 공고유형만 필터링 (01=토지, 22=상가 는 제외)
const RELEVANT_UPP_AIS_TP_CD = ["05", "06", "13", "39"]; // 분양주택/임대주택/주거복지/신혼희망타운

// 세대수 디버깅용 로그를 켜고 싶으면 true로 바꾸세요.
// (문제 원인을 확인한 뒤에는 다시 false로 돌려서 로그를 줄이는 걸 추천합니다)
const DEBUG_HOUSEHOLD_COUNT = true;

/** 공통 fetch 헬퍼: 응답을 먼저 텍스트로 받고 JSON 파싱을 시도한다.
 *  LH API가 가끔 HTML 에러 페이지(점검 안내, 인증키 오류 등)를 돌려줄 때가 있는데,
 *  그럴 경우 파싱 에러 메시지만으로는 원인을 알 수 없으므로 응답 앞부분을 로그로 남긴다. */
async function fetchLhJson(url, params, label) {
  const res = await fetch(`${url}?${params.toString()}`);
  const text = await res.text();

  if (!res.ok) {
    console.error(`[LH API 오류] ${label} — HTTP ${res.status}. 응답 앞부분:`, text.slice(0, 500));
    throw new Error(`${label} API 오류: ${res.status}`);
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`[LH API 오류] ${label} — JSON 파싱 실패. 응답 앞부분:`, text.slice(0, 500));
    throw new Error(`${label} API가 JSON이 아닌 응답을 반환함`);
  }
}

/**
 * LH 목록 API 호출 — 지정한 기간 내 공고 리스트를 가져옴
 * @param {string} serviceKey - 발급받은 인증키(디코딩된 값을 넣으면 fetch가 알아서 인코딩함)
 * @param {string} startDate - YYYY.MM.DD
 * @param {string} endDate - YYYY.MM.DD
 */
async function fetchLhList(serviceKey, startDate, endDate, page = 1, pageSize = 100) {
  const params = new URLSearchParams({
    ServiceKey: serviceKey,
    PG_SZ: String(pageSize),
    PAGE: String(page),
    PAN_NT_ST_DT: startDate,
    CLSG_DT: endDate,
  });
  const json = await fetchLhJson(LH_LIST_URL, params, "LH 목록");
  const list = json?.[1]?.dsList ?? [];
  return list.filter((item) => RELEVANT_UPP_AIS_TP_CD.includes(item.UPP_AIS_TP_CD));
}

/**
 * LH 상세정보 API 호출 — 세대수·주소·일정·접수처·첨부파일·이미지
 */
async function fetchLhDetail(serviceKey, listItem) {
  const params = new URLSearchParams({
    serviceKey, // 소문자 s (상세정보 API는 소문자 파라미터명)
    SPL_INF_TP_CD: listItem.SPL_INF_TP_CD,
    CCR_CNNT_SYS_DS_CD: listItem.CCR_CNNT_SYS_DS_CD,
    PAN_ID: listItem.PAN_ID,
    UPP_AIS_TP_CD: listItem.UPP_AIS_TP_CD,
    AIS_TP_CD: listItem.AIS_TP_CD,
  });
  const json = await fetchLhJson(LH_DETAIL_URL, params, "LH 상세정보");
  const body = json?.[1] ?? {};
  return {
    sbd: body.dsSbd?.[0] ?? {},
    schedule: body.dsSplScdl?.[0] ?? {},
    contact: body.dsCtrtPlc?.[0] ?? {},
    etc: body.dsEtcInfo?.[0] ?? {},
    attachments: body.dsAhflInfo ?? [],
    images: body.dsSbdAhfl ?? [],
  };
}

/**
 * LH 공급정보 API 호출 — 주택형별 세대수·면적 breakdown
 */
async function fetchLhSupply(serviceKey, listItem) {
  const params = new URLSearchParams({
    ServiceKey: serviceKey, // 대문자 S (공급정보 API는 대문자 파라미터명)
    SPL_INF_TP_CD: listItem.SPL_INF_TP_CD,
    CCR_CNNT_SYS_DS_CD: listItem.CCR_CNNT_SYS_DS_CD,
    PAN_ID: listItem.PAN_ID,
    UPP_AIS_TP_CD: listItem.UPP_AIS_TP_CD,
    AIS_TP_CD: listItem.AIS_TP_CD,
  });
  const json = await fetchLhJson(LH_SUPPLY_URL, params, "LH 공급정보");
  const rows = json?.[1]?.dsList01 ?? [];

  if (DEBUG_HOUSEHOLD_COUNT && rows.length > 0) {
    console.log(
      `[디버그] LH 공급정보 PAN_ID=${listItem.PAN_ID} 첫 행 필드:`,
      JSON.stringify(rows[0])
    );
  }

  return rows;
}

/** 공통 스키마로 정규화 */
function normalizeLhNotice(listItem, detail, supplyRows) {
  const sbd = detail?.sbd ?? {};
  const schedule = detail?.schedule ?? {};
  const contact = detail?.contact ?? {};

  // 상세정보(sbd.HSH_CNT)가 유효한 값이면 그걸 우선 사용.
  // 없으면 공급정보(supplyRows)를 합산 — 단, 합계가 0이면 "데이터 없음"으로 처리한다.
  // (이전 버전은 합계가 0이어도 "값이 있는 것"으로 취급해서 화면에 0이 그대로 노출되는 버그가 있었음)
  const sbdCount = parseInt(sbd.HSH_CNT, 10);
  const supplySum = supplyRows.reduce((sum, r) => sum + (parseInt(r.HSH_CNT, 10) || 0), 0);

  let totalHousehold = null;
  if (Number.isFinite(sbdCount) && sbdCount > 0) {
    totalHousehold = sbdCount;
  } else if (supplySum > 0) {
    totalHousehold = supplySum;
  }

  if (DEBUG_HOUSEHOLD_COUNT && totalHousehold === null) {
    console.warn(
      `[디버그] LH 세대수 확인 불가 PAN_ID=${listItem.PAN_ID} title="${listItem.PAN_NM}" ` +
        `sbd.HSH_CNT=${sbd.HSH_CNT} supplyRows개수=${supplyRows.length} supplySum=${supplySum}`
    );
  }

  return {
    id: `lh-${listItem.PAN_ID}`,
    source_agency: "LH",
    source_notice_id: listItem.PAN_ID,
    title: listItem.PAN_NM,
    notice_type: `${listItem.UPP_AIS_TP_NM ?? ""} · ${listItem.AIS_TP_CD_NM ?? ""}`.trim(),
    region_sido: listItem.CNP_CD_NM ?? null,
    region_sigungu: null,
    address_detail: sbd.LGDN_ADR
      ? `${sbd.LGDN_ADR} ${sbd.LGDN_DTL_ADR ?? ""}`.trim()
      : null,
    household_count: totalHousehold,
    area_range: sbd.DDO_AR ?? null,
    supply_kind: listItem.UPP_AIS_TP_CD === "05" ? "분양" : "임대",
    deposit_range: null, // API로 실수치 미제공 (공고문 참조)
    monthly_rent_range: null, // 위와 동일
    price_range: null, // 분양 공고 실제 확인 필요
    apply_start_date: schedule.SBSC_ACP_ST_DT ?? listItem.PAN_NT_ST_DT ?? null,
    apply_end_date: schedule.SBSC_ACP_CLSG_DT ?? listItem.CLSG_DT ?? null,
    announce_date: listItem.PAN_NT_ST_DT ?? null,
    winner_date: schedule.PZWR_ANC_DT ?? null,
    move_in_date: sbd.MVIN_XPC_YM ?? null,
    contact_phone: contact.SIL_OFC_TLNO ?? null,
    contact_address: contact.CTRT_PLC_ADR ?? null,
    contact_note: contact.SIL_OFC_GUD_FCTS ?? null,
    etc_note: detail?.etc?.ETC_CTS ?? null,
    status: listItem.PAN_SS ?? null,
    special_supply_tags: [],
    detail_url: listItem.DTL_URL ?? null,
    attachment_urls: (detail?.attachments ?? []).map((a) => ({
      url: a.AHFL_URL,
      label: a.SL_PAN_AHFL_DS_CD_NM,
      name: a.CMN_AHFL_NM,
    })),
    image_urls: (detail?.images ?? []).map((img) => ({
      url: img.AHFL_URL,
      label: img.LS_SPL_INF_UPL_FL_DS_CD_NM,
    })),
    unit_types: supplyRows.map((r) => ({
      type: r.HTY_NNA,
      household_count: r.HSH_CNT,
      area: r.DDO_AR,
      deposit_note: r.LS_GMY,
      rent_note: r.RFE,
    })),
    fetched_at: new Date().toISOString(),
    data_source_type: "api",
  };
}

module.exports = { fetchLhList, fetchLhDetail, fetchLhSupply, normalizeLhNotice };
