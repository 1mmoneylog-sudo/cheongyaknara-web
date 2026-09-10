import json
import os
from google import genai
from google.genai import types
from attachment_parser import download_and_extract, AttachmentError

NOTICES_FILE = "data/notices.json"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

PROMPT_SCHEMA = """
너는 대한민국 부동산 청약 모집공고 분석 전문가이다.
전달받은 청약 공고문 텍스트를 분석하여 아래 5가지 핵심 항목 기준의 Pure JSON 형식으로만 응답해라.
공고문에 명시되지 않은 항목은 null 또는 "정보 없음"으로 처리해라.

응답 JSON 구조:
{
  "price_and_finance": {
    "max_price": "전용면적별/타입별 최고 분양가",
    "payment_schedule": "계약금, 중도금, 잔금 비율 및 납부 일정",
    "financing_conditions": "중도금 대출 무이자/후불제 여부 및 대출 알선 가능 여부"
  },
  "qualification_and_conditions": {
    "residence_requirement": "거주 요건(당해/기타지역 접수 가능 여부)",
    "home_ownership": "무주택자/유주택자 신청 가능 여부",
    "savings_account": "청약통장 가입 기간 및 예치금 기준",
    "restrictions": "재당첨 제한, 전매제한, 실거주 의무 기간"
  },
  "supply_and_selection": {
    "supply_types": "특별공급 세대수 vs 일반공급 세대수",
    "selection_method": "가점제 및 추첨제 적용 비율(%)"
  },
  "location_and_complex": {
    "location_info": "교통(역세권), 학군, 편의시설 등 입지 요약",
    "move_in_date": "입주 예정 시기(YYYY.MM)"
  },
  "layout_and_structure": {
    "layout_types": "타입별 구조(판상형/타워형, 방 개수, 채광 등)",
    "complex_features": "동·호수 배치 특징 및 향(남향 위주 여부)"
  }
}
"""


def analyze_with_gemini(client: genai.Client, text: str) -> dict:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[PROMPT_SCHEMA, f"--- 공고문 텍스트 시작 ---\n{text[:30000]}"],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        ),
    )
    return json.loads(response.text)


def process_notices():
    if not os.path.exists(NOTICES_FILE):
        print(f"[{NOTICES_FILE}] 파일이 존재하지 않습니다.")
        return

    if not GEMINI_API_KEY:
        print("GEMINI_API_KEY가 설정되지 않았습니다.")
        return

    client = genai.Client(api_key=GEMINI_API_KEY)

    with open(NOTICES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 데이터 구조 자동 호환 ({ "notices": [...] } 또는 [...])
    if isinstance(data, dict) and "notices" in data:
        notices = data["notices"]
        is_dict_wrapper = True
    elif isinstance(data, list):
        notices = data
        is_dict_wrapper = False
    else:
        print("올바르지 않은 JSON 데이터 구조입니다.")
        return

    updated = False
    for notice in notices:
        if not isinstance(notice, dict):
            continue

        if notice.get("ai_analysis"):
            continue

        notice_id = notice.get("id") or notice.get("notice_id") or "notice_tmp"
        file_url = notice.get("attachment_url") or notice.get("file_url")

        extracted_text = notice.get("body_text", "")

        if file_url:
            print(f"[{notice_id}] 첨부파일 파싱 시작: {file_url}")
            try:
                extracted_text = download_and_extract(file_url, notice_id)
            except AttachmentError as e:
                print(f"[{notice_id}] 첨부파일 처리 실패: {e}")

        if not extracted_text or not str(extracted_text).strip():
            print(f"[{notice_id}] 분석할 텍스트가 없어 건너뜁니다.")
            continue

        print(f"[{notice_id}] Gemini AI 구조화 분석 시작...")
        try:
            ai_result = analyze_with_gemini(client, str(extracted_text))
            notice["ai_analysis"] = ai_result
            updated = True
            print(f"[{notice_id}] AI 분석 완료")
        except Exception as e:
            print(f"[{notice_id}] AI 분석 실패: {e}")

    if updated:
        save_data = {"notices": notices} if is_dict_wrapper else notices
        with open(NOTICES_FILE, "w", encoding="utf-8") as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        print("data/notices.json에 AI 분석 결과 저장 완료")


if __name__ == "__main__":
    process_notices()
