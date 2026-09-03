// LH(한국토지주택공사) 공공데이터포털 API 연동
// 확인된 3개 API: 목록(list) → 상세정보(detail) → 공급정보(supply)
// 실제 호출 테스트로 검증된 필드 기준으로 작성 (2026-08-28)

const LH_LIST_URL =
  "https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1";
const LH_DETAIL_URL =
  "https://apis.data.go.kr/B552555/lhLeaseNoticeDtlInfo1/getLeaseNoticeDtlInfo1";
const LH_SUPPLY_URL =
  "https://apis.data.go.kr/B552555/lhLeaseNoticeSplInfo1/getLeaseNoticeSplInfo1";

// 청약나라에서 다룰 공고유형만 필터링 (01=토지, 22=상가 는 제외)
const RELEVANT_UPP_AIS_TP_CD = ["05", "06", "13", "39"]; // 분양주택/임대주택/주거복지/신혼희망타운

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
  const res = await fetch(`${LH_LIST_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`LH 목록 API 오류: ${res.status}`);
  const json = await res.json();
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
  const res = await fetch(`${LH_DETAIL_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`LH 상세정보 API 오류: ${res.status}`);
  const json = await res.json();
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
  const res = await fetch(`${LH_SUPPLY_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`LH 공급정보 API 오류: ${res.status}`);
  const json = await res.json();
  return json?.[1]?.dsList01 ?? [];
}

/** 공통 스키마로 정규화 */
function normalizeLhNotice(listItem, detail, supplyRows) {
  const sbd = detail?.sbd ?? {};
  const schedule = detail?.schedule ?? {};
  const contact = detail?.contact ?? {};

  const totalHousehold =
    sbd.HSH_CNT ??
    (supplyRows.length
      ? supplyRows.reduce((sum, r) => sum + (parseInt(r.HSH_CNT, 10) || 0), 0)
      : null);

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
