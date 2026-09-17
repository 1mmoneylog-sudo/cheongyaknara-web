// PDF 공고문을 다운로드해서 텍스트를 추출하고, Gemini API로
// 가격/자격요건/공급방식/입지 정보를 구조화된 JSON으로 뽑아낸다.
//
// ⚠️ 이 파일이 만드는 JSON 모양은 예전 main.py(파이썬)가 만들려던 모양과
// 똑같이 맞춰뒀다 (price_and_finance / qualification_and_conditions /
// supply_and_selection / location_and_complex) — 프론트엔드 상세페이지가
// 이미 이 모양을 기대하고 있을 가능성이 높기 때문.
//
// 필요한 환경변수: GEMINI_API_KEY (GitHub Actions Secrets에 이미 등록됨)
// 필요한 패키지: pdf-parse (package.json에 이미 추가됨)

const pdfParse = require("pdf-parse");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash"; // main.py와 동일한 모델로 통일
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function downloadPdfText(pdfUrl) {
  const res = await fetch(pdfUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`PDF 다운로드 실패: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const data = await pdfParse(buffer);
  return data.text;
}

// main.py에 있던 프롬프트를 그대로 가져옴 (JSON 모양 통일용)
const EXTRACTION_PROMPT = `
당신은 대한민국 부동산 청약 및 임대주택 공고문 분석 전문가입니다.
제공된 공고문 내용을 읽고 분석하여, 반드시 아래의 JSON 포맷으로만 응답하세요.
Markdown 형태(\`\`\`json ...)나 추가 텍스트 없이 순수 JSON 구조만 출력해야 합니다.
공고문에 없는 내용은 지어내지 말고 null로 두세요.

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

공고문 내용:
`;

async function analyzeWithGemini(pdfText) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY가 설정되어 있지 않습니다.");

  // 비용/속도 절약을 위해 앞부분만 사용 (자격요건·가격 등은 보통 앞쪽에 나옴)
  const trimmedText = pdfText.slice(0, 15000);

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: EXTRACTION_PROMPT + trimmedText }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API 오류 ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini 응답에서 텍스트를 찾을 수 없습니다.");

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Gemini 응답이 JSON 형식이 아닙니다: " + text.slice(0, 200));
  }
}

/** 공고 하나에 붙은 PDF 공고문을 찾아서 분석하고, ai_analysis 필드에 넣을 객체를 반환한다.
 *  PDF가 없거나 텍스트 추출이 안 되면(스캔 이미지 PDF 등) null 반환. */
async function analyzeNoticePdf(notice) {
  const pdfAttachment = (notice.attachment_urls || []).find(
    (a) =>
      a.url &&
      (a.url.toLowerCase().includes(".pdf") ||
        a.label?.includes("PDF") ||
        a.label?.includes("공고문") ||
        a.name?.toLowerCase().includes(".pdf"))
  );
  if (!pdfAttachment) return null;

  const pdfText = await downloadPdfText(pdfAttachment.url);
  if (!pdfText || pdfText.trim().length < 50) {
    throw new Error("PDF에서 텍스트를 거의 추출하지 못했습니다 (스캔 이미지 PDF일 가능성)");
  }

  const analysis = await analyzeWithGemini(pdfText);
  return {
    ...analysis,
    analyzed_at: new Date().toISOString(),
    source_pdf: pdfAttachment.url,
  };
}

module.exports = { analyzeNoticePdf };
