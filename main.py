import os
import json
from google import genai
from google.genai import types

# 1. Gemini 클라이언트 생성 (Secrets에 등록한 GEMINI_API_KEY 자동 사용)
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def analyze_notice_with_gemini(notice_text_or_pdf_path):
    if not notice_text_or_pdf_path:
        return None

    prompt = """
    당신은 대한민국 부동산 청약 및 임대주택 공고문 분석 전문가입니다.
    제공된 공고문 내용을 읽고 분석하여, 반드시 아래의 JSON 포맷으로만 응답하세요.
    Markdown 형태(```json ...)나 추가 텍스트 없이 순수 JSON 구조만 출력해야 합니다.

    {
      "price_and_finance": {
        "max_price": "최고 분양가 또는 보증금/월세 조건",
        "payment_schedule": "계약금, 중도금, 잔금 납부 일정",
        "financing_conditions": "대출 관련 조건 및 안내사항"
      },
      "qualification_and_conditions": {
        "residence_requirement": "거주지 요건 (예: 서울시 연속 1년 이상 등)",
        "home_ownership": "주택 소유 여부 요건 (무주택 세대구성원 등)",
        "restrictions": "전매제한, 재당첨제한, 의무거주기간 등"
      },
      "supply_and_selection": {
        "supply_types": "공급 유형 (일반공급, 우선공급, 특별공급 등)",
        "selection_method": "당첨자 선정 방식 (가점제, 추첨제, 순위별 등)"
      },
      "location_and_complex": {
        "location_info": "입지 특징 및 주변 인프라 요약",
        "move_in_date": "입주 예정 시기"
      }
    }
    """

    try:
        # gemini-2.5-flash 모델 사용 (공고문 빠르게 분석)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, notice_text_or_pdf_path],
            config=types.GenerateContentConfig(
                response_mime_type="application/json" # JSON 응답 강제 설정
            )
        )

        # JSON 파싱
        ai_result = json.loads(response.text)
        return ai_result

    except Exception as e:
        print(f"❌ Gemini 분석 실패: {e}")
        return None
