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
//
// ✅ 2026-09-09 수정: 지수 백오프(Exponential Backoff) 기반 자동 재시도(Retry) 및 타임아웃 추가
//   - 목적: LH API 순간 과부하, 타임아웃, 일시적 HTML 에러 시 즉시 실패하지 않고 재시도하여 수집 성공률 극대화

const LH_LIST_URL =
  "https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1";
const LH_DETAIL_URL =
  "https://apis.data.go.kr/B552555/lhLeaseNoticeDtlInfo1/getLeaseNoticeDtlInfo1";
const LH_SUPPLY_URL =
  "https://apis.data.go.kr/B552555/lhLeaseNoticeSplInfo1/getLeaseNoticeSplInfo1";

// 청약나라에서 다룰 공고유형만 필터링 (01=토지, 22=상가 는 제외)
const RELEVANT_UPP_AIS_TP_CD = ["05", "06", "13", "39"]; // 분양주택/임대주택/주거복지/신혼희망타운

// 세대수 디버깅용 로그를 켜고 싶으면 true로 바꾸세요.
const DEBUG_HOUSEHOLD_COUNT = true;

/** 대기 시간을 비동기로 지연시키는 헬퍼 함수 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 공통 fetch 헬퍼: 타임아웃 설정, 자동 재시도(Exponential Backoff), HTML 에러 처리
 * @param {string} url - API URL
 * @param {URLSearchParams} params - 쿼리 파라미터
 * @param {string} label - 로그 식별용 라벨
 * @param {number} retries - 최대 재시도 횟수 (기본 3회)
 * @param {number} timeoutMs - 개별 요청 타임아웃 (기본 30초)
 */
async function fetchLhJson(url, params, label, retries = 3, timeoutMs = 30000) {
  let delay = 1000; // 첫 재시도 대기 시간: 1초

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${url}?${params.toString()}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      const text = await res.text();

      if (!res.ok) {
        throw new Error(`HTTP Status ${res.status}: ${text.slice(0, 200)}`);
      }

      // JSON 파싱 시도
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`JSON 파싱 실패 (응답이 HTML 또는 깨진 데이터일 가능성): ${text.slice(0, 200)}`);
      }
    } catch (error) {
      clearTimeout(timer);

      const isLastAttempt = attempt === retries;
      const isAbortError = error.name === "AbortError";
      const errorMsg = isAbortError ? `타임아웃 (${timeoutMs}ms 초과)` : error.message;

      if (isLastAttempt) {
        console.error(
          `[LH API 최종 실패] ${label} — ${retries}회 재시도 모두 실패. 사유: ${errorMsg}`
        );
        throw new Error(`${label} API 최종 실패: ${errorMsg}`);
      }

      // Jitter(랜덤 오차)를 약간 추가한 지수 백오프 대기 (1s -> 2s -> 4s ...)
      const jitter = Math.random() * 200;
      const currentDelay = delay + jitter;

      console.warn(
        `[LH API 재시도 경고] ${label} (${attempt}/${retries}회 시도 실패) — 사유: ${errorMsg}. ${Math.round(currentDelay)}ms 후 재시도합니다.`
      );

      await sleep(currentDelay);
      delay *= 2; // 다음 대기 시간 2배 증가
    }
  }
}

/**
 * LH 목록 API 호출 — 지정한 기간 내 공고 리스트를 가져옴
 * @param {string} serviceKey - 발급받은 인증키
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
    deposit_range: null,
    monthly_rent_range: null,
    price_range: null,
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
