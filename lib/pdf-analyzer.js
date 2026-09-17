// PDF 공고문을 다운로드해서 텍스트를 추출하고, Gemini API로
// 보증금/월세/자격요건 같은 정보를 구조화된 JSON으로 뽑아낸다.
//
// 필요한 환경변수: GEMINI_API_KEY (GitHub Actions Secrets에 등록해야 함)
// 필요한 패키지: pdf-parse (package.json에 추가 필요)

const pdfParse = require("pdf-parse");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash"; // 빠르고 무료 한도가 넉넉한 모델
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

const EXTRACTION_PROMPT = `다음은 한국 공공주택 입주자 모집공고문의 내용입니다.
아래 항목들을 찾아서 반드시 순수 JSON 형식으로만 답하세요 (설명 문장이나 마크다운 코드블록 없이, JSON 객체만).
찾을 수 없는 항목은 null로 두세요. 절대로 내용을 지어내지 마세요 — 공고문에 없는 정보는 null입니다.

{
  "deposit_range": "임대보증금 범위 (예: '5,000만원~1억2,000만원'), 없으면 null",
  "monthly_rent_range": "월임대료 범위 (예: '15만원~30만원'), 없으면 null",
  "eligibility_summary": "신청자격 핵심 요약 — 소득기준, 자산기준, 무주택 요건 등을 한두 문장으로",
  "area_range": "전용면적 범위 (예: '26㎡~46㎡')",
  "special_notes": "신청 시 특히 주의할 점 (중복신청 불가, 서류 유의사항 등, 없으면 null)"
}

공고문 내용:
`;

async function analyzeWithGemini(pdfText) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY가 설정되어 있지 않습니다.");

  // 비용/속도 절약을 위해 앞부분만 사용 (자격요건·보증금 등은 보통 앞쪽에 나옴)
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
